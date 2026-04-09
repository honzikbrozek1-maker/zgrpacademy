import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BookOpen, Brain, ClipboardCheck } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import QuizModule from '@/components/QuizModule';
import FlashcardModule from '@/components/FlashcardModule';
import LevelTest from '@/components/LevelTest';

interface Question {
  id: string;
  type: string;
  question_text: string;
  option_1: string | null;
  option_2: string | null;
  option_3: string | null;
  option_4: string | null;
  correct_answer: number | null;
  back_text: string | null;
  order_index: number;
}

export default function LevelDetail() {
  const { levelId } = useParams();
  const { user } = useAuth();
  const [level, setLevel] = useState<{ id: string; title: string; description: string | null; passing_score: number } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState('quiz');

  useEffect(() => {
    if (!levelId) return;
    const fetch = async () => {
      const [levelRes, questionsRes] = await Promise.all([
        supabase.from('levels').select('*').eq('id', levelId).single(),
        supabase.from('questions').select('*').eq('level_id', levelId).order('order_index'),
      ]);
      if (levelRes.data) setLevel(levelRes.data);
      if (questionsRes.data) setQuestions(questionsRes.data);
    };
    fetch();
  }, [levelId]);

  const quizQuestions = questions.filter(q => q.type === 'quiz');
  const flashcardQuestions = questions.filter(q => q.type === 'flashcard');

  if (!level) return (
    <AppLayout>
      <div className="p-8 text-center text-muted-foreground">Načítání...</div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-slide-up pb-20">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{level.title}</h1>
            {level.description && <p className="text-muted-foreground">{level.description}</p>}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quiz" className="flex items-center gap-1.5">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Kvíz</span>
              <span className="text-xs">({quizQuestions.length})</span>
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Kartičky</span>
              <span className="text-xs">({flashcardQuestions.length})</span>
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Test</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quiz" className="mt-6">
            {quizQuestions.length > 0 ? (
              <QuizModule questions={quizQuestions} levelId={level.id} onComplete={() => setActiveTab('flashcards')} />
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Žádné kvízové otázky v tomto levelu.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="flashcards" className="mt-6">
            {flashcardQuestions.length > 0 ? (
              <FlashcardModule questions={flashcardQuestions} onComplete={() => setActiveTab('test')} />
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Žádné kartičky v tomto levelu.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="test" className="mt-6">
            <LevelTest questions={quizQuestions} levelId={level.id} passingScore={level.passing_score} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
