import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useAppPath } from '@/lib/pathContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Brain, ClipboardCheck, RotateCcw, Trophy, PenLine, CheckCircle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import Breadcrumbs from '@/components/Breadcrumbs';
import QuizModule from '@/components/QuizModule';
import FillInBlankModule from '@/components/FillInBlankModule';
import LevelTest from '@/components/LevelTest';
import { useToast } from '@/hooks/use-toast';
import { type ModuleKey, getCompletedModules, getStartedModuleMarker } from '@/lib/levelProgress';

interface Question {
  id: string;
  type: string;
  question_text: string;
  option_1: string | null;
  option_2: string | null;
  option_3: string | null;
  option_4: string | null;
  back_text: string | null;
  order_index: number;
}

interface UserProgressRow {
  completed: boolean;
  test_score: number | null;
  completed_at: string | null;
  completed_modules: string[];
}

export default function LevelDetail() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { category, basePath } = useAppPath();
  const { toast } = useToast();
  const [level, setLevel] = useState<{ id: string; title: string; description: string | null; passing_score: number; order_index: number; group_id: string | null } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [progress, setProgress] = useState<UserProgressRow | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [moduleMarkers, setModuleMarkers] = useState<string[]>([]);

  const refreshReviewCount = useCallback(async () => {
    if (!user || !level) return;
    const { data: levelQuestionIds } = await supabase
      .from('questions_safe' as any)
      .select('id')
      .eq('level_id', level.id)
      .eq('in_practice', true);

    if (!levelQuestionIds || levelQuestionIds.length === 0) {
      setReviewCount(0);
      return;
    }

    const qIds = (levelQuestionIds as any[]).map((q: any) => q.id);
    const { count } = await supabase
      .from('review_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('question_id', qIds)
      .in('confidence', ['partial', 'unknown']);

    setReviewCount(count || 0);
  }, [user, level]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    let levelQuery;
    const isUuid = levelId && levelId.includes('-');
    if (isUuid) {
      levelQuery = supabase.from('levels').select('*').eq('id', levelId).eq('category', category).single();
    } else {
      levelQuery = supabase.from('levels').select('*').eq('order_index', parseInt(levelId || '1')).eq('category', category).single();
    }
    const levelRes = await levelQuery;
    if (!levelRes.data) {
      navigate(`${basePath}/levels`, { replace: true });
      return;
    }
    const lvl = levelRes.data;
    setLevel(lvl);

    const [questionsRes, progressRes] = await Promise.all([
      supabase.from('questions_safe' as any).select('id, level_id, type, question_text, option_1, option_2, option_3, option_4, back_text, order_index').eq('level_id', lvl.id).eq('in_practice', true).order('order_index'),
      supabase.from('user_progress').select('*').eq('user_id', user.id).eq('level_id', lvl.id).maybeSingle(),
    ]);
    if (questionsRes.data) setQuestions(questionsRes.data as unknown as Question[]);

    if (progressRes.data) {
      const prog = progressRes.data;
      const modules = Array.isArray(prog.completed_modules) ? prog.completed_modules as string[] : [];
      setProgress({ ...prog, completed_modules: modules });
      setModuleMarkers(modules);
    } else {
      setProgress(null);
      setModuleMarkers([]);
    }
  }, [levelId, user, category, navigate, basePath]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (level) refreshReviewCount(); }, [level, refreshReviewCount]);

  const quizQuestions = questions.filter(q => q.type === 'quiz');
  const fillBlankQuestions = questions.filter(q => q.type === 'fill_blank');

  const availableModules = useMemo(() => {
    const modules: ModuleKey[] = [];
    if (quizQuestions.length > 0) modules.push('quiz');
    if (fillBlankQuestions.length > 0) modules.push('fillin');
    return modules;
  }, [quizQuestions.length, fillBlankQuestions.length]);

  const completedModules = new Set(getCompletedModules(moduleMarkers));
  const moduleQuestionIds = useMemo<Record<ModuleKey, string[]>>(() => ({
    quiz: quizQuestions.map((question) => question.id),
    fillin: fillBlankQuestions.map((question) => question.id),
  }), [quizQuestions, fillBlankQuestions]);

  const persistModuleMarkers = useCallback(async (nextMarkers: string[]) => {
    setModuleMarkers(nextMarkers);
    setProgress((current) => current
      ? { ...current, completed_modules: nextMarkers }
      : { completed: false, test_score: null, completed_at: null, completed_modules: nextMarkers });

    if (!user || !level) return;

    await supabase.rpc('set_completed_modules', {
      p_level_id: level.id,
      p_modules: nextMarkers as unknown as never,
    });
  }, [user, level]);

  const getPendingReviewCountForModule = useCallback(async (module: ModuleKey) => {
    const questionIds = moduleQuestionIds[module];

    if (!user || questionIds.length === 0) return 0;

    const { count } = await supabase
      .from('review_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('question_id', questionIds)
      .in('confidence', ['partial', 'unknown']);

    return count || 0;
  }, [user, moduleQuestionIds]);

  const finalizeModule = useCallback(async (module: ModuleKey) => {
    const nextMarkers = new Set(moduleMarkers);
    nextMarkers.add(getStartedModuleMarker(module));

    const pendingCount = await getPendingReviewCountForModule(module);
    if (pendingCount === 0) {
      nextMarkers.add(module);
    }

    await persistModuleMarkers([...nextMarkers]);
    setActiveTab('overview');
  }, [moduleMarkers, getPendingReviewCountForModule, persistModuleMarkers]);

  const syncCompletedModules = useCallback(async () => {
    if (!user || !level || availableModules.length === 0) return;

    const nextMarkers = new Set(moduleMarkers);
    let changed = false;

    for (const module of availableModules) {
      if (nextMarkers.has(module) || !nextMarkers.has(getStartedModuleMarker(module))) continue;

      const pendingCount = await getPendingReviewCountForModule(module);
      if (pendingCount === 0) {
        nextMarkers.add(module);
        changed = true;
      }
    }

    if (changed) {
      await persistModuleMarkers([...nextMarkers]);
    }
  }, [user, level, availableModules, moduleMarkers, getPendingReviewCountForModule, persistModuleMarkers]);

  useEffect(() => {
    void syncCompletedModules();
  }, [syncCompletedModules]);

  const handleTabChange = (value: string) => setActiveTab(value);

  if (!level) return (
    <AppLayout>
      <div className="p-8 text-center text-muted-foreground">Načítání...</div>
    </AppLayout>
  );

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
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-1.5">
              <span className="hidden sm:inline">Přehled</span>
              <span className="sm:hidden text-xs">📋</span>
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-1.5 relative">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Kvíz</span>
              {completedModules.has('quiz') && <CheckCircle className="h-3 w-3 text-success absolute -top-1 -right-1" />}
            </TabsTrigger>
            <TabsTrigger value="fillin" className="flex items-center gap-1.5 relative">
              <PenLine className="h-4 w-4" />
              <span className="hidden sm:inline">Doplňování</span>
              {completedModules.has('fillin') && <CheckCircle className="h-3 w-3 text-success absolute -top-1 -right-1" />}
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Test</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className={`shadow-card cursor-pointer hover:shadow-elevated transition-all ${completedModules.has('quiz') ? 'ring-2 ring-success/30' : ''}`} onClick={() => setActiveTab('quiz')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    {completedModules.has('quiz') && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center ring-2 ring-background">
                        <CheckCircle className="h-3.5 w-3.5 text-success-foreground" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Kvíz</h3>
                    <p className="text-sm text-muted-foreground">{quizQuestions.length} otázek</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={`shadow-card cursor-pointer hover:shadow-elevated transition-all ${completedModules.has('fillin') ? 'ring-2 ring-success/30' : ''}`} onClick={() => setActiveTab('fillin')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                      <PenLine className="h-6 w-6 text-primary" />
                    </div>
                    {completedModules.has('fillin') && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center ring-2 ring-background">
                        <CheckCircle className="h-3.5 w-3.5 text-success-foreground" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Doplňování</h3>
                    <p className="text-sm text-muted-foreground">{fillBlankQuestions.length} otázek</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={`shadow-card cursor-pointer hover:shadow-elevated transition-all ${progress?.completed ? 'ring-2 ring-success/30' : ''}`} onClick={() => setActiveTab('test')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                      <ClipboardCheck className="h-6 w-6 text-primary" />
                    </div>
                    {progress?.completed && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center ring-2 ring-background">
                        <CheckCircle className="h-3.5 w-3.5 text-success-foreground" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">Závěrečný test</h3>
                    {progress?.completed ? (
                      <p className="text-sm text-muted-foreground">Výsledek: {progress.test_score}%</p>
                    ) : progress?.test_score !== null && progress?.test_score !== undefined ? (
                      <p className="text-sm text-muted-foreground">Poslední pokus: {progress.test_score}% — zkuste znovu</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Připraven k testu</p>
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

            {progress?.completed && (
              <Card className="shadow-elevated mt-4 border-success/30">
                <CardContent className="p-6 text-center space-y-3">
                  <Trophy className="h-8 w-8 mx-auto text-success" />
                  <h3 className="font-bold text-lg">Level dokončen! 🎉</h3>
                  <p className="text-muted-foreground">Výsledek testu: <span className="font-bold text-success">{progress.test_score}%</span></p>
                  {level.group_id && (
                    <Button onClick={() => navigate(`${basePath}/group/${level.group_id}/test`)} className="gradient-primary text-primary-foreground">
                      Závěrečný test skupiny
                    </Button>
                  )}
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
              <QuizModule questions={quizQuestions} levelId={level.id} onComplete={() => finalizeModule('quiz')} onReviewItemsChange={refreshReviewCount} />
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Žádné kvízové otázky v tomto levelu.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="fillin" className="mt-6">
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('overview')}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Zpět na přehled
              </Button>
            </div>
            {fillBlankQuestions.length > 0 ? (
              <FillInBlankModule questions={fillBlankQuestions} onComplete={() => finalizeModule('fillin')} onReviewItemsChange={refreshReviewCount} />
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
              levelId={level.id}
              passingScore={level.passing_score}
              basePath={basePath}
              existingProgress={progress}
              onProgressChange={setProgress}
              onPassedWithDiploma={async (nextProgress) => {
                setProgress(nextProgress);
                if (level.group_id) {
                  toast({
                    title: 'Level dokončen! 🎉',
                    description: 'Po dokončení všech levelů ve skupině můžete absolvovat závěrečný test skupiny a získat diplom.',
                  });
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
