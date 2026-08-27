import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, ArrowLeft, ArrowRight, Trophy, AlertTriangle, Loader2 } from 'lucide-react';
import { useT, useLang } from '@/lib/i18n';

interface TestItem {
  id: string;
  type: string;
  question_text: string;
  options: string[];
}

interface TestResultItem {
  question_id: string;
  question_text: string;
  correct: boolean;
  user_answer: string | null;
  correct_answer: string;
}

interface Props {
  levelId: string;
  passingScore: number;
  basePath: string;
  existingProgress?: {
    completed: boolean;
    test_score: number | null;
    completed_at: string | null;
    completed_modules: string[];
  } | null;
  onProgressChange?: (progress: { completed: boolean; test_score: number | null; completed_at: string | null; completed_modules: string[] }) => void;
  onPassedWithDiploma?: (progress: { completed: boolean; test_score: number | null; completed_at: string | null; completed_modules: string[] }) => void;
}

export default function LevelTest({ levelId, passingScore, basePath, existingProgress, onProgressChange, onPassedWithDiploma }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const t = useT();
  const { lang } = useLang();
  const { lang } = useLang();
  const testLangRef = useRef(lang);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testScore, setTestScore] = useState<number | null>(null);
  const [testPassed, setTestPassed] = useState(false);
  const [reviewData, setReviewData] = useState<Array<{ question: TestItem; userAnswer: string; correct: boolean; correctAnswerText?: string }>>([]);

  const startTest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_level_test', { p_level_id: levelId, p_lang: lang });
      if (error) throw error;
      const list = (data as unknown as TestItem[]) || [];
      if (list.length === 0) {
        toast({
          title: t('Test není připraven'),
          description: t('V tomto levelu nejsou žádné otázky vhodné pro test (u kartiček a doplňování chybí špatné možnosti).'),
          variant: 'destructive',
        });
        return;
      }
      setItems(list);
      setAnswers({});
      setCurrentIndex(0);
      setFinished(false);
      setTestScore(null);
      setStarted(true);
    } catch (e: any) {
      toast({ title: t('Chyba'), description: e.message || t('Nepodařilo se načíst test'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const item = items[currentIndex];
  const progress = items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0;

  const handleSelect = (optText: string) => {
    setAnswers(a => ({ ...a, [currentIndex]: optText }));
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) setCurrentIndex(i => i + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  };

  useEffect(() => {
    if (!started || finished) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault(); handlePrev();
      } else if ((e.key === 'ArrowRight' || e.key === 'Enter') && answers[currentIndex] && currentIndex < items.length - 1) {
        e.preventDefault(); handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, finished, currentIndex, answers, items.length]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = items.map((q, i) => ({
        question_id: q.id,
        answer_text: answers[i] ?? '',
      }));

      const { data, error } = await supabase.rpc('complete_level_v2', {
        p_level_id: levelId,
        p_answers: payload,
        p_lang: lang,
      });
      if (error) throw error;

      const result = data as unknown as {
        score: number;
        passed: boolean;
        per_question?: TestResultItem[];
      };
      const score = result?.score ?? 0;
      const passed = Boolean(result?.passed);

      setTestScore(score);
      setTestPassed(passed);

      const resultByQuestion = new Map(
        (result?.per_question || []).map(item => [item.question_id, item])
      );
      const review = items.map((question, index) => {
        const itemResult = resultByQuestion.get(question.id);
        return {
          question,
          userAnswer: itemResult?.user_answer ?? answers[index] ?? '',
          correct: itemResult?.correct ?? false,
          correctAnswerText: itemResult?.correct_answer,
        };
      });
      setReviewData(review);

      if (user && Array.isArray(result?.per_question)) {
        for (const r of result.per_question) {
          if (r.correct) {
            await supabase.from('review_items').delete().eq('user_id', user.id).eq('question_id', r.question_id);
          } else {
            await supabase.from('review_items').upsert({
              user_id: user.id,
              question_id: r.question_id,
              confidence: 'unknown',
              source: 'failed_quiz',
            }, { onConflict: 'user_id,question_id' });
          }
        }

        const nextProgress = {
          completed: Boolean(existingProgress?.completed || passed),
          test_score: typeof existingProgress?.test_score === 'number'
            ? Math.max(existingProgress.test_score, score)
            : score,
          completed_at: existingProgress?.completed_at ?? (passed ? new Date().toISOString() : null),
          completed_modules: existingProgress?.completed_modules ?? [],
        };

        onProgressChange?.(nextProgress);

        if (passed && onPassedWithDiploma) {
          setTimeout(() => onPassedWithDiploma(nextProgress), 1500);
        }
      }

      setFinished(true);
    } catch (e: any) {
      toast({ title: t('Chyba'), description: e.message || t('Nepodařilo se odeslat test'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!started) {
    return (
      <Card className="shadow-elevated">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center">
            <Trophy className="h-8 w-8 text-primary-foreground" />
          </div>
          <h3 className="text-xl font-bold">{t('Závěrečný test')}</h3>
          <p className="text-muted-foreground">
            {t('Test pokrývá všechny otázky levelu (kvízy, kartičky i doplňování) v jednotné kvízové formě. Pro postup potřebujete minimálně {passingScore}% správných odpovědí.', { passingScore })}
          </p>
          <Button onClick={startTest} className="gradient-primary text-primary-foreground" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('Načítám...')}</> : <>{t('Začít test')} <ArrowRight className="ml-1 h-4 w-4" /></>}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (finished && testScore !== null) {
    return (
      <div className="space-y-4">
        <Card className="shadow-elevated">
          <CardContent className="p-8 text-center space-y-4">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${testPassed ? 'bg-success/20' : 'bg-destructive/20'}`}>
              {testPassed ? <Trophy className="h-8 w-8 text-success" /> : <AlertTriangle className="h-8 w-8 text-destructive" />}
            </div>
            <h3 className="text-xl font-bold">{testPassed ? t('Gratulujeme! 🎉') : t('Bohužel neprojdete')}</h3>
            <p className="text-2xl font-bold">{testScore}%</p>
            <p className="text-muted-foreground">
              {testPassed ? t('Úspěšně jste dokončili tento level! Za chvíli uvidíte svůj certifikát...') : t('Potřebujete alespoň {passingScore}%. Zkuste to znovu.', { passingScore })}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate(`${basePath}/levels`)}>
                {t('Zpět na levely')}
              </Button>
              {!testPassed && (
                <Button
                  onClick={() => { setStarted(false); setFinished(false); setAnswers({}); setCurrentIndex(0); setTestScore(null); setReviewData([]); }}
                  className="gradient-primary text-primary-foreground"
                >
                  {t('Zkusit znovu')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {reviewData.length > 0 && (
          <Card className="shadow-card">
            <CardContent className="p-6 space-y-4">
              <h4 className="text-lg font-semibold">{t('Přehled odpovědí')}</h4>
              <div className="space-y-3">
                {reviewData.map((r, idx) => (
                  <div
                    key={r.question.id}
                    className={`rounded-xl border-2 p-4 ${r.correct ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5'}`}
                  >
                    <div className="flex items-start gap-3">
                      {r.correct
                        ? <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                        : <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />}
                      <div className="flex-1 space-y-1.5">
                        <p className="font-medium">
                          <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                          {r.question.question_text}
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">{t('Vaše odpověď:')} </span>
                          <span className={r.correct ? 'text-success font-medium' : 'text-destructive font-medium'}>
                            {r.userAnswer || <em className="opacity-70">{t('(bez odpovědi)')}</em>}
                          </span>
                        </p>
                        {!r.correct && r.correctAnswerText && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">{t('Správná odpověď:')} </span>
                            <span className="text-success font-medium">{r.correctAnswerText}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{currentIndex + 1}/{items.length}</span>
        <Progress value={progress} className="h-2 flex-1" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 space-y-6">
          <h3 className="text-lg font-semibold">{item.question_text}</h3>
          <div className="space-y-3">
            {item.options.map((opt, i) => {
              const isSelected = answers[currentIndex] === opt;
              return (
                <button
                  key={i}
                  className={`border-2 p-4 min-h-[56px] rounded-xl cursor-pointer transition-all text-left w-full ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => handleSelect(opt)}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {t('Předchozí')}
        </Button>
        <div className="flex gap-2">
          {currentIndex < items.length - 1 ? (
            <Button onClick={handleNext} disabled={!answers[currentIndex]} className="gradient-primary text-primary-foreground">
              {t('Další')} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < items.length || submitting}
              className="gradient-primary text-primary-foreground"
            >
              {submitting ? t('Odesílání...') : t('Odevzdat test')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
