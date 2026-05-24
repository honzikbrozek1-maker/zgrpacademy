import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useAppPath } from '@/lib/pathContext';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/AppLayout';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, Trophy, AlertTriangle, Loader2, GraduationCap, XCircle, ListChecks } from 'lucide-react';

interface TestItem {
  id: string;
  type: string;
  question_text: string;
  options: string[];
}

interface GroupInfo {
  id: string;
  title: string;
  final_test_passing_score: number;
}

export default function GroupFinalTest() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { basePath } = useAppPath();
  const { toast } = useToast();

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [items, setItems] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [passed, setPassed] = useState(false);
  const [perQuestion, setPerQuestion] = useState<Array<{ question_id: string; question_text: string; correct: boolean; user_answer: string | null; correct_answer: string }>>([]);
  const [showReview, setShowReview] = useState(false);
  const [eligibility, setEligibility] = useState<{ ok: boolean; reason?: string }>({ ok: true });

  useEffect(() => {
    if (!groupId || !user) return;
    (async () => {
      setLoading(true);
      const { data: g } = await supabase
        .from('level_groups')
        .select('id, title, final_test_passing_score')
        .eq('id', groupId)
        .maybeSingle();
      if (!g) {
        navigate(`${basePath}/levels`, { replace: true });
        return;
      }
      setGroup(g as GroupInfo);

      // Check eligibility: all levels in group must be passed
      const { data: levels } = await supabase.from('levels').select('id').eq('group_id', groupId);
      const ids = (levels || []).map(l => l.id);
      if (ids.length === 0) {
        setEligibility({ ok: false, reason: 'no_levels' });
      } else {
        const { data: progs } = await supabase
          .from('user_progress')
          .select('level_id, completed')
          .eq('user_id', user.id)
          .in('level_id', ids);
        const passedIds = new Set((progs || []).filter(p => p.completed).map(p => p.level_id));
        const allPassed = ids.every(id => passedIds.has(id));
        setEligibility({ ok: allPassed, reason: allPassed ? undefined : 'levels_incomplete' });
      }
      setLoading(false);
    })();
  }, [groupId, user, basePath, navigate]);

  const startTest = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_group_test', { p_group_id: groupId });
      if (error) throw error;
      const list = (data as unknown as TestItem[]) || [];
      if (list.length === 0) {
        toast({ title: 'Test není připraven', description: 'Pro tuto skupinu zatím nejsou žádné otázky závěrečného testu.', variant: 'destructive' });
        return;
      }
      setItems(list);
      setAnswers({});
      setCurrentIndex(0);
      setFinished(false);
      setScore(null);
      setStarted(true);
    } catch (e: any) {
      toast({ title: 'Chyba', description: e.message || 'Nepodařilo se načíst test', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const item = items[currentIndex];
  const progressPct = items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0;

  const handleSelect = (txt: string) => setAnswers(a => ({ ...a, [currentIndex]: txt }));

  const handleSubmit = async () => {
    if (!groupId) return;
    setSubmitting(true);
    try {
      const payload = items.map((q, i) => ({ question_id: q.id, answer_text: answers[i] ?? '' }));
      const { data, error } = await supabase.rpc('complete_group_test_v2', {
        p_group_id: groupId,
        p_answers: payload,
      });
      if (error) throw error;
      const res = data as { score: number; passed: boolean; per_question?: typeof perQuestion };
      setScore(res?.score ?? 0);
      setPassed(Boolean(res?.passed));
      setPerQuestion(Array.isArray(res?.per_question) ? res!.per_question! : []);
      setShowReview(false);
      setFinished(true);

      if (res?.passed) {
        await supabase.rpc('issue_diploma_if_eligible', { p_group_id: groupId });
        toast({ title: '🎓 Získali jste diplom!', description: 'Diplom najdete v sekci Moje diplomy.' });
      }
    } catch (e: any) {
      toast({ title: 'Chyba', description: e.message || 'Nepodařilo se odeslat test', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <AppLayout><div className="p-8 text-center text-muted-foreground">Načítání...</div></AppLayout>;
  }

  if (!eligibility.ok) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/levels`)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Zpět na levely
          </Button>
          <Card className="shadow-elevated">
            <CardContent className="p-8 text-center space-y-3">
              <AlertTriangle className="h-10 w-10 mx-auto text-warning" />
              <h2 className="text-xl font-bold">Závěrečný test skupiny ještě není dostupný</h2>
              <p className="text-muted-foreground">Nejprve úspěšně dokončete závěrečný test ve všech levelech této skupiny.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (finished && score !== null) {
    const wrongCount = perQuestion.filter(p => !p.correct).length;
    return (
      <AppLayout>
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4 pb-20">
          <Card className="shadow-elevated">
            <CardContent className="p-8 text-center space-y-4">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${passed ? 'bg-success/20' : 'bg-destructive/20'}`}>
                {passed ? <GraduationCap className="h-8 w-8 text-success" /> : <AlertTriangle className="h-8 w-8 text-destructive" />}
              </div>
              <h2 className="text-2xl font-bold">{passed ? 'Gratulujeme — diplom je váš! 🎓' : 'Bohužel neprošlo'}</h2>
              <p className="text-3xl font-extrabold text-primary">{score}%</p>
              <p className="text-muted-foreground">
                {passed
                  ? 'Úspěšně jste dokončili celou skupinu. Diplom najdete v sekci Moje diplomy.'
                  : `Pro splnění potřebujete alespoň ${group?.final_test_passing_score}%. Můžete to zkusit znovu.`}
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Button variant="outline" onClick={() => navigate(`${basePath}/levels`)}>
                  Zpět na levely
                </Button>
                {perQuestion.length > 0 && (
                  <Button variant="outline" onClick={() => setShowReview(s => !s)}>
                    <ListChecks className="mr-1 h-4 w-4" />
                    {showReview ? 'Skrýt odpovědi' : 'Zobrazit odpovědi'}
                  </Button>
                )}
                {passed ? (
                  <Button onClick={() => navigate(`${basePath}/diplomas`)} className="gradient-primary text-primary-foreground">
                    Moje diplomy
                  </Button>
                ) : (
                  <Button onClick={() => { setStarted(false); setFinished(false); setAnswers({}); setCurrentIndex(0); setScore(null); setPerQuestion([]); setShowReview(false); }} className="gradient-primary text-primary-foreground">
                    Zkusit znovu
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {showReview && perQuestion.length > 0 && (
            <Card className="shadow-card">
              <CardContent className="p-4 md:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Vaše odpovědi</h3>
                  <span className="text-sm text-muted-foreground">
                    {perQuestion.length - wrongCount} / {perQuestion.length} správně
                  </span>
                </div>
                <div className="space-y-3">
                  {perQuestion.map((p, i) => (
                    <div
                      key={p.question_id}
                      className={`rounded-xl border-2 p-3 md:p-4 ${p.correct ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5'}`}
                    >
                      <div className="flex items-start gap-2">
                        {p.correct
                          ? <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                          : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm md:text-base mb-2">
                            <span className="text-muted-foreground mr-1">{i + 1}.</span>
                            {p.question_text}
                          </p>
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="text-muted-foreground">Vaše odpověď: </span>
                              <span className={p.correct ? 'text-success font-medium' : 'text-destructive font-medium'}>
                                {p.user_answer || <em className="text-muted-foreground">— bez odpovědi —</em>}
                              </span>
                            </div>
                            {!p.correct && (
                              <div>
                                <span className="text-muted-foreground">Správná odpověď: </span>
                                <span className="text-success font-medium">{p.correct_answer}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>
    );
  }

  if (!started) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/levels`)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Zpět na levely
          </Button>
          <Card className="shadow-elevated">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center">
                <Trophy className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold">Závěrečný test skupiny</h2>
              <p className="text-muted-foreground">{group?.title}</p>
              <p className="text-sm text-muted-foreground">
                Pro získání diplomu potřebujete alespoň <strong>{group?.final_test_passing_score}%</strong> správných odpovědí.
              </p>
              <Button onClick={startTest} className="gradient-primary text-primary-foreground">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Načítám...</> : <>Začít test <ArrowRight className="ml-1 h-4 w-4" /></>}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!item) return null;

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto w-full">
        <div className="px-4 md:px-6 pt-4 pb-3 border-b bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(`${basePath}/levels`)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Zpět
            </Button>
            <div className="flex-1" />
            <span className="text-sm font-medium tabular-nums">{currentIndex + 1}/{items.length}</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
          <Card className="shadow-card">
            <CardContent className="p-5 md:p-6 space-y-5">
              <h3 className="text-lg md:text-xl font-semibold leading-snug">{item.question_text}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {item.options.map((opt, i) => {
                  const isSelected = answers[currentIndex] === opt;
                  return (
                    <button
                      key={i}
                      className={`border-2 p-4 rounded-xl cursor-pointer transition-all text-left w-full ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      onClick={() => handleSelect(opt)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {isSelected && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between gap-3 px-4 md:px-6 py-3 border-t bg-background sticky bottom-0">
          <Button variant="outline" onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Předchozí
          </Button>
          {currentIndex < items.length - 1 ? (
            <Button onClick={() => setCurrentIndex(i => i + 1)} disabled={!answers[currentIndex]} className="gradient-primary text-primary-foreground">
              Další <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < items.length || submitting}
              className="gradient-primary text-primary-foreground"
            >
              {submitting ? 'Odesílání...' : 'Odevzdat test'}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
