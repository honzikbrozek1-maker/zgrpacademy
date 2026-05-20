import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useAppPath } from '@/lib/pathContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users, BookOpen, Shield, Send, ArrowLeft, ArrowRight, CheckCircle, XCircle, Clock, Search, ChevronDown, GripVertical, Sparkles, Loader2, GraduationCap } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import AdminGroupsTab from '@/components/AdminGroupsTab';
import { NumberField } from '@/components/NumberField';

interface Level {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  passing_score: number;
  category: string;
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
  wrong_option_1: string | null;
  wrong_option_2: string | null;
  wrong_option_3: string | null;
  order_index: number;
  in_level_test: boolean;
  in_practice: boolean;
}

interface UserProfile {
  user_id: string;
  display_name: string;
  created_at: string;
}

interface AdminRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
}

export default function AdminPanel() {
  const { user, isAdmin } = useAuth();
  const { category } = useAppPath();
  const { toast } = useToast();
  const [levels, setLevels] = useState<Level[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const [myRequest, setMyRequest] = useState<AdminRequest | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [showDeleteUser, setShowDeleteUser] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ quiz: true, flashcard: true, fill_blank: true });
  const [adminList, setAdminList] = useState<{ user_id: string; display_name: string }[]>([]);
  const [selectedTargetAdmin, setSelectedTargetAdmin] = useState<string | null>(null);

  const [levelForm, setLevelForm] = useState({ title: '', description: '', order_index: 1, passing_score: 70, category });
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [showLevelDialog, setShowLevelDialog] = useState(false);

  const [addStep, setAddStep] = useState<'pick_type' | 'pick_test_format' | 'edit'>('pick_type');
  const [qForm, setQForm] = useState({
    type: 'quiz' as string,
    question_text: '',
    option_1: '', option_2: '', option_3: '', option_4: '',
    correct_answer: 1,
    back_text: '',
    wrong_option_1: '', wrong_option_2: '', wrong_option_3: '',
    order_index: 0,
    in_practice: true,
  });
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);

  // Fill-blank: cursor position for blank insertion
  const sentenceRef = useRef<HTMLTextAreaElement>(null);
  const [blankInserted, setBlankInserted] = useState(false);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // AI generation state
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiTypes, setAiTypes] = useState<string[]>(['quiz', 'fill_blank']);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<any[] | null>(null);
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set());
  const [aiCount, setAiCount] = useState<number>(15);
  const [aiProgress, setAiProgress] = useState<{ done: number; total: number } | null>(null);
  const [aiForTest, setAiForTest] = useState(false);
  const [aiQuizCount, setAiQuizCount] = useState<number>(5);
  const [aiFillCount, setAiFillCount] = useState<number>(5);
  const [aiSourceMode, setAiSourceMode] = useState<'new_only' | 'new_plus_existing'>('new_plus_existing');

  useEffect(() => {
    fetchLevels();
    if (isAdmin) {
      fetchUsers();
      fetchAdminRequests();
      fetchInvitedUsers();
    } else if (user) {
      fetchMyRequest();
      fetchAdminList();
    }
  }, [isAdmin, user, category]);

  useEffect(() => {
    if (selectedLevel) fetchQuestions(selectedLevel.id);
  }, [selectedLevel]);

  const fetchLevels = async () => {
    const { data } = await supabase.from('levels').select('*').eq('category', category).order('order_index');
    if (data) setLevels(data);
  };

  const fetchAdminList = async () => {
    const { data } = await supabase.rpc('list_admins');
    if (data) setAdminList(data);
  };

  const fetchQuestions = async (levelId: string) => {
    const { data } = await supabase.from('questions').select('*').eq('level_id', levelId).order('order_index');
    if (data) setQuestions(data);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('display_name');
    if (data) setUsers(data);
  };

  const fetchInvitedUsers = async () => {
    if (!user) return;
    const { data } = await supabase.from('invite_links').select('used_by').eq('created_by', user.id).not('used_by', 'is', null);
    if (data) setInvitedUserIds(data.map(d => d.used_by!).filter(Boolean));
  };

  const fetchAdminRequests = async () => {
    const { data } = await supabase.from('admin_requests').select('*').eq('status', 'pending').order('created_at');
    if (data) setAdminRequests(data);
  };

  const fetchMyRequest = async () => {
    if (!user) return;
    const { data } = await supabase.from('admin_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
    if (data && data.length > 0) setMyRequest(data[0]);
  };

  const sendAdminRequest = async () => {
    if (!user || !selectedTargetAdmin) {
      toast({ title: 'Chyba', description: 'Vyberte admina, kterému chcete poslat žádost.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('admin_requests').insert({ user_id: user.id, target_admin_id: selectedTargetAdmin });
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Žádost odeslána' });
      fetchMyRequest();
    }
  };

  const handleAdminRequest = async (requestId: string, _userId: string, approve: boolean) => {
    if (!user) return;
    const { error } = await supabase.rpc('handle_admin_request', { p_request_id: requestId, p_approve: approve });
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: approve ? 'Žádost schválena' : 'Žádost zamítnuta' });
    fetchAdminRequests();
  };

  const saveLevel = async () => {
    const payload = { ...levelForm, category };
    if (editingLevel) {
      await supabase.from('levels').update(payload).eq('id', editingLevel);
    } else {
      await supabase.from('levels').insert(payload);
    }
    setShowLevelDialog(false);
    setEditingLevel(null);
    setLevelForm({ title: '', description: '', order_index: levels.length + 1, passing_score: 70, category });
    fetchLevels();
    toast({ title: 'Uloženo' });
  };

  const deleteLevel = async (id: string) => {
    await supabase.from('levels').delete().eq('id', id);
    fetchLevels();
    if (selectedLevel?.id === id) setSelectedLevel(null);
    toast({ title: 'Level smazán' });
  };

  const editLevel = (level: Level) => {
    setLevelForm({ title: level.title, description: level.description || '', order_index: level.order_index, passing_score: level.passing_score, category: level.category });
    setEditingLevel(level.id);
    setShowLevelDialog(true);
  };

  const saveQuestion = async () => {
    if (!selectedLevel) return;
    const needsOptions = qForm.type === 'quiz' || qForm.type === 'fill_blank';
    const isFlashcard = qForm.type === 'flashcard';
    const payload = {
      ...qForm,
      level_id: selectedLevel.id,
      option_1: needsOptions ? qForm.option_1 : null,
      option_2: needsOptions ? qForm.option_2 : null,
      option_3: needsOptions ? qForm.option_3 : null,
      option_4: needsOptions ? qForm.option_4 : null,
      correct_answer: (qForm.type === 'quiz' || qForm.type === 'fill_blank') ? qForm.correct_answer : null,
      back_text: (qForm.type === 'flashcard' || qForm.type === 'fill_blank') ? qForm.back_text : null,
      wrong_option_1: isFlashcard ? (qForm.wrong_option_1 || null) : null,
      wrong_option_2: isFlashcard ? (qForm.wrong_option_2 || null) : null,
      wrong_option_3: isFlashcard ? (qForm.wrong_option_3 || null) : null,
      in_practice: qForm.in_practice,
    };
    if (editingQuestion) {
      await supabase.from('questions').update(payload).eq('id', editingQuestion);
    } else {
      await supabase.from('questions').insert(payload);
    }
    setShowQuestionDialog(false);
    setEditingQuestion(null);
    setAddStep('pick_type');
    setBlankInserted(false);
    resetQForm();
    fetchQuestions(selectedLevel.id);
    toast({ title: 'Uloženo' });
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from('questions').delete().eq('id', id);
    if (selectedLevel) fetchQuestions(selectedLevel.id);
    toast({ title: 'Otázka smazána' });
  };

  const toggleInLevelTest = async (q: Question, value: boolean) => {
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, in_level_test: value } : x));
    const { error } = await supabase.from('questions').update({ in_level_test: value }).eq('id', q.id);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      if (selectedLevel) fetchQuestions(selectedLevel.id);
    }
  };

  const editQuestion = (q: Question) => {
    setQForm({
      type: q.type,
      question_text: q.question_text,
      option_1: q.option_1 || '', option_2: q.option_2 || '',
      option_3: q.option_3 || '', option_4: q.option_4 || '',
      correct_answer: q.correct_answer || 1,
      back_text: q.back_text || '',
      wrong_option_1: q.wrong_option_1 || '',
      wrong_option_2: q.wrong_option_2 || '',
      wrong_option_3: q.wrong_option_3 || '',
      order_index: q.order_index,
      in_practice: q.in_practice !== false,
    });
    setEditingQuestion(q.id);
    setAddStep('edit');
    setBlankInserted(q.type === 'fill_blank' && (q.back_text || '').includes('______'));
    setShowQuestionDialog(true);
  };

  const resetQForm = () => {
    setQForm({ type: 'quiz', question_text: '', option_1: '', option_2: '', option_3: '', option_4: '', correct_answer: 1, back_text: '', wrong_option_1: '', wrong_option_2: '', wrong_option_3: '', order_index: questions.length, in_practice: true });
    setBlankInserted(false);
  };

  const resetAiDialog = () => {
    setAiResults(null);
    setAiSelected(new Set());
    setAiText('');
    setAiLoading(false);
    setAiProgress(null);
    setAiForTest(false);
    setAiTypes(['quiz', 'fill_blank']);
    setAiCount(15);
    setAiQuizCount(5);
    setAiFillCount(5);
    setAiSourceMode('new_plus_existing');
  };

  const openAiGenerator = (options?: { forTest?: boolean }) => {
    resetAiDialog();
    if (options?.forTest) {
      setAiForTest(true);
    }
    setShowAiDialog(true);
  };

  const toggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (isCurrentlyAdmin) {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
    } else {
      await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
    }
    toast({ title: isCurrentlyAdmin ? 'Admin role odebrána' : 'Admin role přidělena' });
  };

  const deleteUser = async (userId: string) => {
    await supabase.from('review_items').delete().eq('user_id', userId);
    await supabase.rpc('admin_reset_user_progress', { p_user_id: userId });
    await supabase.from('profiles').delete().eq('user_id', userId);
    await supabase.from('user_roles').delete().eq('user_id', userId);
    setShowDeleteUser(null);
    fetchUsers();
    toast({ title: 'Uživatel smazán' });
  };

  // Insert blank at cursor position
  const handleInsertBlank = () => {
    const textarea = sentenceRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = qForm.back_text;
    const newText = text.substring(0, start) + '______' + text.substring(end);
    setQForm({ ...qForm, back_text: newText });
    setBlankInserted(true);
  };

  // Drag & drop reorder
  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverId(id); };
  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null); };
  const handleDrop = async (targetId: string, type: string) => {
    if (!draggedId || draggedId === targetId || !selectedLevel) return;
    const typeQuestions = questions.filter(q => q.type === type);
    const dragIdx = typeQuestions.findIndex(q => q.id === draggedId);
    const dropIdx = typeQuestions.findIndex(q => q.id === targetId);
    if (dragIdx === -1 || dropIdx === -1) return;

    const reordered = [...typeQuestions];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);

    const updates = reordered.map((q, i) => supabase.from('questions').update({ order_index: i }).eq('id', q.id));
    await Promise.all(updates);
    fetchQuestions(selectedLevel.id);
    setDraggedId(null);
    setDragOverId(null);
  };

  const generateWithAi = async () => {
    if (!aiText.trim() || !selectedLevel) return;
    // Build per-type targets
    const targets: { type: string; count: number }[] = aiForTest
      ? [
          { type: 'quiz', count: Math.min(Math.max(aiQuizCount || 0, 0), 100) },
          { type: 'fill_blank', count: Math.min(Math.max(aiFillCount || 0, 0), 100) },
        ].filter(t => t.count > 0)
      : aiTypes.length > 0
        ? [{ type: '__mixed__', count: Math.min(Math.max(aiCount || 1, 1), 100) }]
        : [];

    if (targets.length === 0) return;
    const grandTotal = targets.reduce((s, t) => s + t.count, 0);

    setAiLoading(true);
    setAiResults(null);
    const BATCH = 20;
    setAiProgress({ done: 0, total: grandTotal });
    const all: any[] = [];

    const sourceQuestions = questions.filter(q => q.in_practice !== false);
    const existingPracticeTexts = aiSourceMode === 'new_plus_existing'
      ? sourceQuestions.map(q => q.question_text)
      : [];
    const existingPracticeMaterials = aiSourceMode === 'new_plus_existing'
      ? sourceQuestions
          .map(q => {
            const correctOption = [q.option_1, q.option_2, q.option_3, q.option_4][(q.correct_answer || 1) - 1] || null;
            const detail = q.type === 'fill_blank'
              ? q.back_text
              : correctOption;
            return [q.question_text, detail].filter(Boolean).join(' | Správně: ');
          })
          .filter(Boolean)
      : [];

    try {
      for (const t of targets) {
        const typesForCall = t.type === '__mixed__' ? aiTypes : [t.type];
        let producedForType = 0;
        while (producedForType < t.count) {
          const remaining = t.count - producedForType;
          const batchSize = Math.min(BATCH, remaining);
          const { data, error } = await supabase.functions.invoke('generate-questions', {
            body: {
              text: aiText,
              level_id: selectedLevel.id,
              mode: aiForTest ? 'final_test' : 'practice',
              types: typesForCall,
              count: batchSize,
              existing_questions: [...existingPracticeTexts, ...all.map(q => q.question_text)],
              existing_material: existingPracticeMaterials,
              strict_source: aiSourceMode === 'new_only',
            },
          });
          if (error) {
            const ctx: any = (error as any).context;
            let msg = error.message || 'Chyba generování';
            if (ctx?.status === 429) msg = 'Příliš mnoho požadavků. Zkuste to za chvíli.';
            if (ctx?.status === 402) msg = 'AI kredit vyčerpán. Doplňte kredity v nastavení workspace.';
            throw new Error(msg);
          }
          if (data?.error) throw new Error(data.error);
          const batch = (data?.questions || []) as any[];
          if (batch.length === 0) break;
          all.push(...batch);
          producedForType += batch.length;
          setAiProgress({ done: Math.min(all.length, grandTotal), total: grandTotal });
          if (producedForType < t.count) await new Promise(r => setTimeout(r, 800));
        }
      }
      setAiResults(all);
      setAiSelected(new Set(all.map((_, i) => i)));
    } catch (e: any) {
      if (all.length > 0) {
        setAiResults(all);
        setAiSelected(new Set(all.map((_, i) => i)));
        toast({ title: 'Generování přerušeno', description: `${e.message}. Vygenerováno ${all.length} z ${grandTotal} otázek.`, variant: 'destructive' });
      } else {
        toast({ title: 'Chyba', description: e.message || 'Nepodařilo se vygenerovat otázky', variant: 'destructive' });
      }
    } finally {
      setAiLoading(false);
      setAiProgress(null);
    }
  };

  const saveAiQuestions = async () => {
    if (!selectedLevel || !aiResults) return;
    const toInsert = aiResults
      .filter((_, i) => aiSelected.has(i))
      .map((q, i) => ({
        level_id: selectedLevel.id,
        type: q.type,
        question_text: q.question_text,
        option_1: q.option_1 || null,
        option_2: q.option_2 || null,
        option_3: q.option_3 || null,
        option_4: q.option_4 || null,
        correct_answer: q.correct_answer || null,
        back_text: q.back_text || null,
        wrong_option_1: q.wrong_option_1 || null,
        wrong_option_2: q.wrong_option_2 || null,
        wrong_option_3: q.wrong_option_3 || null,
        order_index: questions.length + i,
        in_practice: !aiForTest,
      }));
    if (toInsert.length === 0) return;
    const { error } = await supabase.from('questions').insert(toInsert);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${toInsert.length} otázek přidáno` });
    setShowAiDialog(false);
    setAiResults(null);
    setAiText('');
    fetchQuestions(selectedLevel.id);
  };

  const toggleAiType = (type: string) => {
    setAiTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const toggleAiSelected = (index: number) => {
    setAiSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const filteredUsers = users.filter(u => {
    if (!userSearch) return true;
    const search = userSearch.toLowerCase();
    return u.display_name?.toLowerCase().includes(search);
  });

  const myInvitedUsers = filteredUsers.filter(u => invitedUserIds.includes(u.user_id));
  const otherUsers = filteredUsers.filter(u => !invitedUserIds.includes(u.user_id));

  // Non-admin view
  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 animate-slide-up">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Admin panel
          </h1>
          <Card className="shadow-card">
            <CardHeader><CardTitle>Nemáte administrátorská oprávnění</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Pokud potřebujete administrátorský přístup, můžete odeslat žádost administrátorovi.
              </p>
              {myRequest ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  {myRequest.status === 'pending' && <><Clock className="h-4 w-4 text-warning" /><span className="text-sm">Vaše žádost čeká na schválení...</span></>}
                  {myRequest.status === 'approved' && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-sm">Žádost schválena! Klikněte pro načtení oprávnění.</span>
                      <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Načíst oprávnění</Button>
                    </div>
                  )}
                  {myRequest.status === 'rejected' && <><XCircle className="h-4 w-4 text-destructive" /><span className="text-sm">Žádost byla zamítnuta.</span></>}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Vyberte admina, kterému chcete žádost poslat:</label>
                    <Select value={selectedTargetAdmin || ''} onValueChange={v => setSelectedTargetAdmin(v)}>
                      <SelectTrigger><SelectValue placeholder="Vyberte admina..." /></SelectTrigger>
                      <SelectContent>
                        {adminList.map(a => (
                          <SelectItem key={a.user_id} value={a.user_id}>{a.display_name || 'Admin'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" className="flex items-center gap-2" onClick={sendAdminRequest} disabled={!selectedTargetAdmin}>
                    <Send className="h-4 w-4" /> Požádat o admin přístup
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const renderUserCard = (u: UserProfile) => (
    <Card key={u.user_id} className="shadow-card">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{u.display_name || 'Bez jména'}</p>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>Registrace: {new Date(u.created_at).toLocaleDateString('cs')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => toggleAdmin(u.user_id, false)}>
            <Shield className="mr-1 h-3 w-3" /> Admin
          </Button>
          {showDeleteUser === u.user_id ? (
            <div className="flex items-center gap-1">
              <Button variant="destructive" size="sm" onClick={() => deleteUser(u.user_id)}>Potvrdit</Button>
              <Button variant="outline" size="sm" onClick={() => setShowDeleteUser(null)}>Zrušit</Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setShowDeleteUser(u.user_id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderQuestionForm = () => (
    <div className="space-y-4">
      {/* Type selector */}
      <div>
        <label className="text-sm font-medium mb-1 block">Typ</label>
        <Select value={qForm.type} onValueChange={v => { setQForm({ ...qForm, type: v }); setBlankInserted(false); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="quiz">🧠 Kvíz</SelectItem>
            <SelectItem value="fill_blank">✏️ Doplňování</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Common question text for quiz and flashcard */}
      {qForm.type !== 'fill_blank' && (
        <div>
          <label className="text-sm font-medium mb-1 block">
            {qForm.type === 'flashcard' ? 'Přední strana kartičky (otázka)' : 'Text otázky'}
          </label>
          <Textarea
            placeholder={qForm.type === 'flashcard' ? 'Co se zobrazí na přední straně kartičky?' : 'Napište otázku...'}
            value={qForm.question_text}
            onChange={e => setQForm({ ...qForm, question_text: e.target.value })}
          />
        </div>
      )}

      {qForm.type === 'quiz' && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Možnosti odpovědí</label>
            <Input placeholder="Možnost 1" value={qForm.option_1} onChange={e => setQForm({ ...qForm, option_1: e.target.value })} />
            <Input placeholder="Možnost 2" value={qForm.option_2} onChange={e => setQForm({ ...qForm, option_2: e.target.value })} />
            <Input placeholder="Možnost 3" value={qForm.option_3} onChange={e => setQForm({ ...qForm, option_3: e.target.value })} />
            <Input placeholder="Možnost 4" value={qForm.option_4} onChange={e => setQForm({ ...qForm, option_4: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Která možnost je správná?</label>
            <Select value={String(qForm.correct_answer)} onValueChange={v => setQForm({ ...qForm, correct_answer: parseInt(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Možnost 1</SelectItem>
                <SelectItem value="2">Možnost 2</SelectItem>
                <SelectItem value="3">Možnost 3</SelectItem>
                <SelectItem value="4">Možnost 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {qForm.type === 'flashcard' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Zadní strana kartičky (správná odpověď)</label>
            <Textarea
              placeholder="Co se zobrazí po otočení kartičky?"
              value={qForm.back_text}
              onChange={e => setQForm({ ...qForm, back_text: e.target.value })}
            />
          </div>
          <div className="space-y-2 p-3 rounded-lg border border-dashed border-border bg-muted/30">
            <label className="text-sm font-medium block">Špatné možnosti pro závěrečný test</label>
            <p className="text-xs text-muted-foreground">
              V testu se kartička zobrazí jako kvíz se 4 možnostmi. Vyplňte 3 nesprávné odpovědi. Bez nich nebude kartička v testu zařazena.
            </p>
            <Input
              placeholder="Špatná možnost 1"
              value={qForm.wrong_option_1}
              onChange={e => setQForm({ ...qForm, wrong_option_1: e.target.value })}
            />
            <Input
              placeholder="Špatná možnost 2"
              value={qForm.wrong_option_2}
              onChange={e => setQForm({ ...qForm, wrong_option_2: e.target.value })}
            />
            <Input
              placeholder="Špatná možnost 3"
              value={qForm.wrong_option_3}
              onChange={e => setQForm({ ...qForm, wrong_option_3: e.target.value })}
            />
          </div>
        </div>
      )}

      {qForm.type === 'fill_blank' && (
        <div className="space-y-4">
          {/* Step 1: Write the sentence */}
          <div>
            <label className="text-sm font-medium mb-1 block">1. Napište celou větu</label>
            <p className="text-xs text-muted-foreground mb-2">
              Napište celou větu i se slovem, které pak chcete vynechat. Např.: <em>„Hlavním městem České republiky je Praha."</em> V dalším kroku si v této větě označíte slovo, které se má vynechat.
            </p>
            <Textarea
              ref={sentenceRef}
              placeholder="Např.: Hlavním městem České republiky je Praha."
              value={qForm.back_text}
              onChange={e => { setQForm({ ...qForm, back_text: e.target.value }); if (!e.target.value.includes('______')) setBlankInserted(false); }}
            />
          </div>

          {/* Step 2: Insert blank button */}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleInsertBlank}
              disabled={!qForm.back_text || blankInserted}
            >
              {blankInserted ? '✅ Mezera vložena' : '📍 Vložit mezeru na pozici kurzoru'}
            </Button>
            {!blankInserted && qForm.back_text && (
              <p className="text-xs text-muted-foreground mt-1">
                Umístěte kurzor do věty tam, kde chcete vynechat slovo, a klikněte na tlačítko.
              </p>
            )}
            {blankInserted && (
              <p className="text-xs text-success mt-1">Mezera je označena jako „______" ve větě.</p>
            )}
          </div>

          {/* Preview */}
          {blankInserted && qForm.back_text.includes('______') && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-1">Náhled:</p>
              <p className="text-sm">
                {qForm.back_text.split('______').map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="font-bold text-primary px-1 bg-primary/10 rounded">______</span>}
                  </span>
                ))}
              </p>
            </div>
          )}

          {/* Hidden question_text = same as back_text for display */}
          <input type="hidden" value={qForm.back_text} />

          {/* Step 3: Answer options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">3. Možnosti odpovědí (min. 2, max. 4)</label>
            <div className="relative">
              <Input
                placeholder="Možnost 1"
                value={qForm.option_1}
                onChange={e => setQForm({ ...qForm, option_1: e.target.value })}
                className="pr-20"
              />
              {qForm.correct_answer === 1 && (
                <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-success/15 text-success text-[10px] border-0">správná</Badge>
              )}
            </div>
            <div className="relative">
              <Input
                placeholder="Možnost 2"
                value={qForm.option_2}
                onChange={e => setQForm({ ...qForm, option_2: e.target.value })}
                className="pr-20"
              />
              {qForm.correct_answer === 2 && (
                <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-success/15 text-success text-[10px] border-0">správná</Badge>
              )}
            </div>
            <div className="relative">
              <Input
                placeholder="Možnost 3 (volitelná)"
                value={qForm.option_3}
                onChange={e => setQForm({ ...qForm, option_3: e.target.value })}
                className="pr-20"
              />
              {qForm.correct_answer === 3 && (
                <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-success/15 text-success text-[10px] border-0">správná</Badge>
              )}
            </div>
            <div className="relative">
              <Input
                placeholder="Možnost 4 (volitelná)"
                value={qForm.option_4}
                onChange={e => setQForm({ ...qForm, option_4: e.target.value })}
                className="pr-20"
              />
              {qForm.correct_answer === 4 && (
                <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-success/15 text-success text-[10px] border-0">správná</Badge>
              )}
            </div>
          </div>

          {/* Step 4: Select correct answer */}
          <div>
            <label className="text-sm font-medium mb-1 block">4. Která možnost je správná?</label>
            <Select value={String(qForm.correct_answer)} onValueChange={v => setQForm({ ...qForm, correct_answer: parseInt(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Možnost 1</SelectItem>
                <SelectItem value="2">Možnost 2</SelectItem>
                {qForm.option_3 && <SelectItem value="3">Možnost 3</SelectItem>}
                {qForm.option_4 && <SelectItem value="4">Možnost 4</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Button onClick={() => {
        // For fill_blank, auto-set question_text from back_text
        if (qForm.type === 'fill_blank') {
          qForm.question_text = qForm.back_text;
        }
        saveQuestion();
      }} className="w-full">Uložit</Button>
    </div>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Administrace
        </h1>

        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content"><BookOpen className="mr-1 h-4 w-4" /> Obsah</TabsTrigger>
            <TabsTrigger value="groups"><GraduationCap className="mr-1 h-4 w-4" /> Skupiny & diplomy</TabsTrigger>
            <TabsTrigger value="users"><Users className="mr-1 h-4 w-4" /> Uživatelé</TabsTrigger>
            {adminRequests.length > 0 && (
              <TabsTrigger value="requests" className="relative">
                <Shield className="mr-1 h-4 w-4" /> Žádosti
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">{adminRequests.length}</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="content" className="mt-6 space-y-6">
            {selectedLevel ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLevel(null)}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> Zpět na levely
                  </Button>
                  <h2 className="text-lg font-semibold">{selectedLevel.order_index}. {selectedLevel.title}</h2>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm text-muted-foreground">
                    {questions.filter(q => q.type === 'quiz').length} kvízů, {questions.filter(q => q.type === 'fill_blank').length} doplňování
                  </p>
                  <div className="flex gap-2">
                    <Dialog open={showAiDialog} onOpenChange={(open) => { setShowAiDialog(open); if (!open) resetAiDialog(); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => openAiGenerator()}>
                          <Sparkles className="mr-1 h-4 w-4" /> AI generování
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" /> Generování otázek pomocí AI
                          </DialogTitle>
                        </DialogHeader>
                        {!aiResults ? (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-1 block">Vložte text nebo téma</label>
                              <Textarea
                                placeholder="Vložte text z učebnice, NotebookLM, poznámek nebo popište téma..."
                                value={aiText}
                                onChange={e => setAiText(e.target.value)}
                                rows={8}
                              />
                            </div>
                            <label className="flex items-center justify-between gap-2 p-3 rounded-lg border-2 border-border cursor-pointer">
                              <div>
                                <p className="text-sm font-medium flex items-center gap-1.5">🏁 Pro závěrečný test</p>
                                <p className="text-xs text-muted-foreground">Otázky se neobjeví v procvičování a budou cílené na závěrečný test.</p>
                              </div>
                              <Switch checked={aiForTest} onCheckedChange={setAiForTest} />
                            </label>
                            <div>
                              <label className="text-sm font-medium mb-2 block">Zdroj pro AI</label>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <button
                                  type="button"
                                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                                    aiSourceMode === 'new_only' ? 'border-primary bg-primary/10' : 'border-border'
                                  }`}
                                  onClick={() => setAiSourceMode('new_only')}
                                >
                                  <p className="text-sm font-medium">Jen nový vstup</p>
                                  <p className="text-xs text-muted-foreground">AI použije pouze text, který vložíte teď.</p>
                                </button>
                                <button
                                  type="button"
                                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                                    aiSourceMode === 'new_plus_existing' ? 'border-primary bg-primary/10' : 'border-border'
                                  }`}
                                  onClick={() => setAiSourceMode('new_plus_existing')}
                                >
                                  <p className="text-sm font-medium">Nový vstup + existující otázky</p>
                                  <p className="text-xs text-muted-foreground">AI může navázat i na již existující procvičovací otázky v tomto levelu.</p>
                                </button>
                              </div>
                            </div>
                            {!aiForTest ? (
                              <>
                                <div>
                                  <label className="text-sm font-medium mb-2 block">Typy otázek k vygenerování</label>
                                  <div className="flex gap-2 flex-wrap">
                                    {[
                                      { type: 'quiz', label: '🧠 Kvíz' },
                                      { type: 'fill_blank', label: '✏️ Doplňování' },
                                    ].map(opt => (
                                      <button
                                        key={opt.type}
                                        className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${
                                          aiTypes.includes(opt.type) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                                        }`}
                                        onClick={() => toggleAiType(opt.type)}
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium mb-1 block">Počet otázek (1–100)</label>
                                  <NumberField
                                    min={1}
                                    max={100}
                                    value={aiCount}
                                    onChange={v => setAiCount(v)}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Větší počty se generují postupně po dávkách (~20 otázek). Generování může trvat déle.
                                  </p>
                                </div>
                              </>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-sm font-medium mb-1 block">🧠 Kvízových</label>
                                  <NumberField min={0} max={100} value={aiQuizCount} onChange={v => setAiQuizCount(v)} />
                                </div>
                                <div>
                                  <label className="text-sm font-medium mb-1 block">✏️ Doplňovacích</label>
                                  <NumberField min={0} max={100} value={aiFillCount} onChange={v => setAiFillCount(v)} />
                                </div>
                              </div>
                            )}
                            <Button onClick={generateWithAi} disabled={aiLoading || !aiText.trim() || (aiForTest ? (aiQuizCount + aiFillCount === 0) : aiTypes.length === 0)} className="w-full">
                              {aiLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generuji {aiProgress ? `${aiProgress.done}/${aiProgress.total}` : ''}...</>
                              ) : (
                                <><Sparkles className="mr-2 h-4 w-4" /> Vygenerovat otázky</>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">Vygenerováno {aiResults.length} otázek. Vyberte které chcete přidat:</p>
                            <div className="flex gap-2 mb-2">
                              <Button variant="outline" size="sm" onClick={() => setAiSelected(new Set(aiResults.map((_, i) => i)))}>Vybrat vše</Button>
                              <Button variant="outline" size="sm" onClick={() => setAiSelected(new Set())}>Zrušit výběr</Button>
                            </div>
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                              {aiResults.map((q, i) => (
                                <div
                                  key={i}
                                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                    aiSelected.has(i) ? 'border-primary bg-primary/5' : 'border-border opacity-60'
                                  }`}
                                  onClick={() => toggleAiSelected(i)}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="text-[10px]">
                                      {q.type === 'quiz' ? '🧠 Kvíz' : q.type === 'flashcard' ? '📖 Kartička' : '✏️ Doplňování'}
                                    </Badge>
                                    {aiSelected.has(i) && <CheckCircle className="h-4 w-4 text-primary" />}
                                  </div>
                                  <p className="text-sm font-medium">{q.question_text}</p>
                                  {q.type === 'quiz' && (
                                    <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                                      {[q.option_1, q.option_2, q.option_3, q.option_4].filter(Boolean).map((opt, j) => (
                                        <p key={j} className={j + 1 === q.correct_answer ? 'text-success font-medium' : ''}>
                                          {j + 1}. {opt}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  {q.type === 'flashcard' && q.back_text && (
                                    <p className="text-xs text-muted-foreground mt-1">→ {q.back_text}</p>
                                  )}
                                  {q.type === 'fill_blank' && (
                                    <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                                      {[q.option_1, q.option_2, q.option_3, q.option_4].filter(Boolean).map((opt, j) => (
                                        <p key={j} className={j + 1 === q.correct_answer ? 'text-success font-medium' : ''}>
                                          {j + 1}. {opt}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setAiResults(null)} className="flex-1">
                                ← Zpět
                              </Button>
                              <Button onClick={saveAiQuestions} disabled={aiSelected.size === 0} className="flex-1">
                                <Plus className="mr-1 h-4 w-4" /> Přidat {aiSelected.size} otázek
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Dialog open={showQuestionDialog} onOpenChange={(open) => {
                      setShowQuestionDialog(open);
                      if (!open) { setAddStep('pick_type'); setEditingQuestion(null); setBlankInserted(false); }
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => { setEditingQuestion(null); resetQForm(); setAddStep('pick_type'); }}>
                          <Plus className="mr-1 h-4 w-4" /> Přidat
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {editingQuestion
                              ? 'Upravit otázku'
                              : addStep === 'pick_type'
                                ? 'Vyberte typ'
                                : addStep === 'pick_test_format'
                                  ? 'Formát otázky pro test'
                                  : 'Nová otázka'}
                          </DialogTitle>
                        </DialogHeader>
                        {!editingQuestion && addStep === 'pick_type' ? (
                          <div className="grid gap-3">
                            {[
                              { type: 'quiz', icon: '🧠', label: 'Kvíz', desc: 'Procvičování – otázka se 4 možnostmi' },
                              { type: 'fill_blank', icon: '✏️', label: 'Doplňování', desc: 'Procvičování – věta s vynechaným slovem' },
                            ].map(opt => (
                              <button
                                key={opt.type}
                                className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                                onClick={() => { setQForm({ ...qForm, type: opt.type, in_practice: true }); setAddStep('edit'); }}
                              >
                                <span className="text-2xl">{opt.icon}</span>
                                <div>
                                  <p className="font-medium">{opt.label}</p>
                                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                                </div>
                              </button>
                            ))}
                            <button
                              className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                              onClick={() => setAddStep('pick_test_format')}
                            >
                              <span className="text-2xl">🏁</span>
                              <div>
                                <p className="font-medium">Závěrečný test</p>
                                <p className="text-xs text-muted-foreground">Otázka pouze do testu levelu (nezobrazí se v procvičování)</p>
                              </div>
                            </button>
                          </div>
                        ) : !editingQuestion && addStep === 'pick_test_format' ? (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">Vyberte formát otázky pro závěrečný test:</p>
                            <div className="grid gap-3">
                              {[
                                { type: 'quiz', icon: '🧠', label: 'Kvíz', desc: 'Otázka se 4 možnostmi odpovědí' },
                                { type: 'fill_blank', icon: '✏️', label: 'Doplňování', desc: 'Věta s vynechaným slovem' },
                                { type: 'ai_import', icon: '✨', label: 'AI import', desc: 'Vygeneruje kvízové i doplňovací otázky pro závěrečný test' },
                              ].map(opt => (
                                <button
                                  key={opt.type}
                                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                                  onClick={() => {
                                    if (opt.type === 'ai_import') {
                                      setShowQuestionDialog(false);
                                      setAddStep('pick_type');
                                      openAiGenerator({ forTest: true });
                                      return;
                                    }
                                    setQForm({ ...qForm, type: opt.type, in_practice: false });
                                    setAddStep('edit');
                                  }}
                                >
                                  <span className="text-2xl">{opt.icon}</span>
                                  <div>
                                    <p className="font-medium">{opt.label}</p>
                                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setAddStep('pick_type')}>
                              <ArrowLeft className="mr-1 h-4 w-4" /> Zpět
                            </Button>
                          </div>
                        ) : (
                          <>
                            {!editingQuestion && qForm.in_practice === false && (
                              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 text-sm flex items-center gap-2">
                                🏁 <span>Tato otázka půjde <strong>pouze do závěrečného testu</strong>.</span>
                              </div>
                            )}
                            {renderQuestionForm()}
                          </>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Questions grouped by type - collapsible with visual distinction */}
                {(['quiz', 'fill_blank'] as const).map(type => {
                  const typeQuestions = questions.filter(q => q.type === type);
                  if (typeQuestions.length === 0) return null;
                  const label = type === 'quiz' ? '🧠 Kvíz' : '✏️ Doplňování';
                  const isOpen = openSections[type] !== false;
                  return (
                    <Card key={type} className="shadow-card overflow-hidden">
                      <Collapsible open={isOpen} onOpenChange={v => setOpenSections(s => ({ ...s, [type]: v }))}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                          <h3 className="text-sm font-semibold uppercase tracking-wide">{label} ({typeQuestions.length})</h3>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-2">
                            {typeQuestions.map(q => (
                              <div
                                key={q.id}
                                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${dragOverId === q.id ? 'ring-2 ring-primary' : ''} ${draggedId === q.id ? 'opacity-50' : 'bg-muted/30'}`}
                                draggable
                                onDragStart={() => handleDragStart(q.id)}
                                onDragOver={(e) => handleDragOver(e, q.id)}
                                onDragEnd={handleDragEnd}
                                onDrop={() => handleDrop(q.id, type)}
                              >
                                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm truncate">{q.question_text}</p>
                                    {q.in_practice === false && (
                                      <Badge variant="secondary" className="text-[10px] shrink-0">🏁 Jen test</Badge>
                                    )}
                                  </div>
                                  {q.type === 'quiz' && (
                                    <p className="text-xs text-success mt-0.5">Správně: {[q.option_1, q.option_2, q.option_3, q.option_4][(q.correct_answer || 1) - 1]}</p>
                                  )}
                                  {q.type === 'fill_blank' && q.option_1 && (
                                    <p className="text-xs text-success mt-0.5">Správně: {[q.option_1, q.option_2, q.option_3, q.option_4][(q.correct_answer || 1) - 1]}</p>
                                  )}
                                  {q.type === 'flashcard' && q.back_text && (
                                    <>
                                      <p className="text-xs text-muted-foreground mt-0.5 truncate">→ {q.back_text}</p>
                                      {(!q.wrong_option_1 || !q.wrong_option_2 || !q.wrong_option_3) && (
                                        <p className="text-[10px] text-warning mt-0.5">⚠ Chybí špatné možnosti pro test</p>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editQuestion(q)}><Edit className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteQuestion(q.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
                {questions.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">Žádné otázky v tomto levelu.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Levely</h2>
                  <Dialog open={showLevelDialog} onOpenChange={setShowLevelDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => { setEditingLevel(null); setLevelForm({ title: '', description: '', order_index: levels.length + 1, passing_score: 70, category }); }}>
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
                        <Button onClick={saveLevel} className="w-full">Uložit</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {levels.map(level => (
                    <Card key={level.id} className="shadow-card hover:shadow-elevated transition-all cursor-pointer" onClick={() => setSelectedLevel(level)}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary font-bold">
                            {level.order_index}
                          </div>
                          <div>
                            <h3 className="font-medium">{level.title}</h3>
                            {level.description && <p className="text-xs text-muted-foreground line-clamp-1">{level.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editLevel(level)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteLevel(level.id)}><Trash2 className="h-4 w-4" /></Button>
                          <ArrowRight className="h-4 w-4 text-muted-foreground ml-1" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {levels.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">Zatím žádné levely. Přidejte první!</p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            <AdminGroupsTab />
          </TabsContent>

          <TabsContent value="users" className="mt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat podle jména..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {myInvitedUsers.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Vaši pozvaní uživatelé</h3>
                {myInvitedUsers.map(renderUserCard)}
              </div>
            )}

            <div className="space-y-2">
              {myInvitedUsers.length > 0 && (
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Všichni uživatelé</h3>
              )}
              {otherUsers.map(renderUserCard)}
            </div>

            {filteredUsers.length === 0 && (
              <p className="text-muted-foreground text-center py-8">Žádní uživatelé nenalezeni.</p>
            )}
          </TabsContent>

          {adminRequests.length > 0 && (
            <TabsContent value="requests" className="mt-6">
              <div className="space-y-3">
                {adminRequests.map(req => {
                  const reqUser = users.find(u => u.user_id === req.user_id);
                  return (
                    <Card key={req.id} className="shadow-card">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{reqUser?.display_name || 'Neznámý uživatel'}</p>
                          <p className="text-xs text-muted-foreground">Odesláno: {new Date(req.created_at).toLocaleDateString('cs')}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-success" onClick={() => handleAdminRequest(req.id, req.user_id, true)}>
                            <CheckCircle className="mr-1 h-3 w-3" /> Schválit
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleAdminRequest(req.id, req.user_id, false)}>
                            <XCircle className="mr-1 h-3 w-3" /> Zamítnout
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
