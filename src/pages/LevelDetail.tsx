import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BookOpen, Brain, ClipboardCheck, RotateCcw, Trophy, AlertTriangle, PenLine, Lock } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import QuizModule from '@/components/QuizModule';
import FlashcardModule from '@/components/FlashcardModule';
import FillInBlankModule from '@/components/FillInBlankModule';
import LevelTest from '@/components/LevelTest';
import LevelDiploma from '@/components/LevelDiploma';

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

interface UserProgressRow {
  completed: boolean;
  test_score: number | null;
  completed_at: string | null;
}

export default function LevelDetail() {
  const { levelId } = useParams();
  const { user, profile } = useAuth();
  const [level, setLevel] = useState<{ id: string; title: string; description: string | null; passing_score: number } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [progress, setProgress] = useState<UserProgressRow | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [showDiploma, setShowDiploma] = useState(false);

  const fetchData = async () => {
    if (!levelId || !user) return;
    const [levelRes, questionsRes, progressRes, reviewRes] = await Promise.all([
      supabase.from('levels').select('*').eq('id', levelId).single(),
      supabase.from('questions').select('*').eq('level_id', levelId).order('order_index'),
      supabase.from('user_progress').select('*').eq('user_id', user.id).eq('level_id', levelId).maybeSingle(),
      supabase.from('review_items').select('id', { count: 'exact' }).eq('user_id', user.id).in('confidence', ['partial', 'unknown']),
    ]);
    if (levelRes.data) setLevel(levelRes.data);
    if (questionsRes.data) setQuestions(questionsRes.data);
    if (progressRes.data) setProgress(progressRes.data);
    setReviewCount(reviewRes.count || 0);
  };

  useEffect(() => { fetchData(); }, [levelId, user]);

  const quizQuestions = questions.filter(q => q.type === 'quiz');
  const flashcardQuestions = questions.filter(q => q.type === 'flashcard');
  const isCompleted = progress?.completed === true;

  // Prevent switching to test tab when not completed
  const handleTabChange = (value: string) => {
    if (value === 'test' && !isCompleted) return;
    setActiveTab(value);
  };

  if (!level) return (
    <AppLayout>
      <div className="p-8 text-center text-muted-foreground">Načítání...</div>
    </AppLayout>
  );

  if (showDiploma && progress?.completed && progress.test_score) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8 max-w-3xl mx-auto pb-20">
          <LevelDiploma
            levelTitle={level.title}
            userName={profile?.display_name || 'Uživatel'}
            score={progress.test_score}
            completedAt={progress.completed_at || new Date().toISOString()}
            onBack={() => setShowDiploma(false)}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-slide-up pb-20">
        <div className="flex items-center gap-3">
          <Link to="/levels">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{level.title}</h1>
            {level.description && <p className="text-muted-foreground">{level.description}</p>}
          </div>
          {isCompleted && (
            <Button variant="outline" size="sm" onClick={() => setShowDiploma(true)}>
              <Trophy className="mr-1 h-4 w-4" /> Diplom
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-1.5">
              <span className="hidden sm:inline">Přehled</span>
              <span className="sm:hidden text-xs">📋</span>
            </TabsTrigger>
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
            <TabsTrigger value="fillin" className="flex items-center gap-1.5">
              <PenLine className="h-4 w-4" />
              <span className="hidden sm:inline">Doplňování</span>
            </TabsTrigger>
            <TabsTrigger
              value="test"
              disabled={!isCompleted}
              className={`flex items-center gap-1.5 ${!isCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {!isCompleted && <Lock className="h-3 w-3" />}
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Test</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="shadow-card cursor-pointer hover:shadow-elevated transition-all" onClick={() => setActiveTab('quiz')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                    <Brain className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Kvíz</h3>
                    <p className="text-sm text-muted-foreground">{quizQuestions.length} otázek</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card cursor-pointer hover:shadow-elevated transition-all" onClick={() => setActiveTab('flashcards')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Kartičky</h3>
                    <p className="text-sm text-muted-foreground">{flashcardQuestions.length} kartiček</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card cursor-pointer hover:shadow-elevated transition-all" onClick={() => setActiveTab('fillin')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <PenLine className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Doplňování</h3>
                    <p className="text-sm text-muted-foreground">Doplňte chybějící slova</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={`shadow-card transition-all ${isCompleted ? 'cursor-pointer hover:shadow-elevated' : 'opacity-60'}`} onClick={() => isCompleted ? setActiveTab('test') : null}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isCompleted ? 'bg-success/20' : 'bg-muted'}`}>
                    {!isCompleted && <Lock className="h-4 w-4 text-muted-foreground absolute" />}
                    <ClipboardCheck className={`h-6 w-6 ${isCompleted ? 'text-success' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">Závěrečný test</h3>
                    {!isCompleted ? (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Dokončete kvíz a kartičky
                      </p>
                    ) : (
                      <p className="text-sm text-success">
                        {progress?.test_score ? `Výsledek: ${progress.test_score}%` : 'Připraven k testu'}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {reviewCount > 0 && (
                <Link to="/review">
                  <Card className="shadow-card cursor-pointer hover:shadow-elevated transition-all">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                        <RotateCcw className="h-6 w-6 text-warning" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Procvičování</h3>
                        <p className="text-sm text-muted-foreground">{reviewCount} položek k opakování</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>

            {isCompleted && progress?.test_score && (
              <Card className="shadow-elevated mt-4 border-success/30">
                <CardContent className="p-6 text-center space-y-3">
                  <Trophy className="h-8 w-8 mx-auto text-success" />
                  <h3 className="font-bold text-lg">Level dokončen! 🎉</h3>
                  <p className="text-muted-foreground">Výsledek testu: <span className="font-bold text-success">{progress.test_score}%</span></p>
                  <Button onClick={() => setShowDiploma(true)} className="gradient-primary text-primary-foreground">
                    Zobrazit diplom
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="quiz" className="mt-6">
            {quizQuestions.length > 0 ? (
              <QuizModule questions={quizQuestions} levelId={level.id} onComplete={() => setActiveTab('overview')} />
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Žádné kvízové otázky v tomto levelu.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="flashcards" className="mt-6">
            {flashcardQuestions.length > 0 ? (
              <FlashcardModule questions={flashcardQuestions} onComplete={() => setActiveTab('overview')} />
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Žádné kartičky v tomto levelu.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="fillin" className="mt-6">
            {flashcardQuestions.length > 0 ? (
              <FillInBlankModule questions={flashcardQuestions} onComplete={() => setActiveTab('overview')} />
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Žádné otázky pro doplňování v tomto levelu.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="test" className="mt-6">
            <LevelTest
              questions={quizQuestions}
              levelId={level.id}
              passingScore={level.passing_score}
              onPassedWithDiploma={(score) => {
                setProgress({ completed: true, test_score: score, completed_at: new Date().toISOString() });
                setShowDiploma(true);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
