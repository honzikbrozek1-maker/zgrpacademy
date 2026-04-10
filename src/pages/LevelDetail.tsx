import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useAppPath } from '@/lib/pathContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BookOpen, Brain, ClipboardCheck, RotateCcw, Trophy, AlertTriangle, PenLine, Lock, CheckCircle } from 'lucide-react';
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

const COMPLETED_MODULES_KEY = 'zgrp_completed_modules_';

export default function LevelDetail() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { category, basePath } = useAppPath();
  const [level, setLevel] = useState<{ id: string; title: string; description: string | null; passing_score: number; order_index: number } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [progress, setProgress] = useState<UserProgressRow | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [showDiploma, setShowDiploma] = useState(false);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());

  const refreshReviewCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('review_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('confidence', ['partial', 'unknown']);

    setReviewCount(count || 0);
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    let levelQuery;
    const isUuid = levelId && levelId.includes('-');
    if (isUuid) {
      levelQuery = supabase.from('levels').select('*').eq('id', levelId).single();
    } else {
      levelQuery = supabase.from('levels').select('*').eq('order_index', parseInt(levelId || '1')).eq('category', category).single();
    }
    const levelRes = await levelQuery;
    if (!levelRes.data) return;
    const lvl = levelRes.data;
    setLevel(lvl);

    const [questionsRes, progressRes, reviewRes] = await Promise.all([
      supabase.from('questions').select('*').eq('level_id', lvl.id).order('order_index'),
      supabase.from('user_progress').select('*').eq('user_id', user.id).eq('level_id', lvl.id).maybeSingle(),
      supabase.from('review_items').select('id', { count: 'exact' }).eq('user_id', user.id).in('confidence', ['partial', 'unknown']),
    ]);
    if (questionsRes.data) setQuestions(questionsRes.data);
    if (progressRes.data) setProgress(progressRes.data);
    setReviewCount(reviewRes.count || 0);

    // Restore completed modules from localStorage
    const saved = localStorage.getItem(COMPLETED_MODULES_KEY + lvl.id);
    if (saved) {
      setCompletedModules(new Set(JSON.parse(saved)));
    }
    // If progress is completed, mark all modules done
    if (progressRes.data?.completed) {
      const qs = questionsRes.data || [];
      const allMods = new Set<string>();
      if (qs.some(q => q.type === 'quiz')) allMods.add('quiz');
      if (qs.some(q => q.type === 'flashcard')) allMods.add('flashcards');
      if (qs.some(q => q.type === 'fill_blank')) allMods.add('fillin');
      setCompletedModules(allMods);
      localStorage.setItem(COMPLETED_MODULES_KEY + lvl.id, JSON.stringify([...allMods]));
    }
  }, [levelId, user, category]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const quizQuestions = questions.filter(q => q.type === 'quiz');
  const flashcardQuestions = questions.filter(q => q.type === 'flashcard');
  const fillBlankQuestions = questions.filter(q => q.type === 'fill_blank');

  const availableModules = new Set<string>();
  if (quizQuestions.length > 0) availableModules.add('quiz');
  if (flashcardQuestions.length > 0) availableModules.add('flashcards');
  if (fillBlankQuestions.length > 0) availableModules.add('fillin');

  const allModulesDone = availableModules.size > 0 && [...availableModules].every(m => completedModules.has(m));
  const isCompleted = progress?.completed === true || allModulesDone;

  const markModuleComplete = async (module: string) => {
    const newSet = new Set(completedModules);
    newSet.add(module);
    setCompletedModules(newSet);

    // Persist to localStorage
    if (level) {
      localStorage.setItem(COMPLETED_MODULES_KEY + level.id, JSON.stringify([...newSet]));
    }

    const allDone = [...availableModules].every(m => newSet.has(m));
    if (allDone && user && level) {
      await supabase.from('user_progress').upsert({
        user_id: user.id,
        level_id: level.id,
        completed: true,
      }, { onConflict: 'user_id,level_id' });
      setProgress(prev => prev ? { ...prev, completed: true } : { completed: true, test_score: null, completed_at: null });
    }
    setActiveTab('overview');
  };

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
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{level.title}</h1>
            {level.description && <p className="text-muted-foreground">{level.description}</p>}
          </div>
          {progress?.test_score && (
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
              {completedModules.has('quiz') ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <Brain className="h-4 w-4" />}
              <span className="hidden sm:inline">Kvíz</span>
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="flex items-center gap-1.5">
              {completedModules.has('flashcards') ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <BookOpen className="h-4 w-4" />}
              <span className="hidden sm:inline">Kartičky</span>
            </TabsTrigger>
            <TabsTrigger value="fillin" className="flex items-center gap-1.5">
              {completedModules.has('fillin') ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <PenLine className="h-4 w-4" />}
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

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className={`shadow-card cursor-pointer hover:shadow-elevated transition-all ${completedModules.has('quiz') ? 'ring-2 ring-success/30' : ''}`} onClick={() => setActiveTab('quiz')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                    <Brain className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Kvíz</h3>
                    <p className="text-sm text-muted-foreground">{quizQuestions.length} otázek</p>
                  </div>
                  {completedModules.has('quiz') && <CheckCircle className="h-5 w-5 text-success" />}
                </CardContent>
              </Card>

              <Card className={`shadow-card cursor-pointer hover:shadow-elevated transition-all ${completedModules.has('flashcards') ? 'ring-2 ring-success/30' : ''}`} onClick={() => setActiveTab('flashcards')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Kartičky</h3>
                    <p className="text-sm text-muted-foreground">{flashcardQuestions.length} kartiček</p>
                  </div>
                  {completedModules.has('flashcards') && <CheckCircle className="h-5 w-5 text-success" />}
                </CardContent>
              </Card>

              <Card className={`shadow-card cursor-pointer hover:shadow-elevated transition-all ${completedModules.has('fillin') ? 'ring-2 ring-success/30' : ''}`} onClick={() => setActiveTab('fillin')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <PenLine className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Doplňování</h3>
                    <p className="text-sm text-muted-foreground">Vyberte chybějící slovo</p>
                  </div>
                  {completedModules.has('fillin') && <CheckCircle className="h-5 w-5 text-success" />}
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
                        <AlertTriangle className="h-3 w-3" /> Dokončete všechny moduly
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
                <Link to={`${basePath}/review`}>
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

            {progress?.test_score && (
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
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('overview')}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Zpět na přehled
              </Button>
            </div>
            {quizQuestions.length > 0 ? (
              <QuizModule questions={quizQuestions} levelId={level.id} onComplete={() => markModuleComplete('quiz')} onReviewItemsChange={refreshReviewCount} />
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Žádné kvízové otázky v tomto levelu.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="flashcards" className="mt-6">
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('overview')}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Zpět na přehled
              </Button>
            </div>
            {flashcardQuestions.length > 0 ? (
              <FlashcardModule questions={flashcardQuestions} onComplete={() => markModuleComplete('flashcards')} onReviewItemsChange={refreshReviewCount} />
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Žádné kartičky v tomto levelu.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="fillin" className="mt-6">
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('overview')}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Zpět na přehled
              </Button>
            </div>
            {fillBlankQuestions.length > 0 ? (
              <FillInBlankModule questions={fillBlankQuestions} onComplete={() => markModuleComplete('fillin')} onReviewItemsChange={refreshReviewCount} />
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Žádné otázky pro doplňování v tomto levelu.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="test" className="mt-6">
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('overview')}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Zpět na přehled
              </Button>
            </div>
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
