import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users, BookOpen, Shield, Share2, GraduationCap } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

interface Level {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  passing_score: number;
}

interface Question {
  id: string;
  level_id: string;
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

interface UserProfile {
  user_id: string;
  display_name: string;
  total_points: number;
  current_level: number;
  created_at: string;
  email?: string;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [levels, setLevels] = useState<Level[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  // Level form
  const [levelForm, setLevelForm] = useState({ title: '', description: '', order_index: 1, passing_score: 70 });
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [showLevelDialog, setShowLevelDialog] = useState(false);

  // Question form
  const [qForm, setQForm] = useState({
    type: 'quiz' as string,
    question_text: '',
    option_1: '',
    option_2: '',
    option_3: '',
    option_4: '',
    correct_answer: 1,
    back_text: '',
    order_index: 0,
  });
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);

  useEffect(() => {
    fetchLevels();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedLevel) fetchQuestions(selectedLevel);
  }, [selectedLevel]);

  const fetchLevels = async () => {
    const { data } = await supabase.from('levels').select('*').order('order_index');
    if (data) {
      setLevels(data);
      if (!selectedLevel && data.length > 0) setSelectedLevel(data[0].id);
    }
  };

  const fetchQuestions = async (levelId: string) => {
    const { data } = await supabase.from('questions').select('*').eq('level_id', levelId).order('order_index');
    if (data) setQuestions(data);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
  };

  const saveLevel = async () => {
    if (editingLevel) {
      await supabase.from('levels').update(levelForm).eq('id', editingLevel);
    } else {
      await supabase.from('levels').insert(levelForm);
    }
    setShowLevelDialog(false);
    setEditingLevel(null);
    setLevelForm({ title: '', description: '', order_index: levels.length + 1, passing_score: 70 });
    fetchLevels();
    toast({ title: 'Uloženo' });
  };

  const deleteLevel = async (id: string) => {
    await supabase.from('levels').delete().eq('id', id);
    fetchLevels();
    if (selectedLevel === id) setSelectedLevel(null);
    toast({ title: 'Level smazán' });
  };

  const editLevel = (level: Level) => {
    setLevelForm({ title: level.title, description: level.description || '', order_index: level.order_index, passing_score: level.passing_score });
    setEditingLevel(level.id);
    setShowLevelDialog(true);
  };

  const saveQuestion = async () => {
    if (!selectedLevel) return;
    const payload = {
      ...qForm,
      level_id: selectedLevel,
      option_1: qForm.type === 'quiz' ? qForm.option_1 : null,
      option_2: qForm.type === 'quiz' ? qForm.option_2 : null,
      option_3: qForm.type === 'quiz' ? qForm.option_3 : null,
      option_4: qForm.type === 'quiz' ? qForm.option_4 : null,
      correct_answer: qForm.type === 'quiz' ? qForm.correct_answer : null,
      back_text: qForm.type === 'flashcard' ? qForm.back_text : null,
    };

    if (editingQuestion) {
      await supabase.from('questions').update(payload).eq('id', editingQuestion);
    } else {
      await supabase.from('questions').insert(payload);
    }
    setShowQuestionDialog(false);
    setEditingQuestion(null);
    resetQForm();
    fetchQuestions(selectedLevel);
    toast({ title: 'Uloženo' });
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from('questions').delete().eq('id', id);
    if (selectedLevel) fetchQuestions(selectedLevel);
    toast({ title: 'Otázka smazána' });
  };

  const editQuestion = (q: Question) => {
    setQForm({
      type: q.type,
      question_text: q.question_text,
      option_1: q.option_1 || '',
      option_2: q.option_2 || '',
      option_3: q.option_3 || '',
      option_4: q.option_4 || '',
      correct_answer: q.correct_answer || 1,
      back_text: q.back_text || '',
      order_index: q.order_index,
    });
    setEditingQuestion(q.id);
    setShowQuestionDialog(true);
  };

  const resetQForm = () => {
    setQForm({ type: 'quiz', question_text: '', option_1: '', option_2: '', option_3: '', option_4: '', correct_answer: 1, back_text: '', order_index: questions.length });
  };

