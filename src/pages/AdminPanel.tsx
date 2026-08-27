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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users, BookOpen, Shield, Send, ArrowLeft, ArrowRight, CheckCircle, XCircle, Clock, Search, ChevronDown, GripVertical, Sparkles, Loader2, GraduationCap, BarChart3, Languages } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import AdminGroupsTab from '@/components/AdminGroupsTab';
import AdminOverviewTab from '@/components/AdminOverviewTab';
import RecycleBinTab from '@/components/RecycleBinTab';
import SlovakContentTab from '@/components/SlovakContentTab';
import { NumberField } from '@/components/NumberField';
import { useT } from '@/lib/i18n';
import { blankSentence, hasBlank, normalizeBlank } from '@/lib/fillBlank';


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
  question_text_sk?: string | null;
  option_1_sk?: string | null;
  option_2_sk?: string | null;
  option_3_sk?: string | null;
  option_4_sk?: string | null;
  back_text_sk?: string | null;
  wrong_option_1_sk?: string | null;
  wrong_option_2_sk?: string | null;
  wrong_option_3_sk?: string | null;
}

interface UserProfile {
  user_id: string;
  display_name: string;
  created_at: string;
  has_paid: boolean;
}

interface AdminRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
}

export default function AdminPanel() {
  const t = useT();
  const { user, isAdmin } = useAuth();
  const { category } = useAppPath();
  const { toast } = useToast();
  const [levels, setLevels] = useState<Level[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const pendingAdminRequests = adminRequests.filter(r => r.status === 'pending');

  const [myRequest, setMyRequest] = useState<AdminRequest | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [showUnpaid, setShowUnpaid] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [showDeleteUser, setShowDeleteUser] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ quiz: true, flashcard: true, fill_blank: true });
  const [adminList, setAdminList] = useState<{ user_id: string; display_name: string }[]>([]);
  const [selectedTargetAdmin, setSelectedTargetAdmin] = useState<string | null>(null);

  const [levelForm, setLevelForm] = useState({ title: '', description: '', order_index: 1, passing_score: 90, category });
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
    question_text_sk: '',
    option_1_sk: '', option_2_sk: '', option_3_sk: '', option_4_sk: '',
    back_text_sk: '',
    wrong_option_1_sk: '', wrong_option_2_sk: '', wrong_option_3_sk: '',
  });
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [qEditLang, setQEditLang] = useState<'cs' | 'sk'>('cs');

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
      fetchAdminList();
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
    const { data } = await supabase.from('admin_requests').select('*').order('created_at', { ascending: false });
    if (data) setAdminRequests(data);
  };


  const fetchMyRequest = async () => {
    if (!user) return;
    const { data } = await supabase.from('admin_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
    if (data && data.length > 0) setMyRequest(data[0]);
  };

  const sendAdminRequest = async () => {
    if (!user || !selectedTargetAdmin) {
      toast({ title: t('Chyba'), description: t('Vyberte admina, kterému chcete poslat žádost.'), variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('admin_requests').insert({ user_id: user.id, target_admin_id: selectedTargetAdmin });
    if (error) {
      toast({ title: t('Chyba'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('Žádost odeslána') });
      fetchMyRequest();
    }
  };

  const handleAdminRequest = async (requestId: string, _userId: string, approve: boolean) => {
    if (!user) return;
    const { error } = await supabase.rpc('handle_admin_request', { p_request_id: requestId, p_approve: approve });
    if (error) {
      toast({ title: t('Chyba'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: approve ? t('Žádost schválena') : t('Žádost zamítnuta') });
    fetchAdminRequests();
  };

  const saveLevel = async () => {
    if (!levelForm.title.trim()) {
      toast({ title: t('Chyba'), description: t('Vyplňte název levelu.'), variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(levelForm.order_index) || !Number.isFinite(levelForm.passing_score)) {
      toast({ title: t('Chybí hodnota'), description: t('Vyplňte pořadí a skóre pro postup.'), variant: 'destructive' });
      return;
    }
    const payload = { ...levelForm, category };
    if (editingLevel) {
      await supabase.from('levels').update(payload).eq('id', editingLevel);
    } else {
      await supabase.from('levels').insert(payload);
    }
    setShowLevelDialog(false);
    setEditingLevel(null);
    setLevelForm({ title: '', description: '', order_index: levels.length + 1, passing_score: 90, category });
    fetchLevels();
    toast({ title: t('Uloženo') });
  };

  const deleteLevel = async (id: string) => {
    const { error } = await supabase.rpc('soft_delete_level', { p_id: id });
    if (error) { toast({ title: t('Chyba'), description: error.message, variant: 'destructive' }); return; }
    fetchLevels();
    if (selectedLevel?.id === id) setSelectedLevel(null);
    toast({ title: t('Level přesunut do koše') });
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
    const clean = (value: string) => value.trim().replace(/[\u00a0\u202f\u2009]/g, ' ');
    const optional = (value: string) => clean(value) || null;
    const payload = {
      ...qForm,
      level_id: selectedLevel.id,
      question_text: clean(qForm.question_text),
      option_1: needsOptions ? optional(qForm.option_1) : null,
      option_2: needsOptions ? optional(qForm.option_2) : null,
      option_3: needsOptions ? optional(qForm.option_3) : null,
      option_4: needsOptions ? optional(qForm.option_4) : null,
      correct_answer: (qForm.type === 'quiz' || qForm.type === 'fill_blank') ? qForm.correct_answer : null,
      back_text: (qForm.type === 'flashcard' || qForm.type === 'fill_blank') ? optional(qForm.back_text) : null,
      wrong_option_1: isFlashcard ? optional(qForm.wrong_option_1) : null,
      wrong_option_2: isFlashcard ? optional(qForm.wrong_option_2) : null,
      wrong_option_3: isFlashcard ? optional(qForm.wrong_option_3) : null,
      in_practice: qForm.in_practice,
      question_text_sk: optional(qForm.question_text_sk),
      option_1_sk: needsOptions ? optional(qForm.option_1_sk) : null,
      option_2_sk: needsOptions ? optional(qForm.option_2_sk) : null,
      option_3_sk: needsOptions ? optional(qForm.option_3_sk) : null,
      option_4_sk: needsOptions ? optional(qForm.option_4_sk) : null,
      back_text_sk: (qForm.type === 'flashcard' || qForm.type === 'fill_blank') ? optional(qForm.back_text_sk) : null,
      wrong_option_1_sk: isFlashcard ? optional(qForm.wrong_option_1_sk) : null,
      wrong_option_2_sk: isFlashcard ? optional(qForm.wrong_option_2_sk) : null,
      wrong_option_3_sk: isFlashcard ? optional(qForm.wrong_option_3_sk) : null,
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
    toast({ title: t('Uloženo') });
  };

  const deleteQuestion = async (id: string) => {
    const { error } = await supabase.rpc('soft_delete_question', { p_id: id });
    if (error) { toast({ title: t('Chyba'), description: error.message, variant: 'destructive' }); return; }
    if (selectedLevel) fetchQuestions(selectedLevel.id);
    toast({ title: t('Otázka přesunuta do koše') });
  };

  const toggleInLevelTest = async (q: Question, value: boolean) => {
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, in_level_test: value } : x));
    const { error } = await supabase.from('questions').update({ in_level_test: value }).eq('id', q.id);
    if (error) {
      toast({ title: t('Chyba'), description: error.message, variant: 'destructive' });
      if (selectedLevel) fetchQuestions(selectedLevel.id);
    }
  };

  const editQuestion = (q: Question) => {
    // Blank may be stored in back_text (manual) or question_text (AI generated)
    const cs = q.type === 'fill_blank'
      ? normalizeBlank(blankSentence(q.question_text, q.back_text) || q.back_text || '')
      : (q.back_text || '');
    const sk = q.type === 'fill_blank'
      ? normalizeBlank(blankSentence(q.question_text_sk, q.back_text_sk) || q.back_text_sk || '')
      : (q.back_text_sk || '');
    setQForm({
      type: q.type,
      question_text: q.question_text,
      option_1: q.option_1 || '', option_2: q.option_2 || '',
      option_3: q.option_3 || '', option_4: q.option_4 || '',
      correct_answer: q.correct_answer || 1,
      back_text: cs,
      wrong_option_1: q.wrong_option_1 || '',
      wrong_option_2: q.wrong_option_2 || '',
      wrong_option_3: q.wrong_option_3 || '',
      order_index: q.order_index,
      in_practice: q.in_practice !== false,
      question_text_sk: q.question_text_sk || '',
      option_1_sk: q.option_1_sk || '', option_2_sk: q.option_2_sk || '',
      option_3_sk: q.option_3_sk || '', option_4_sk: q.option_4_sk || '',
      back_text_sk: sk,
      wrong_option_1_sk: q.wrong_option_1_sk || '',
      wrong_option_2_sk: q.wrong_option_2_sk || '',
      wrong_option_3_sk: q.wrong_option_3_sk || '',
    });
    setEditingQuestion(q.id);
    setAddStep('edit');
    setBlankInserted(q.type === 'fill_blank' && hasBlank(cs));
    setShowQuestionDialog(true);
    setQEditLang('cs');
  };


  const resetQForm = () => {
    setQForm({
      type: 'quiz', question_text: '', option_1: '', option_2: '', option_3: '', option_4: '', correct_answer: 1, back_text: '', wrong_option_1: '', wrong_option_2: '', wrong_option_3: '', order_index: questions.length, in_practice: true,
      question_text_sk: '', option_1_sk: '', option_2_sk: '', option_3_sk: '', option_4_sk: '', back_text_sk: '', wrong_option_1_sk: '', wrong_option_2_sk: '', wrong_option_3_sk: '',
    });
    setBlankInserted(false);
    setQEditLang('cs');
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
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
      if (error) { toast({ title: t('Chyba'), description: error.message, variant: 'destructive' }); return; }
    } else {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
      if (error) { toast({ title: t('Chyba'), description: error.message, variant: 'destructive' }); return; }
    }
    toast({ title: isCurrentlyAdmin ? t('Admin role odebrána') : t('Admin role přidělena') });
    fetchAdminList();
  };

  const deleteUser = async (userId: string) => {
    const { error } = await supabase.rpc('soft_delete_user', { p_user_id: userId });
    if (error) { toast({ title: t('Chyba'), description: error.message, variant: 'destructive' }); return; }
    setShowDeleteUser(null);
    fetchUsers();
    toast({ title: t('Uživatel přesunut do koše') });
  };

  // Insert blank at cursor position
  const handleInsertBlank = () => {
    const textarea = sentenceRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = qVal('back_text');
    const newText = text.substring(0, start) + '______' + text.substring(end);
    qSet('back_text', newText);
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
    if (aiForTest) {
      if (!Number.isFinite(aiQuizCount) || !Number.isFinite(aiFillCount)) {
        toast({ title: t('Chybí hodnota'), description: t('Vyplňte počet kvízových a doplňovacích otázek.'), variant: 'destructive' });
        return;
      }
    } else if (!Number.isFinite(aiCount)) {
      toast({ title: t('Chybí hodnota'), description: t('Vyplňte počet otázek.'), variant: 'destructive' });
      return;
    }
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
            return [q.question_text, detail].filter(Boolean).join(` | ${t('Správně')}: `);
          })
          .filter(Boolean)
      : [];

    try {
      for (const target of targets) {
        const typesForCall = target.type === '__mixed__' ? aiTypes : [target.type];
        let producedForType = 0;
        while (producedForType < target.count) {
          const remaining = target.count - producedForType;
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
            let msg = error.message || t('Chyba generování');
            if (ctx?.status === 429) msg = t('Příliš mnoho požadavků. Zkuste to za chvíli.');
            if (ctx?.status === 402) msg = t('AI kredit vyčerpán. Doplňte kredity v nastavení workspace.');
            throw new Error(msg);
          }
          if (data?.error) throw new Error(data.error);
          const batch = (data?.questions || []) as any[];
          if (batch.length === 0) break;
          all.push(...batch);
          producedForType += batch.length;
          setAiProgress({ done: Math.min(all.length, grandTotal), total: grandTotal });
          if (producedForType < target.count) await new Promise(r => setTimeout(r, 800));
        }
      }
      setAiResults(all);
      setAiSelected(new Set(all.map((_, i) => i)));
    } catch (e: any) {
      if (all.length > 0) {
        setAiResults(all);
        setAiSelected(new Set(all.map((_, i) => i)));
        toast({ title: t('Generování přerušeno'), description: t('{msg}. Vygenerováno {done} z {total} otázek.', { msg: e.message, done: all.length, total: grandTotal }), variant: 'destructive' });
      } else {
        toast({ title: t('Chyba'), description: e.message || t('Nepodařilo se vygenerovat otázky'), variant: 'destructive' });
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
      toast({ title: t('Chyba'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('{count} otázek přidáno', { count: toInsert.length }) });
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
    if (!showUnpaid && !u.has_paid) return false;
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
            <CardHeader><CardTitle>{t('Nemáte administrátorská oprávnění')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {t('Pokud potřebujete administrátorský přístup, můžete odeslat žádost administrátorovi.')}
              </p>
              {myRequest ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  {myRequest.status === 'pending' && <><Clock className="h-4 w-4 text-warning" /><span className="text-sm">{t('Vaše žádost čeká na schválení...')}</span></>}
                  {myRequest.status === 'approved' && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-sm">{t('Žádost schválena! Klikněte pro načtení oprávnění.')}</span>
                      <Button size="sm" variant="outline" onClick={() => window.location.reload()}>{t('Načíst oprávnění')}</Button>
                    </div>
                  )}
                  {myRequest.status === 'rejected' && <><XCircle className="h-4 w-4 text-destructive" /><span className="text-sm">{t('Žádost byla zamítnuta.')}</span></>}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('Vyberte admina, kterému chcete žádost poslat:')}</label>
                    <Select value={selectedTargetAdmin || ''} onValueChange={v => setSelectedTargetAdmin(v)}>
                      <SelectTrigger><SelectValue placeholder={t('Vyberte admina...')} /></SelectTrigger>
                      <SelectContent>
                        {adminList.map(a => (
                          <SelectItem key={a.user_id} value={a.user_id}>{a.display_name || 'Admin'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" className="flex items-center gap-2" onClick={sendAdminRequest} disabled={!selectedTargetAdmin}>
                    <Send className="h-4 w-4" /> {t('Požádat o admin přístup')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const renderUserCard = (u: UserProfile) => {
    const userIsAdmin = adminList.some(a => a.user_id === u.user_id);
    const isSelf = user?.id === u.user_id;
    return (
      <Card key={u.user_id} className="shadow-card">
        <CardContent className="p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${userIsAdmin ? 'bg-primary/15' : 'bg-muted'}`}>
              {userIsAdmin
                ? <Shield className="h-5 w-5 text-primary" />
                : <Users className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium truncate">{u.display_name || t('Bez jména')}</p>
                {userIsAdmin
                  ? <Badge className="gap-1"><Shield className="h-3 w-3" /> {t('Admin')}</Badge>
                  : <Badge variant="secondary">{t('Uživatel')}</Badge>}
                {!u.has_paid && <Badge variant="outline" className="text-muted-foreground">{t('Nezaplaceno')}</Badge>}
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                <span>{t('Registrace: {date}', { date: new Date(u.created_at).toLocaleDateString('cs') })}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isSelf && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  {userIsAdmin ? (
                    <Button variant="outline" size="sm">
                      <XCircle className="mr-1 h-3 w-3" /> Odebrat admina
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm">
                      <Shield className="mr-1 h-3 w-3" /> {t('Přidělit admina')}
                    </Button>
                  )}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {userIsAdmin ? t('Odebrat admin oprávnění?') : t('Přidělit admin oprávnění?')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {userIsAdmin
                        ? t('Uživateli {name} bude odebrána role administrátora.', { name: u.display_name || t('bez jména') })
                        : t('Uživatel {name} získá plný administrátorský přístup k aplikaci.', { name: u.display_name || t('bez jména') })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('Zrušit')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => toggleAdmin(u.user_id, userIsAdmin)}>
                      Potvrdit
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {showDeleteUser === u.user_id ? (
              <div className="flex items-center gap-1">
                <Button variant="destructive" size="sm" onClick={() => deleteUser(u.user_id)}>{t('Potvrdit')}</Button>
                <Button variant="outline" size="sm" onClick={() => setShowDeleteUser(null)}>{t('Zrušit')}</Button>
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
  };

  const qField = (base: string) => (qEditLang === 'sk' ? `${base}_sk` : base) as keyof typeof qForm;
  const qVal = (base: string) => (qForm as any)[qField(base)] as string;
  const qSet = (base: string, value: string) => setQForm({ ...qForm, [qField(base)]: value } as typeof qForm);

  const renderQuestionLangToggle = () => (
    <div className="flex items-center gap-2">
      <div className="inline-flex rounded-md border p-0.5 bg-muted/40">
        <button
          type="button"
          onClick={() => setQEditLang('cs')}
          className={`px-2.5 py-1 text-xs font-medium rounded ${qEditLang === 'cs' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
        >
          🇨🇿 {t('Čeština')}
        </button>
        <button
          type="button"
          onClick={() => setQEditLang('sk')}
          className={`px-2.5 py-1 text-xs font-medium rounded ${qEditLang === 'sk' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
        >
          🇸🇰 {t('Slovenčina')}
        </button>
      </div>
      {qEditLang === 'sk' && (
        <span className="text-xs text-muted-foreground">{t('Prázdné pole = použije se česká verze')}</span>
      )}
    </div>
  );

  const renderQuestionForm = () => (
    <div className="space-y-4">
      {renderQuestionLangToggle()}

      {/* Type selector */}
      <div>
        <label className="text-sm font-medium mb-1 block">{t('Typ')}</label>
        <Select value={qForm.type} onValueChange={v => { setQForm({ ...qForm, type: v }); setBlankInserted(false); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="quiz">{t('🧠 Kvíz')}</SelectItem>
            <SelectItem value="fill_blank">{t('✏️ Doplňování')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Common question text for quiz and flashcard */}
      {qForm.type !== 'fill_blank' && (
        <div>
          <label className="text-sm font-medium mb-1 block">
            {qForm.type === 'flashcard' ? t('Přední strana kartičky (otázka)') : t('Text otázky')}
          </label>
          <Textarea
            placeholder={qForm.type === 'flashcard' ? t('Co se zobrazí na přední straně kartičky?') : t('Napište otázku...')}
            value={qVal('question_text')}
            onChange={e => qSet('question_text', e.target.value)}
          />
        </div>
      )}

      {qForm.type === 'quiz' && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('Možnosti odpovědí')}</label>
            <Input placeholder={t('Možnost 1')} value={qVal('option_1')} onChange={e => qSet('option_1', e.target.value)} />
            <Input placeholder={t('Možnost 2')} value={qVal('option_2')} onChange={e => qSet('option_2', e.target.value)} />
            <Input placeholder={t('Možnost 3')} value={qVal('option_3')} onChange={e => qSet('option_3', e.target.value)} />
            <Input placeholder={t('Možnost 4')} value={qVal('option_4')} onChange={e => qSet('option_4', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('Která možnost je správná?')}</label>
            <Select value={String(qForm.correct_answer)} onValueChange={v => setQForm({ ...qForm, correct_answer: parseInt(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t('Možnost 1')}</SelectItem>
                <SelectItem value="2">{t('Možnost 2')}</SelectItem>
                <SelectItem value="3">{t('Možnost 3')}</SelectItem>
                <SelectItem value="4">{t('Možnost 4')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {qForm.type === 'flashcard' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">{t('Zadní strana kartičky (správná odpověď)')}</label>
            <Textarea
              placeholder={t('Co se zobrazí po otočení kartičky?')}
              value={qVal('back_text')}
              onChange={e => qSet('back_text', e.target.value)}
            />
          </div>
          <div className="space-y-2 p-3 rounded-lg border border-dashed border-border bg-muted/30">
            <label className="text-sm font-medium block">{t('Špatné možnosti pro závěrečný test')}</label>
            <p className="text-xs text-muted-foreground">
              {t('V testu se kartička zobrazí jako kvíz se 4 možnostmi. Vyplňte 3 nesprávné odpovědi. Bez nich nebude kartička v testu zařazena.')}
            </p>
            <Input
              placeholder={t('Špatná možnost 1')}
              value={qVal('wrong_option_1')}
              onChange={e => qSet('wrong_option_1', e.target.value)}
            />
            <Input
              placeholder={t('Špatná možnost 2')}
              value={qVal('wrong_option_2')}
              onChange={e => qSet('wrong_option_2', e.target.value)}
            />
            <Input
              placeholder={t('Špatná možnost 3')}
              value={qVal('wrong_option_3')}
              onChange={e => qSet('wrong_option_3', e.target.value)}
            />
          </div>
        </div>
      )}

      {qForm.type === 'fill_blank' && (
        <div className="space-y-4">
          {/* Step 1: Write the sentence */}
          <div>
            <label className="text-sm font-medium mb-1 block">{t('1. Napište celou větu')}</label>
            <p className="text-xs text-muted-foreground mb-2">
              Napište celou větu i se slovem, které pak chcete vynechat. Např.: <em>{t('„Hlavním městem České republiky je Praha."')}</em> V dalším kroku si v této větě označíte slovo, které se má vynechat.
            </p>
            <Textarea
              ref={sentenceRef}
              placeholder={t('Např.: Hlavním městem České republiky je Praha.')}
              value={qVal('back_text')}
              onChange={e => { qSet('back_text', e.target.value); if (!hasBlank(e.target.value)) setBlankInserted(false); else setBlankInserted(true); }}
            />
          </div>

          {/* Step 2: Insert blank button */}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleInsertBlank}
              disabled={!qVal('back_text') || blankInserted}
            >
              {blankInserted ? t('✅ Mezera vložena') : t('📍 Vložit mezeru na pozici kurzoru')}
            </Button>
            {!blankInserted && qVal('back_text') && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('Umístěte kurzor do věty tam, kde chcete vynechat slovo, a klikněte na tlačítko.')}
              </p>
            )}
            {blankInserted && (
              <p className="text-xs text-success mt-1">{t('Mezera je označena jako „______" ve větě.')}</p>
            )}
          </div>

          {/* Preview */}
          {blankInserted && hasBlank(qVal('back_text')) && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-1">{t('Náhled:')}</p>
              <p className="text-sm">
                {normalizeBlank(qVal('back_text')).split('______').map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className="inline-block align-baseline w-14 border-b-2 border-primary mx-1 rounded-sm bg-primary/10">&nbsp;</span>
                    )}
                  </span>
                ))}
              </p>
            </div>
          )}


          {/* Hidden question_text = same as back_text for display */}
          <input type="hidden" value={qVal('back_text')} />

          {/* Step 3: Answer options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('3. Možnosti odpovědí (min. 2, max. 4)')}</label>
            <div className="relative">
              <Input
                placeholder={t('Možnost 1')}
                value={qVal('option_1')}
                onChange={e => qSet('option_1', e.target.value)}
                className="pr-20"
              />
              {qForm.correct_answer === 1 && (
                <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-success/15 text-success text-[10px] border-0">{t('správná')}</Badge>
              )}
            </div>
            <div className="relative">
              <Input
                placeholder={t('Možnost 2')}
                value={qVal('option_2')}
                onChange={e => qSet('option_2', e.target.value)}
                className="pr-20"
              />
              {qForm.correct_answer === 2 && (
                <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-success/15 text-success text-[10px] border-0">{t('správná')}</Badge>
              )}
            </div>
            <div className="relative">
              <Input
                placeholder={t('Možnost 3 (volitelná)')}
                value={qVal('option_3')}
                onChange={e => qSet('option_3', e.target.value)}
                className="pr-20"
              />
              {qForm.correct_answer === 3 && (
                <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-success/15 text-success text-[10px] border-0">{t('správná')}</Badge>
              )}
            </div>
            <div className="relative">
              <Input
                placeholder={t('Možnost 4 (volitelná)')}
                value={qVal('option_4')}
                onChange={e => qSet('option_4', e.target.value)}
                className="pr-20"
              />
              {qForm.correct_answer === 4 && (
                <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-success/15 text-success text-[10px] border-0">{t('správná')}</Badge>
              )}
            </div>
          </div>

          {/* Step 4: Select correct answer */}
          <div>
            <label className="text-sm font-medium mb-1 block">{t('4. Která možnost je správná?')}</label>
            <Select value={String(qForm.correct_answer)} onValueChange={v => setQForm({ ...qForm, correct_answer: parseInt(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t('Možnost 1')}</SelectItem>
                <SelectItem value="2">{t('Možnost 2')}</SelectItem>
                {qForm.option_3 && <SelectItem value="3">{t('Možnost 3')}</SelectItem>}
                {qForm.option_4 && <SelectItem value="4">{t('Možnost 4')}</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Button onClick={() => {
        // For fill_blank, auto-set question_text from back_text
        if (qForm.type === 'fill_blank') {
          qForm.question_text = qForm.back_text;
          qForm.question_text_sk = qForm.back_text_sk;
        }
        saveQuestion();
      }} className="w-full">{t('Uložit')}</Button>
    </div>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> {t('Administrace')}
        </h1>

        <Tabs defaultValue="overview">
          <div className="-mx-4 md:mx-0 overflow-x-auto scrollbar-none">
            <TabsList className="inline-flex w-max md:w-auto mx-4 md:mx-0">
              <TabsTrigger value="overview"><BarChart3 className="mr-1 h-4 w-4" /> {t('Přehled')}</TabsTrigger>
              <TabsTrigger value="content"><BookOpen className="mr-1 h-4 w-4" /> {t('Obsah')}</TabsTrigger>
              <TabsTrigger value="groups"><GraduationCap className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">{t('Skupiny & certifikáty')}</span><span className="sm:hidden">{t('Skupiny')}</span></TabsTrigger>
              <TabsTrigger value="users"><Users className="mr-1 h-4 w-4" /> {t('Uživatelé')}</TabsTrigger>
              <TabsTrigger value="translations"><Languages className="mr-1 h-4 w-4" /> {t('Slovenština')}</TabsTrigger>
              <TabsTrigger value="trash"><Trash2 className="mr-1 h-4 w-4" /> {t('Koš')}</TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="requests" className="relative">
                  <Shield className="mr-1 h-4 w-4" /> {t('Žádosti')}
                  {pendingAdminRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">{pendingAdminRequests.length}</span>
                  )}
                </TabsTrigger>
              )}

            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-6">
            <AdminOverviewTab />
          </TabsContent>

          <TabsContent value="content" className="mt-6 space-y-6">
            {selectedLevel ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLevel(null)}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> {t('Zpět na levely')}
                  </Button>
                  <h2 className="text-lg font-semibold">{selectedLevel.order_index}. {selectedLevel.title}</h2>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm text-muted-foreground">
                    {t('{quiz} kvízů, {fill} doplňování', { quiz: questions.filter(q => q.type === 'quiz').length, fill: questions.filter(q => q.type === 'fill_blank').length })}
                  </p>
                  <div className="flex gap-2">
                    <Dialog open={showAiDialog} onOpenChange={(open) => { setShowAiDialog(open); if (!open) resetAiDialog(); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => openAiGenerator()}>
                          <Sparkles className="mr-1 h-4 w-4" /> {t('AI generování')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" /> {t('Generování otázek pomocí AI')}
                          </DialogTitle>
                        </DialogHeader>
                        {!aiResults ? (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-1 block">{t('Vložte text nebo téma')}</label>
                              <Textarea
                                placeholder={t('Vložte text z učebnice, NotebookLM, poznámek nebo popište téma...')}
                                value={aiText}
                                onChange={e => setAiText(e.target.value)}
                                rows={8}
                              />
                            </div>
                            <label className="flex items-center justify-between gap-2 p-3 rounded-lg border-2 border-border cursor-pointer">
                              <div>
                                <p className="text-sm font-medium flex items-center gap-1.5">{t('🏁 Pro závěrečný test')}</p>
                                <p className="text-xs text-muted-foreground">{t('Otázky se neobjeví v procvičování a budou cílené na závěrečný test.')}</p>
                              </div>
                              <Switch checked={aiForTest} onCheckedChange={setAiForTest} />
                            </label>
                            <div>
                              <label className="text-sm font-medium mb-2 block">{t('Zdroj pro AI')}</label>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <button
                                  type="button"
                                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                                    aiSourceMode === 'new_only' ? 'border-primary bg-primary/10' : 'border-border'
                                  }`}
                                  onClick={() => setAiSourceMode('new_only')}
                                >
                                  <p className="text-sm font-medium">{t('Jen nový vstup')}</p>
                                  <p className="text-xs text-muted-foreground">{t('AI použije pouze text, který vložíte teď.')}</p>
                                </button>
                                <button
                                  type="button"
                                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                                    aiSourceMode === 'new_plus_existing' ? 'border-primary bg-primary/10' : 'border-border'
                                  }`}
                                  onClick={() => setAiSourceMode('new_plus_existing')}
                                >
                                  <p className="text-sm font-medium">{t('Nový vstup + existující otázky')}</p>
                                  <p className="text-xs text-muted-foreground">{t('AI může navázat i na již existující procvičovací otázky v tomto levelu.')}</p>
                                </button>
                              </div>
                            </div>
                            {!aiForTest ? (
                              <>
                                <div>
                                  <label className="text-sm font-medium mb-2 block">{t('Typy otázek k vygenerování')}</label>
                                  <div className="flex gap-2 flex-wrap">
                                    {[
                                      { type: 'quiz', label: t('🧠 Kvíz') },
                                      { type: 'fill_blank', label: t('✏️ Doplňování') },
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
                                  <label className="text-sm font-medium mb-1 block">{t('Počet otázek (1–100)')}</label>
                                  <NumberField
                                    min={1}
                                    max={100}
                                    value={aiCount}
                                    onChange={v => setAiCount(v)}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t('Větší počty se generují postupně po dávkách (~20 otázek). Generování může trvat déle.')}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-sm font-medium mb-1 block">{t('🧠 Kvízových')}</label>
                                  <NumberField min={0} max={100} value={aiQuizCount} onChange={v => setAiQuizCount(v)} />
                                </div>
                                <div>
                                  <label className="text-sm font-medium mb-1 block">{t('✏️ Doplňovacích')}</label>
                                  <NumberField min={0} max={100} value={aiFillCount} onChange={v => setAiFillCount(v)} />
                                </div>
                              </div>
                            )}
                            <Button onClick={generateWithAi} disabled={aiLoading || !aiText.trim() || (aiForTest ? (aiQuizCount + aiFillCount === 0) : aiTypes.length === 0)} className="w-full">
                              {aiLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generuji {aiProgress ? `${aiProgress.done}/${aiProgress.total}` : ''}...</>
                              ) : (
                                <><Sparkles className="mr-2 h-4 w-4" /> {t('Vygenerovat otázky')}</>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">{t('Vygenerováno {count} otázek. Vyberte které chcete přidat:', { count: aiResults.length })}</p>
                            <div className="flex gap-2 mb-2">
                              <Button variant="outline" size="sm" onClick={() => setAiSelected(new Set(aiResults.map((_, i) => i)))}>{t('Vybrat vše')}</Button>
                              <Button variant="outline" size="sm" onClick={() => setAiSelected(new Set())}>{t('Zrušit výběr')}</Button>
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
                                      {q.type === 'quiz' ? t('🧠 Kvíz') : q.type === 'flashcard' ? t('📖 Kartička') : t('✏️ Doplňování')}
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
                                {t('← Zpět')}
                              </Button>
                              <Button onClick={saveAiQuestions} disabled={aiSelected.size === 0} className="flex-1">
                                <Plus className="mr-1 h-4 w-4" /> {t('Přidat {count} otázek', { count: aiSelected.size })}
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
                          <Plus className="mr-1 h-4 w-4" /> {t('Přidat')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {editingQuestion
                              ? t('Upravit otázku')
                              : addStep === 'pick_type'
                                ? t('Vyberte typ')
                                : addStep === 'pick_test_format'
                                  ? t('Formát otázky pro test')
                                  : t('Nová otázka')}
                          </DialogTitle>
                        </DialogHeader>
                        {!editingQuestion && addStep === 'pick_type' ? (
                          <div className="grid gap-3">
                            {[
                              { type: 'quiz', icon: '🧠', label: t('Kvíz'), desc: t('Procvičování – otázka se 4 možnostmi') },
                              { type: 'fill_blank', icon: '✏️', label: t('Doplňování'), desc: t('Procvičování – věta s vynechaným slovem') },
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
                                <p className="font-medium">{t('Závěrečný test')}</p>
                                <p className="text-xs text-muted-foreground">{t('Otázka pouze do testu levelu (nezobrazí se v procvičování)')}</p>
                              </div>
                            </button>
                          </div>
                        ) : !editingQuestion && addStep === 'pick_test_format' ? (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">{t('Vyberte formát otázky pro závěrečný test:')}</p>
                            <div className="grid gap-3">
                              {[
                                { type: 'quiz', icon: '🧠', label: t('Kvíz'), desc: t('Otázka se 4 možnostmi odpovědí') },
                                { type: 'fill_blank', icon: '✏️', label: t('Doplňování'), desc: t('Věta s vynechaným slovem') },
                                { type: 'ai_import', icon: '✨', label: t('AI import'), desc: t('Vygeneruje kvízové i doplňovací otázky pro závěrečný test') },
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
                              <ArrowLeft className="mr-1 h-4 w-4" /> {t('Zpět')}
                            </Button>
                          </div>
                        ) : (
                          <>
                            {!editingQuestion && qForm.in_practice === false && (
                              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 text-sm flex items-center gap-2">
                                🏁 <span>{t('Tato otázka půjde')} <strong>{t('pouze do závěrečného testu')}</strong>.</span>
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
                  const label = type === 'quiz' ? t('🧠 Kvíz') : t('✏️ Doplňování');
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
                                      <Badge variant="secondary" className="text-[10px] shrink-0">{t('🏁 Jen test')}</Badge>
                                    )}
                                  </div>
                                  {q.type === 'quiz' && (
                                    <p className="text-xs text-success mt-0.5">{t('Správně')}: {[q.option_1, q.option_2, q.option_3, q.option_4][(q.correct_answer || 1) - 1]}</p>
                                  )}
                                  {q.type === 'fill_blank' && q.option_1 && (
                                    <p className="text-xs text-success mt-0.5">{t('Správně')}: {[q.option_1, q.option_2, q.option_3, q.option_4][(q.correct_answer || 1) - 1]}</p>
                                  )}
                                  {q.type === 'flashcard' && q.back_text && (
                                    <>
                                      <p className="text-xs text-muted-foreground mt-0.5 truncate">→ {q.back_text}</p>
                                      {(!q.wrong_option_1 || !q.wrong_option_2 || !q.wrong_option_3) && (
                                        <p className="text-[10px] text-warning mt-0.5">{t('⚠ Chybí špatné možnosti pro test')}</p>
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
                  <p className="text-muted-foreground text-center py-8">{t('Žádné otázky v tomto levelu.')}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{t('Levely')}</h2>
                  <Dialog open={showLevelDialog} onOpenChange={setShowLevelDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => { setEditingLevel(null); setLevelForm({ title: '', description: '', order_index: levels.length + 1, passing_score: 90, category }); }}>
                        <Plus className="mr-1 h-4 w-4" /> {t('Přidat level')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{editingLevel ? t('Upravit level') : t('Nový level')}</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <Input placeholder={t('Název')} value={levelForm.title} onChange={e => setLevelForm({ ...levelForm, title: e.target.value })} />
                        <Textarea placeholder={t('Popis')} value={levelForm.description} onChange={e => setLevelForm({ ...levelForm, description: e.target.value })} />
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-muted-foreground">{t('Pořadí')}</label>
                            <NumberField value={levelForm.order_index} onChange={v => setLevelForm({ ...levelForm, order_index: v })} />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground">{t('Skóre pro postup (%)')}</label>
                            <NumberField value={levelForm.passing_score} onChange={v => setLevelForm({ ...levelForm, passing_score: v })} />
                          </div>
                        </div>
                        <Button onClick={saveLevel} className="w-full">{t('Uložit')}</Button>
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
                    <p className="text-muted-foreground text-center py-8">{t('Zatím žádné levely. Přidejte první!')}</p>
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
                placeholder={t('Hledat podle jména...')}
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{t('Zobrazit i nezaplacené uživatele')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('Ve výchozím nastavení jsou skryti registrovaní uživatelé, kteří ještě neuhradili poplatek.')}
                </p>
              </div>
              <Switch checked={showUnpaid} onCheckedChange={setShowUnpaid} />
            </div>

            {myInvitedUsers.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('Vaši pozvaní uživatelé')}</h3>
                {myInvitedUsers.map(renderUserCard)}
              </div>
            )}

            <div className="space-y-2">
              {myInvitedUsers.length > 0 && (
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('Všichni uživatelé')}</h3>
              )}
              {otherUsers.map(renderUserCard)}
            </div>

            {filteredUsers.length === 0 && (
              <p className="text-muted-foreground text-center py-8">{t('Žádní uživatelé nenalezeni.')}</p>
            )}
          </TabsContent>

          <TabsContent value="translations" className="mt-6">
            <SlovakContentTab />
          </TabsContent>

          <TabsContent value="trash" className="mt-6">
            <RecycleBinTab />
          </TabsContent>


          {isAdmin && (
            <TabsContent value="requests" className="mt-6">
              {adminRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('Zatím nejsou žádné žádosti o admin oprávnění.')}</p>
              ) : (
                <div className="space-y-3">
                  {adminRequests.map(req => {
                    const reqUser = users.find(u => u.user_id === req.user_id);
                    const isPending = req.status === 'pending';
                    const statusLabel = isPending ? t('Čeká') : req.status === 'approved' ? t('Schváleno') : t('Zamítnuto');
                    const statusClass = isPending
                      ? 'bg-warning/15 text-warning'
                      : req.status === 'approved'
                        ? 'bg-success/15 text-success'
                        : 'bg-destructive/15 text-destructive';
                    return (
                      <Card key={req.id} className="shadow-card">
                        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {reqUser?.display_name || t('Neznámý uživatel')}
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusClass}`}>{statusLabel}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{t('Odesláno: {date}', { date: new Date(req.created_at).toLocaleDateString('cs') })}</p>
                          </div>
                          {isPending && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="text-success" onClick={() => handleAdminRequest(req.id, req.user_id, true)}>
                                <CheckCircle className="mr-1 h-3 w-3" /> {t('Schválit')}
                              </Button>
                              <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleAdminRequest(req.id, req.user_id, false)}>
                                <XCircle className="mr-1 h-3 w-3" /> {t('Zamítnout')}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}

        </Tabs>
      </div>
    </AppLayout>
  );
}
