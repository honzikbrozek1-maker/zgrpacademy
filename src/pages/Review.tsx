import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, HelpCircle, XCircle, Trash2, RotateCcw } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

interface ReviewItem {
  id: string;
  question_id: string;
  confidence: string;
  source: string;
  question?: {
    question_text: string;
    back_text: string | null;
    option_1: string | null;
    option_2: string | null;
    option_3: string | null;
    option_4: string | null;
    correct_answer: number | null;
    type: string;
  };
}

export default function Review() {
  const { user } = useAuth();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('review_items')
      .select('*, questions(*)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    
    if (data) {
      setItems(data.map(item => ({
        ...item,
        question: (item as any).questions,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [user]);

  const updateConfidence = async (id: string, confidence: string) => {
    await supabase.from('review_items').update({ confidence }).eq('id', id);
    setItems(items.map(i => i.id === id ? { ...i, confidence } : i));
  };

  const removeItem = async (id: string) => {
    await supabase.from('review_items').delete().eq('id', id);
    setItems(items.filter(i => i.id !== id));
  };

  const flashcardItems = items.filter(i => i.source === 'flashcard');
  const quizItems = items.filter(i => i.source === 'failed_quiz');

  const confidenceIcon = (c: string) => {
    if (c === 'know') return <CheckCircle className="h-4 w-4 text-success" />;
    if (c === 'partial') return <HelpCircle className="h-4 w-4 text-warning" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const confidenceLabel = (c: string) => {
    if (c === 'know') return 'Umím';
    if (c === 'partial') return 'Částečně';
    return 'Neumím';
  };

  const renderItems = (list: ReviewItem[]) => (
    <div className="space-y-3">
      {list.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Žádné položky k procvičení.</CardContent></Card>
      )}
      {list.map(item => (
        <Card key={item.id} className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-medium">{item.question?.question_text}</p>
                {item.question?.type === 'flashcard' && item.question.back_text && (
                  <p className="text-sm text-muted-foreground mt-1">{item.question.back_text}</p>
                )}
                {item.question?.type === 'quiz' && item.question.correct_answer && (
                  <p className="text-sm text-success mt-1">
                    Správná odpověď: {[item.question.option_1, item.question.option_2, item.question.option_3, item.question.option_4][item.question.correct_answer - 1]}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  {confidenceIcon(item.confidence)} {confidenceLabel(item.confidence)}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant={item.confidence === 'know' ? 'default' : 'outline'} onClick={() => updateConfidence(item.id, 'know')} className={item.confidence === 'know' ? 'bg-success text-success-foreground' : ''}>
                Umím
              </Button>
              <Button size="sm" variant={item.confidence === 'partial' ? 'default' : 'outline'} onClick={() => updateConfidence(item.id, 'partial')} className={item.confidence === 'partial' ? 'bg-warning text-warning-foreground' : ''}>
                Částečně
              </Button>
              <Button size="sm" variant={item.confidence === 'unknown' ? 'default' : 'outline'} onClick={() => updateConfidence(item.id, 'unknown')} className={item.confidence === 'unknown' ? 'bg-destructive text-destructive-foreground' : ''}>
                Neumím
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-slide-up pb-20">
        <div className="flex items-center gap-3">
          <RotateCcw className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Procvičování</h1>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Vše ({items.length})</TabsTrigger>
            <TabsTrigger value="flashcards">Kartičky ({flashcardItems.length})</TabsTrigger>
            <TabsTrigger value="quiz">Kvíz ({quizItems.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">{renderItems(items)}</TabsContent>
          <TabsContent value="flashcards" className="mt-4">{renderItems(flashcardItems)}</TabsContent>
          <TabsContent value="quiz" className="mt-4">{renderItems(quizItems)}</TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
