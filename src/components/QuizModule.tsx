import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { playCorrectSound, playIncorrectSound } from '@/lib/sounds';

interface Question {
  id: string;
  question_text: string;
  option_1: string | null;
  option_2: string | null;
  option_3: string | null;
  option_4: string | null;
}

interface Props {
  questions: Question[];
  levelId: string;
  onComplete: () => void;
  onReviewItemsChange?: () => void;
}

export default function QuizModule({ questions, onComplete, onReviewItemsChange }: Props) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [checking, setChecking] = useState(false);

  const question = questions[currentIndex];
  const options = [question?.option_1, question?.option_2, question?.option_3, question?.option_4].filter(Boolean);
  const progress = ((currentIndex + 1) / questions.length) * 100;

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
      setCorrectAnswer(result.correct ? optIndex : (result.correct_answer ?? null));
      setShowResult(true);

      if (result.correct) {
        setCorrectCount(c => c + 1);
        playCorrectSound();
        if (user) {
          await supabase.from('review_items').delete().eq('user_id', user.id).eq('question_id', question.id);
          onReviewItemsChange?.();
        }
      } else {
        playIncorrectSound();
        if (user) {
          await supabase.from('review_items').upsert({
            user_id: user.id,
            question_id: question.id,
            confidence: 'unknown',
            source: 'failed_quiz',
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
      setCorrectAnswer(null);
    } else {
      setFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setSelected(null);
      setShowResult(false);
      setCorrectAnswer(null);
    }
  };

  // Klávesové zkratky: 1-4 výběr odpovědi, Enter další, ←/→ navigace
  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!showResult && /^[1-4]$/.test(e.key)) {
        const n = parseInt(e.key, 10);
        if (n <= options.length) { e.preventDefault(); handleSelect(n); }
      } else if (e.key === 'Enter' && showResult) {
        e.preventDefault(); handleNext();
      } else if (e.key === 'ArrowRight' && showResult) {
        e.preventDefault(); handleNext();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault(); handlePrev();
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
          <h3 className="text-xl font-bold">Procvičování dokončeno!</h3>
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
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{currentIndex + 1}/{questions.length}</span>
        <Progress value={progress} className="h-2 flex-1" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 space-y-6">
          <h3 className="text-lg font-semibold">{question.question_text}</h3>
          <div className="space-y-3">
            {options.map((opt, i) => {
              const optNum = i + 1;
              let cls = 'border-2 p-4 rounded-xl cursor-pointer transition-all text-left w-full';
              if (showResult) {
                if (optNum === correctAnswer) cls += ' border-success bg-success/10';
                else if (optNum === selected) cls += ' border-destructive bg-destructive/10';
                else cls += ' border-border opacity-50';
              } else if (optNum === selected) {
                cls += ' border-primary bg-primary/5';
              } else {
                cls += ' border-border hover:border-primary/50';
              }
              return (
                <button key={i} className={cls} onClick={() => handleSelect(optNum)} disabled={showResult || checking}>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {showResult && optNum === correctAnswer && <CheckCircle className="h-5 w-5 text-success" />}
                    {showResult && optNum === selected && optNum !== correctAnswer && <XCircle className="h-5 w-5 text-destructive" />}
                  </div>
                </button>
              );
            })}
          </div>
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