  const toggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (isCurrentlyAdmin) {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
    } else {
      await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
    }
    toast({ title: isCurrentlyAdmin ? 'Admin role odebrána' : 'Admin role přidělena' });
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-slide-up pb-20">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Administrace
          </h1>
          <Link to="/admin/share">
            <Button variant="outline" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" /> Sdílení & Pozvánky
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content"><BookOpen className="mr-1 h-4 w-4" /> Obsah</TabsTrigger>
            <TabsTrigger value="users"><Users className="mr-1 h-4 w-4" /> Uživatelé</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-6 space-y-6">
            {/* Levels */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Levely</h2>
              <Dialog open={showLevelDialog} onOpenChange={setShowLevelDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => { setEditingLevel(null); setLevelForm({ title: '', description: '', order_index: levels.length + 1, passing_score: 70 }); }}>
                    <Plus className="mr-1 h-4 w-4" /> Přidat level
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingLevel ? 'Upravit level' : 'Nový level'}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Název" value={levelForm.title} onChange={e => setLevelForm({ ...levelForm, title: e.target.value })} />
                    <Textarea placeholder="Popis" value={levelForm.description} onChange={e => setLevelForm({ ...levelForm, description: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Pořadí</label>
                        <Input type="number" value={levelForm.order_index} onChange={e => setLevelForm({ ...levelForm, order_index: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Skóre pro postup (%)</label>
                        <Input type="number" value={levelForm.passing_score} onChange={e => setLevelForm({ ...levelForm, passing_score: parseInt(e.target.value) || 70 })} />
                      </div>
                    </div>
                    <Button onClick={saveLevel} className="w-full gradient-primary text-primary-foreground">Uložit</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex gap-2 flex-wrap">
              {levels.map(level => (
                <div key={level.id} className="flex items-center gap-1">
                  <Button
                    variant={selectedLevel === level.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedLevel(level.id)}
                    className={selectedLevel === level.id ? 'gradient-primary text-primary-foreground' : ''}
                  >
                    {level.order_index}. {level.title}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editLevel(level)}><Edit className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteLevel(level.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>

            {/* Questions */}
            {selectedLevel && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Otázky & Kartičky</h2>
                  <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => { setEditingQuestion(null); resetQForm(); }}>
                        <Plus className="mr-1 h-4 w-4" /> Přidat
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>{editingQuestion ? 'Upravit' : 'Nová otázka/kartička'}</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <Select value={qForm.type} onValueChange={v => setQForm({ ...qForm, type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="quiz">Kvíz</SelectItem>
                            <SelectItem value="flashcard">Kartička</SelectItem>
                          </SelectContent>
                        </Select>
                        <Textarea placeholder="Text otázky" value={qForm.question_text} onChange={e => setQForm({ ...qForm, question_text: e.target.value })} />
                        {qForm.type === 'quiz' && (
                          <>
                            <Input placeholder="Možnost 1" value={qForm.option_1} onChange={e => setQForm({ ...qForm, option_1: e.target.value })} />
                            <Input placeholder="Možnost 2" value={qForm.option_2} onChange={e => setQForm({ ...qForm, option_2: e.target.value })} />
                            <Input placeholder="Možnost 3" value={qForm.option_3} onChange={e => setQForm({ ...qForm, option_3: e.target.value })} />
                            <Input placeholder="Možnost 4" value={qForm.option_4} onChange={e => setQForm({ ...qForm, option_4: e.target.value })} />
                            <Select value={String(qForm.correct_answer)} onValueChange={v => setQForm({ ...qForm, correct_answer: parseInt(v) })}>
                              <SelectTrigger><SelectValue placeholder="Správná odpověď" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Možnost 1</SelectItem>
                                <SelectItem value="2">Možnost 2</SelectItem>
                                <SelectItem value="3">Možnost 3</SelectItem>
                                <SelectItem value="4">Možnost 4</SelectItem>
                              </SelectContent>
                            </Select>
                          </>
                        )}
                        {qForm.type === 'flashcard' && (
                          <Textarea placeholder="Text zadní strany" value={qForm.back_text} onChange={e => setQForm({ ...qForm, back_text: e.target.value })} />
                        )}
                        <Input type="number" placeholder="Pořadí" value={qForm.order_index} onChange={e => setQForm({ ...qForm, order_index: parseInt(e.target.value) || 0 })} />
                        <Button onClick={saveQuestion} className="w-full gradient-primary text-primary-foreground">Uložit</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {questions.map(q => (
                    <Card key={q.id} className="shadow-card">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{q.type === 'quiz' ? 'Kvíz' : 'Kartička'}</Badge>
                            <span className="text-xs text-muted-foreground">#{q.order_index}</span>
                          </div>
                          <p className="mt-1 font-medium">{q.question_text}</p>
                          {q.type === 'quiz' && (
                            <p className="text-xs text-success mt-1">Správně: {[q.option_1, q.option_2, q.option_3, q.option_4][(q.correct_answer || 1) - 1]}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => editQuestion(q)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {questions.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">Žádné otázky v tomto levelu.</p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <div className="space-y-3">
              {users.map(u => (
                <Card key={u.user_id} className="shadow-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{u.display_name}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Body: {u.total_points}</span>
                          <span>Level: {u.current_level}</span>
                          <span>Registrace: {new Date(u.created_at).toLocaleDateString('cs')}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toggleAdmin(u.user_id, false)}>
                      <Shield className="mr-1 h-3 w-3" /> Přidat admin
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
