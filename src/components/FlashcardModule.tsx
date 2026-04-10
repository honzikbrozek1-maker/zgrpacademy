import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, HelpCircle, XCircle, RotateCcw } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  back_text: string | null;
}

interface Props {
  questions: Question[];
  onComplete: () => void;
}

export default function FlashcardModule({ questions, onComplete }: Props) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleRate = async (confidence: 'know' | 'partial' | 'unknown') => {
    setRatings(r => ({ ...r, [question.id]: confidence }));
    if (user) {
      // Only upsert review items for partial/unknown — "know" should NOT create/update review items
      if (confidence === 'partial' || confidence === 'unknown') {
        await supabase.from('review_items').upsert({
          user_id: user.id,
          question_id: question.id,
          confidence,
          source: 'flashcard',
        }, { onConflict: 'user_id,question_id' });
      } else {
        // If user now knows it, remove from review items
        await supabase.from('review_items').delete()
          .eq('user_id', user.id)
          .eq('question_id', question.id);
      }
    }

    if (currentIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentIndex(i => i + 1);
        setFlipped(false);
      }, 300);
    } else {
      setFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setFlipped(false);
    }
  };

  if (finished) {
    const knowCount = Object.values(ratings).filter(r => r === 'know').length;
    const partialCount = Object.values(ratings).filter(r => r === 'partial').length;
    const unknownCount = Object.values(ratings).filter(r => r === 'unknown').length;

    return (
      <Card className="shadow-elevated">
        <CardContent className="p-8 text-center space-y-4">
          <h3 className="text-xl font-bold">Kartičky dokončeny!</h3>
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-success" /> Umím: {knowCount}</div>
            <div className="flex items-center gap-1"><HelpCircle className="h-4 w-4 text-warning" /> Částečně: {partialCount}</div>
            <div className="flex items-center gap-1"><XCircle className="h-4 w-4 text-destructive" /> Neumím: {unknownCount}</div>
          </div>
          <Button onClick={onComplete} className="gradient-primary text-primary-foreground">
            Zpět do levelu <ArrowRight className="ml-1 h-4 w-4" />
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

      <div className="perspective-1000 cursor-pointer" onClick={() => setFlipped(!flipped)}>
        <div className={`relative w-full min-h-[250px] preserve-3d transition-transform duration-500 ${flipped ? 'rotate-y-180' : ''}`}>
          {/* Front */}
          <Card className="absolute inset-0 backface-hidden shadow-elevated">
            <CardContent className="p-8 flex flex-col items-center justify-center min-h-[250px]">
              <p className="text-xs text-muted-foreground mb-4">Kliknutím otočíte</p>
              <h3 className="text-xl font-semibold text-center">{question.question_text}</h3>
            </CardContent>
          </Card>
          {/* Back */}
          <Card className="absolute inset-0 backface-hidden rotate-y-180 shadow-elevated">
            <CardContent className="p-8 flex flex-col items-center justify-center min-h-[250px]">
              <p className="text-xs text-muted-foreground mb-4">Odpověď</p>
              <p className="text-lg text-center">{question.back_text || 'Bez odpovědi'}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {flipped && (
        <div className="flex justify-center gap-3 animate-slide-up">
          <Button variant="outline" className="border-success text-success hover:bg-success/10" onClick={() => handleRate('know')}>
            <CheckCircle className="mr-1 h-4 w-4" /> Umím
          </Button>
          <Button variant="outline" className="border-warning text-warning hover:bg-warning/10" onClick={() => handleRate('partial')}>
            <HelpCircle className="mr-1 h-4 w-4" /> Částečně
          </Button>
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleRate('unknown')}>
            <XCircle className="mr-1 h-4 w-4" /> Neumím
          </Button>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Předchozí
        </Button>
        <Button variant="ghost" onClick={() => setFlipped(!flipped)}>
          <RotateCcw className="mr-1 h-4 w-4" /> Otočit
        </Button>
      </div>
    </div>
  );
}
