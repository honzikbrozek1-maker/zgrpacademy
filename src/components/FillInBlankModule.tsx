import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { playCorrectSound, playIncorrectSound } from '@/lib/sounds';
import MilestoneDialog from '@/components/MilestoneDialog';
import { checkMilestone } from '@/lib/achievements';

interface Question {
  id: string;
  question_text: string;
  back_text: string | null;
  option_1: string | null;
  option_2: string | null;
  option_3: string | null;
  option_4: string | null;
  correct_answer: number | null;
}

interface Props {
  questions: Question[];
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

export default function FillInBlankModule({ questions, onComplete, onReviewItemsChange }: Props) {
  const { user, refreshProfile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [milestone, setMilestone] = useState<number | null>(null);

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const correctAnswerIndex = question?.correct_answer || 1;
  const correctAnswerText = [question?.option_1, question?.option_2, question?.option_3, question?.option_4][correctAnswerIndex - 1] || '';

  const sentenceData = useMemo(() => {
    if (!question?.back_text) return null;
    const blankIdx = question.back_text.indexOf('______');
    if (blankIdx === -1) {
      const word = correctAnswerText;
      if (!word) return null;
      const idx = question.back_text.toLowerCase().indexOf(word.toLowerCase());
      if (idx === -1) return { before: question.back_text, after: '' };
      return {
        before: question.back_text.substring(0, idx),
        after: question.back_text.substring(idx + word.length),
      };
    }
    return {
      before: question.back_text.substring(0, blankIdx),
      after: question.back_text.substring(blankIdx + 6),
    };
  }, [question, correctAnswerText]);

  const options = useMemo(() => {
    const opts: { text: string; index: number }[] = [];
    if (question?.option_1) opts.push({ text: question.option_1, index: 1 });
    if (question?.option_2) opts.push({ text: question.option_2, index: 2 });
    if (question?.option_3) opts.push({ text: question.option_3, index: 3 });
    if (question?.option_4) opts.push({ text: question.option_4, index: 4 });
    return shuffleArray(opts);
  }, [question]);

  const handleSelect = async (optIndex: number) => {
    if (showResult) return;
    setSelected(optIndex);
    const correct = optIndex === correctAnswerIndex;
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      setCorrectCount(c => c + 1);
      playCorrectSound();
      if (user) {
        const { data: result } = await supabase.rpc('award_points', { points: 10 });
        if (result) {
          const r = result as unknown as { old_points: number; new_points: number };
          const m = checkMilestone(r.old_points, r.new_points);
          if (m) setMilestone(m);
        }
        // Remove from review if previously failed
        await supabase.from('review_items').delete().eq('user_id', user.id).eq('question_id', question.id);
        onReviewItemsChange?.();
      }
    } else {
      playIncorrectSound();
      if (user) {
        const { error } = await supabase.from('review_items').upsert({
          user_id: user.id,
          question_id: question.id,
          confidence: 'unknown',
          source: 'fill_blank',
        }, { onConflict: 'user_id,question_id' });
        if (error) {
          console.error('Failed to save review item:', error);
        }
        onReviewItemsChange?.();
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setShowResult(false);
      setIsCorrect(false);
    } else {
      setFinished(true);
      refreshProfile();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setSelected(null);
      setShowResult(false);
      setIsCorrect(false);
    }
  };

  if (finished) {
    return (
      <Card className="shadow-elevated">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h3 className="text-xl font-bold">Doplňování dokončeno!</h3>
          <p className="text-muted-foreground">
            Správně: {correctCount} z {questions.length}
          </p>
          <Button onClick={onComplete} className="gradient-primary text-primary-foreground">
            Pokračovat <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <MilestoneDialog open={!!milestone} milestone={milestone || 0} onClose={() => setMilestone(null)} />

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{currentIndex + 1}/{questions.length}</span>
        <Progress value={progress} className="h-2 flex-1" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 space-y-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Vyberte správné slovo</p>

          {sentenceData ? (
            <div className="text-lg leading-relaxed">
              <span>{sentenceData.before}</span>
              <span className={`font-bold px-2 py-0.5 rounded ${
                showResult
                  ? isCorrect ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                  : 'bg-primary/10 text-primary'
              }`}>
                {showResult ? correctAnswerText : '______'}
              </span>
              <span>{sentenceData.after}</span>
            </div>
          ) : (
            <h3 className="text-lg font-semibold">{question.question_text}</h3>
          )}

          <div className="grid grid-cols-2 gap-3">
            {options.map((opt) => {
              const isThis = selected === opt.index;
              const isAnswer = opt.index === correctAnswerIndex;
              let cls = 'border-2 rounded-xl p-3 text-center transition-all font-medium text-sm ';
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
                <button key={opt.index} className={cls} onClick={() => handleSelect(opt.index)} disabled={showResult}>
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
                  <span className="font-medium text-success">Správně!</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive shrink-0" />
                  <span className="text-destructive">
                    Správná odpověď: <span className="font-bold">{correctAnswerText}</span>
                  </span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Předchozí
        </Button>
        {showResult && (
          <Button onClick={handleNext} className="gradient-primary text-primary-foreground">
            {currentIndex < questions.length - 1 ? 'Další' : 'Dokončit'} <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
