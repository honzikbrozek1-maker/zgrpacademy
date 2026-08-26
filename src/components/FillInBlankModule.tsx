import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { playCorrectSound, playIncorrectSound } from '@/lib/sounds';
import { useT } from '@/lib/i18n';
import { blankSentence, splitBlank } from '@/lib/fillBlank';


interface Question {
  id: string;
  question_text: string;
  back_text: string | null;
  option_1: string | null;
  option_2: string | null;
  option_3: string | null;
  option_4: string | null;
}

interface Props {
  questions: Question[];
  levelId?: string;
  onComplete: () => void;
  onReviewItemsChange?: () => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FillInBlankModule({ questions, levelId, onComplete, onReviewItemsChange }: Props) {
  const { user } = useAuth();
  const t = useT();
  const storageKey = `practice:fillin:${levelId ?? 'default'}`;
  const [currentIndex, setCurrentIndex] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.index === 'number' && parsed.index < questions.length) return parsed.index;
      }
    } catch {}
    return 0;
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const [checking, setChecking] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ index: currentIndex })); } catch {}
  }, [currentIndex, storageKey]);

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const correctAnswerText = correctAnswerIndex
    ? [question?.option_1, question?.option_2, question?.option_3, question?.option_4][correctAnswerIndex - 1] || ''
    : '';

  // The blank can live either in back_text (manually created) or in question_text (AI generated)
  const sourceSentence = useMemo(
    () => blankSentence(question?.question_text, question?.back_text),
    [question]
  );

  const sentenceData = useMemo(() => {
    if (!showResult || !correctAnswerText) return null;
    const split = splitBlank(sourceSentence);
    if (split) return split;
    if (!question?.back_text) return null;
    const idx = question.back_text.toLowerCase().indexOf(correctAnswerText.toLowerCase());
    if (idx === -1) return { before: question.back_text, after: '' };
    return {
      before: question.back_text.substring(0, idx),
      after: question.back_text.substring(idx + correctAnswerText.length),
    };
  }, [question, sourceSentence, correctAnswerText, showResult]);

  const blankSentenceData = useMemo(() => {
    if (showResult) return null;
    return splitBlank(sourceSentence);
  }, [sourceSentence, showResult]);

  const displaySentence = showResult ? sentenceData : blankSentenceData;


  const options = useMemo(() => {
    const opts: { text: string; index: number }[] = [];
    if (question?.option_1) opts.push({ text: question.option_1, index: 1 });
    if (question?.option_2) opts.push({ text: question.option_2, index: 2 });
    if (question?.option_3) opts.push({ text: question.option_3, index: 3 });
    if (question?.option_4) opts.push({ text: question.option_4, index: 4 });
    return shuffleArray(opts);
  }, [question]);

  const handleSelect = async (optIndex: number) => {
    if (showResult || checking) return;
    setSelected(optIndex);
    setChecking(true);

    try {
      const { data } = await supabase.rpc('check_quiz_answer', {
        p_question_id: question.id,
        p_answer: optIndex,
      });

      const result = data as unknown as { correct: boolean; correct_answer?: number };
      const correct = result.correct;
      setCorrectAnswerIndex(correct ? optIndex : (result.correct_answer ?? null));
      setIsCorrect(correct);
      setShowResult(true);

      if (correct) {
        setCorrectCount(c => c + 1);
        setAnsweredCount(c => c + 1);
        playCorrectSound();
        if (user) {
          await supabase.from('review_items').delete().eq('user_id', user.id).eq('question_id', question.id);
          onReviewItemsChange?.();
        }
      } else {
        setAnsweredCount(c => c + 1);
        playIncorrectSound();
        if (user) {
          await supabase.from('review_items').upsert({
            user_id: user.id,
            question_id: question.id,
            confidence: 'unknown',
            source: 'fill_blank',
          }, { onConflict: 'user_id,question_id' });
          onReviewItemsChange?.();
        }
      }
    } finally {
      setChecking(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setShowResult(false);
      setIsCorrect(false);
      setCorrectAnswerIndex(null);
    } else {
      setFinished(true);
      try { localStorage.removeItem(storageKey); } catch {}
    }
  };

  const handleSkip = () => {
    if (showResult || checking) return;
    handleNext();
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setSelected(null);
      setShowResult(false);
      setIsCorrect(false);
      setCorrectAnswerIndex(null);
    }
  };

  const handleRestart = () => {
    try { localStorage.removeItem(storageKey); } catch {}
    setCurrentIndex(0);
    setSelected(null);
    setShowResult(false);
    setIsCorrect(false);
    setCorrectAnswerIndex(null);
  };

  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!showResult && /^[1-4]$/.test(e.key)) {
        const n = parseInt(e.key, 10);
        const opt = options[n - 1];
        if (opt) { e.preventDefault(); handleSelect(opt.index); }
      } else if ((e.key === 'Enter' || e.key === 'ArrowRight') && showResult) {
        e.preventDefault(); handleNext();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault(); handlePrev();
      } else if (!showResult && (e.key === 's' || e.key === 'S') && currentIndex < questions.length - 1) {
        e.preventDefault(); handleSkip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (finished) {
    return (
      <Card className="shadow-elevated">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h3 className="text-xl font-bold">{t('Doplňování dokončeno!')}</h3>
          <p className="text-muted-foreground">
            {t('Správně: {correct} z {total}', { correct: correctCount, total: questions.length })}
          </p>
          <Button onClick={onComplete} className="gradient-primary text-primary-foreground">
            {t('Pokračovat')} <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSeek = (ratio: number) => {
    if (checking) return;
    const target = Math.min(questions.length - 1, Math.max(0, Math.floor(ratio * questions.length)));
    if (target === currentIndex && !showResult) return;
    setCurrentIndex(target);
    setSelected(null);
    setShowResult(false);
    setIsCorrect(false);
    setCorrectAnswerIndex(null);
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground whitespace-nowrap">{t('Otázka {n}/{total}', { n: currentIndex + 1, total: questions.length })}</span>
        <div
          role="slider"
          aria-label={t('Přejít na otázku')}
          aria-valuemin={1}
          aria-valuemax={questions.length}
          aria-valuenow={currentIndex + 1}
          tabIndex={0}
          className="h-2 flex-1 min-w-[120px] rounded-full bg-secondary cursor-pointer relative group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            handleSeek((e.clientX - rect.left) / rect.width);
          }}
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-full ring-2 ring-primary/40" />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">{t('Zodpovězeno: {answered}/{total}', { answered: answeredCount, total: questions.length })}</span>
        {currentIndex > 0 && (
          <Button variant="ghost" size="sm" onClick={handleRestart} className="h-7 text-xs">
            {t('Začít znovu')}
          </Button>
        )}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 space-y-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('Vyberte správné slovo')}</p>

          {displaySentence ? (
            <div className="text-lg leading-relaxed">
              <span>{displaySentence.before}</span>
              <span className={`font-bold px-2 py-0.5 rounded ${
                showResult
                  ? isCorrect ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                  : 'bg-primary/10 text-primary'
              }`}>
                {showResult ? correctAnswerText : '______'}
              </span>
              <span>{displaySentence.after}</span>
            </div>
          ) : (
            <h3 className="text-lg font-semibold">{question.question_text}</h3>
          )}

          <div className="grid grid-cols-2 gap-3">
            {options.map((opt) => {
              const isThis = selected === opt.index;
              const isAnswer = correctAnswerIndex !== null && opt.index === correctAnswerIndex;
              let cls = 'border-2 rounded-xl p-3 min-h-[56px] text-center transition-all font-medium text-sm flex items-center justify-center ';
              if (!showResult) {
                cls += 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer';
              } else if (isAnswer) {
                cls += 'border-success bg-success/10 text-success';
              } else if (isThis && !isCorrect) {
                cls += 'border-destructive bg-destructive/10 text-destructive';
              } else {
                cls += 'border-border opacity-50';
              }
              return (
                <button key={opt.index} className={cls} onClick={() => handleSelect(opt.index)} disabled={showResult || checking}>
                  {opt.text}
                </button>
              );
            })}
          </div>

          {showResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${isCorrect ? 'bg-success/10' : 'bg-destructive/10'}`}>
              {isCorrect ? (
                <>
                  <CheckCircle className="h-5 w-5 text-success shrink-0" />
                  <span className="font-medium text-success">{t('Správně!')}</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive shrink-0" />
                  <span className="text-destructive">
                    {t('Správná odpověď:')} <span className="font-bold">{correctAnswerText}</span>
                  </span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2 flex-wrap">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {t('Předchozí')}
        </Button>
        <div className="flex gap-2">
          {!showResult && currentIndex < questions.length - 1 && (
            <Button variant="ghost" onClick={handleSkip}>
              {t('Přeskočit')} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {showResult && (
            <Button onClick={handleNext} className="gradient-primary text-primary-foreground">
              {currentIndex < questions.length - 1 ? t('Další') : t('Dokončit')} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
