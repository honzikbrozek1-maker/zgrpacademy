import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

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
  // Expects format: "Some text ___answer___ more text"
  // or "Some text [answer] more text"
  const bracketMatch = text.match(/^(.*?)\[(.+?)\](.*)$/s);
  if (bracketMatch) return { before: bracketMatch[1], answer: bracketMatch[2], after: bracketMatch[3] };
  const underscoreMatch = text.match(/^(.*?)___(.+?)___(.*)$/s);
  if (underscoreMatch) return { before: underscoreMatch[1], answer: underscoreMatch[2], after: underscoreMatch[3] };
  return null;
}

export default function FillInBlankModule({ questions, onComplete }: Props) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Use back_text as the sentence with blank, question_text as hint
  // Or if back_text has bracket notation, use that
  const blankData = question?.back_text ? extractBlank(question.back_text) : null;
  const correctAnswer = blankData?.answer || question?.back_text || '';

  const handleCheck = async () => {
    if (showResult) return;
    setShowResult(true);
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    if (isCorrect) {
      setCorrectCount(c => c + 1);
    } else if (user) {
      await supabase.from('review_items').upsert({
        user_id: user.id,
        question_id: question.id,
        confidence: 'unknown',
        source: 'fill_blank',
      }, { onConflict: 'user_id,question_id' });
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setUserAnswer('');
      setShowResult(false);
    } else {
      setFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setUserAnswer('');
      setShowResult(false);
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

  const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

  return (
    <div className="space-y-4">
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
                />
              )}
              <span>{blankData.after}</span>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{question.question_text}</h3>
              <div className="flex items-center gap-2">
                <Input
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCheck()}
                  placeholder="Napište odpověď..."
                  className="flex-1"
                  autoFocus
                  disabled={showResult}
                />
              </div>
            </div>
          )}

          {showResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${isCorrect ? 'bg-success/10' : 'bg-destructive/10'}`}>
              {isCorrect ? (
                <>
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="font-medium text-success">Správně!</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
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
        {!showResult ? (
          <Button onClick={handleCheck} disabled={!userAnswer.trim()} className="gradient-primary text-primary-foreground">
            Zkontrolovat
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
