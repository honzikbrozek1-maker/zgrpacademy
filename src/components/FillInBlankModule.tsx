import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { playCorrectSound, playIncorrectSound } from '@/lib/sounds';
import MilestoneDialog, { checkMilestone } from '@/components/MilestoneDialog';

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
}

function extractBlank(text: string): { before: string; answer: string; after: string } | null {
  const bracketMatch = text.match(/^(.*?)\[(.+?)\](.*)$/s);
  if (bracketMatch) return { before: bracketMatch[1], answer: bracketMatch[2], after: bracketMatch[3] };
  const underscoreMatch = text.match(/^(.*?)___(.+?)___(.*)$/s);
  if (underscoreMatch) return { before: underscoreMatch[1], answer: underscoreMatch[2], after: underscoreMatch[3] };
  return null;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FillInBlankModule({ questions, onComplete }: Props) {
  const { user, refreshProfile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [milestone, setMilestone] = useState<number | null>(null);

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const blankData = question?.back_text ? extractBlank(question.back_text) : null;
  // Correct answer: use correct_answer index if available, else fall back to blank extraction
  const correctOptionIndex = question?.correct_answer || 1;
  const correctAnswerText = blankData?.answer || '';

  // Build options from option_1-4
  const options = useMemo(() => {
    const opts: string[] = [];
    if (question?.option_1) opts.push(question.option_1);
    if (question?.option_2) opts.push(question.option_2);
    if (question?.option_3) opts.push(question.option_3);
    if (question?.option_4) opts.push(question.option_4);
    if (opts.length >= 2) return shuffleArray(opts);
    // Fallback: just show the correct answer with some placeholders
    return shuffleArray([correctAnswerText, 'žádná odpověď', 'neutrální', 'jiná možnost']);
  }, [question, correctAnswerText]);

  const handleSelect = async (option: string) => {
    if (showResult) return;
    setSelected(option);
    // Match by correct_answer index: option at that index (1-based)
    const correctOpt = [question?.option_1, question?.option_2, question?.option_3, question?.option_4][correctOptionIndex - 1] || '';
    const correct = option.trim().toLowerCase() === correctOpt.trim().toLowerCase();
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      setCorrectCount(c => c + 1);
      playCorrectSound();
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('total_points').eq('user_id', user.id).single();
        if (prof) {
          const oldPts = prof.total_points;
          const newPts = oldPts + 10;
          await supabase.from('profiles').update({ total_points: newPts }).eq('user_id', user.id);
          const m = checkMilestone(oldPts, newPts);
          if (m) setMilestone(m);
        }
      }
    } else {
      playIncorrectSound();
      if (user) {
        await supabase.from('review_items').upsert({
          user_id: user.id,
          question_id: question.id,
          confidence: 'unknown',
          source: 'fill_blank',
        }, { onConflict: 'user_id,question_id' });
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

          {blankData ? (
            <div className="text-lg leading-relaxed">
              <span>{blankData.before}</span>
              <span className={`font-bold px-2 py-0.5 rounded ${
                showResult
                  ? isCorrect ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                  : 'bg-primary/10 text-primary'
              }`}>
                {showResult ? (isCorrect ? selected : blankData.answer) : '______'}
              </span>
              <span>{blankData.after}</span>
            </div>
          ) : (
            <h3 className="text-lg font-semibold">{question.question_text}</h3>
          )}

          <div className="grid grid-cols-2 gap-3">
            {options.map((option, idx) => {
              const isThis = selected === option;
              const correctOpt = [question?.option_1, question?.option_2, question?.option_3, question?.option_4][correctOptionIndex - 1] || '';
              const isAnswer = option.trim().toLowerCase() === correctOpt.trim().toLowerCase();
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
                <button key={idx} className={cls} onClick={() => handleSelect(option)} disabled={showResult}>
                  {option}
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
                    Správná odpověď: <span className="font-bold">{correctAnswer}</span>
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
