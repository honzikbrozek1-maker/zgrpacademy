import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { playCorrectSound, playIncorrectSound } from '@/lib/sounds';
import MilestoneDialog, { checkMilestone } from '@/components/MilestoneDialog';

interface Question {
  id: string;
  question_text: string;
  back_text: string | null;
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

export default function FillInBlankModule({ questions, onComplete }: Props) {
  const { user, refreshProfile, profile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [checking, setChecking] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [milestone, setMilestone] = useState<number | null>(null);

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const blankData = question?.back_text ? extractBlank(question.back_text) : null;
  const correctAnswer = blankData?.answer || question?.back_text || '';
  const sentence = blankData
    ? `${blankData.before}___${blankData.after}`
    : question?.question_text || '';

  const handleCheck = async () => {
    if (showResult || checking || !userAnswer.trim()) return;
    setChecking(true);

    try {
      const response = await supabase.functions.invoke('check-answer', {
        body: {
          userAnswer: userAnswer.trim(),
          correctAnswer: correctAnswer.trim(),
          sentence,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;
      setIsCorrect(result.correct);
      setFeedback(result.feedback || '');

      if (result.correct) {
        setCorrectCount(c => c + 1);
        playCorrectSound();
        // Award points
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
    } catch {
      // Fallback to exact match
      const exact = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      setIsCorrect(exact);
      setFeedback('');
      if (exact) {
        playCorrectSound();
        setCorrectCount(c => c + 1);
      } else {
        playIncorrectSound();
      }
    }

    setShowResult(true);
    setChecking(false);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setUserAnswer('');
      setShowResult(false);
      setIsCorrect(false);
      setFeedback('');
    } else {
      setFinished(true);
      refreshProfile();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setUserAnswer('');
      setShowResult(false);
      setIsCorrect(false);
      setFeedback('');
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
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Doplňte chybějící slovo</p>

          {blankData ? (
            <div className="text-lg leading-relaxed">
              <span>{blankData.before}</span>
              {showResult ? (
                <span className={`font-bold px-2 py-0.5 rounded ${isCorrect ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                  {isCorrect ? userAnswer : correctAnswer}
                </span>
              ) : (
                <Input
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCheck()}
                  className="inline-block w-40 mx-1 border-b-2 border-primary"
                  placeholder="..."
                  autoFocus
                  disabled={checking}
                />
              )}
              <span>{blankData.after}</span>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{question.question_text}</h3>
              <Input
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCheck()}
                placeholder="Napište odpověď..."
                className="flex-1"
                autoFocus
                disabled={showResult || checking}
              />
            </div>
          )}

          {showResult && (
            <div className={`flex items-start gap-2 p-3 rounded-lg ${isCorrect ? 'bg-success/10' : 'bg-destructive/10'}`}>
              {isCorrect ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success shrink-0" />
                  <div>
                    <span className="font-medium text-success">Správně!</span>
                    {feedback && <p className="text-sm text-muted-foreground mt-0.5">{feedback}</p>}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <span className="text-destructive">
                      Správná odpověď: <span className="font-bold">{correctAnswer}</span>
                    </span>
                    {feedback && <p className="text-sm text-muted-foreground mt-0.5">{feedback}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Předchozí
        </Button>
        {!showResult ? (
          <Button onClick={handleCheck} disabled={!userAnswer.trim() || checking} className="gradient-primary text-primary-foreground">
            {checking ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Kontroluji...</> : 'Zkontrolovat'}
          </Button>
        ) : (
          <Button onClick={handleNext} className="gradient-primary text-primary-foreground">
            {currentIndex < questions.length - 1 ? 'Další' : 'Dokončit'} <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
