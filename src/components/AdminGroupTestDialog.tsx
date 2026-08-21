import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Sparkles, Loader2, CheckCircle, GraduationCap, ArrowLeft } from 'lucide-react';
import { NumberField } from './NumberField';
import { useT } from '@/lib/i18n';

interface Question {
  id: string;
  group_id: string | null;
  type: string;
  question_text: string;
  option_1: string | null;
  option_2: string | null;
  option_3: string | null;
  option_4: string | null;
  correct_answer: number | null;
  back_text: string | null;
  order_index: number;
  question_text_sk: string | null;
  option_1_sk: string | null;
  option_2_sk: string | null;
  option_3_sk: string | null;
  option_4_sk: string | null;
  back_text_sk: string | null;
}

interface Props {
  groupId: string;
  groupTitle: string;
  passingScore: number;
  onPassingScoreChange?: (v: number) => void;
}

const emptyForm = {
  type: 'quiz' as 'quiz' | 'fill_blank',
  question_text: '',
  option_1: '', option_2: '', option_3: '', option_4: '',
  correct_answer: 1,
  back_text: '',
  order_index: 0,
  question_text_sk: '',
  option_1_sk: '', option_2_sk: '', option_3_sk: '', option_4_sk: '',
  back_text_sk: '',
};

export default function AdminGroupTestDialog({ groupId, groupTitle, passingScore }: Props) {
  const t = useT();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editLang, setEditLang] = useState<'cs' | 'sk'>('cs');

  // AI generation
  const [showAi, setShowAi] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiTypes, setAiTypes] = useState<string[]>(['quiz', 'fill_blank']);
  const [aiCount, setAiCount] = useState(30);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<any[] | null>(null);
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set());

  const load = async () => {
    const { data } = await supabase.from('questions').select('*').eq('group_id', groupId).order('order_index');
    if (data) setQuestions(data as any);
  };

  useEffect(() => { if (open) load(); }, [open, groupId]);

  const startEdit = (q: Question) => {
    setForm({
      type: (q.type === 'fill_blank' ? 'fill_blank' : 'quiz'),
      question_text: q.question_text,
      option_1: q.option_1 || '', option_2: q.option_2 || '',
      option_3: q.option_3 || '', option_4: q.option_4 || '',
      correct_answer: q.correct_answer || 1,
      back_text: q.back_text || '',
      order_index: q.order_index,
      question_text_sk: q.question_text_sk || '',
      option_1_sk: q.option_1_sk || '', option_2_sk: q.option_2_sk || '',
      option_3_sk: q.option_3_sk || '', option_4_sk: q.option_4_sk || '',
      back_text_sk: q.back_text_sk || '',
    });
    setEditingId(q.id);
    setEditLang('cs');
    setShowForm(true);
  };

  const startCreate = () => {
    setForm({ ...emptyForm, order_index: questions.length });
    setEditingId(null);
    setEditLang('cs');
    setShowForm(true);
  };

  // Generic accessor helpers so the same inputs edit either the Czech or Slovak column.
  const fv = (key: 'question_text' | 'option_1' | 'option_2' | 'option_3' | 'option_4' | 'back_text') =>
    (editLang === 'sk' ? (form as any)[`${key}_sk`] ?? '' : (form as any)[key]);
  const setFv = (key: 'question_text' | 'option_1' | 'option_2' | 'option_3' | 'option_4' | 'back_text') => (value: string) => {
    if (editLang === 'sk') {
      if (key === 'back_text') setForm({ ...form, back_text_sk: value, question_text_sk: value });
      else setForm({ ...form, [`${key}_sk`]: value } as any);
    } else {
      if (key === 'back_text') setForm({ ...form, back_text: value, question_text: value });
      else setForm({ ...form, [key]: value } as any);
    }
  };

  const save = async () => {
    if (!form.question_text.trim() && form.type === 'quiz') {
      toast({ title: t('Chyba'), description: t('Vyplňte text otázky'), variant: 'destructive' });
      return;
    }
    const isFillBlank = form.type === 'fill_blank';
    const payload: any = {
      group_id: groupId,
      level_id: null,
      type: form.type,
      question_text: isFillBlank ? form.back_text : form.question_text,
      option_1: form.option_1 || null,
      option_2: form.option_2 || null,
      option_3: form.option_3 || null,
      option_4: form.option_4 || null,
      correct_answer: form.correct_answer,
      back_text: isFillBlank ? form.back_text : null,
      wrong_option_1: null,
      wrong_option_2: null,
      wrong_option_3: null,
      order_index: form.order_index,
      question_text_sk: isFillBlank ? (form.back_text_sk || null) : (form.question_text_sk || null),
      option_1_sk: form.option_1_sk || null,
      option_2_sk: form.option_2_sk || null,
      option_3_sk: form.option_3_sk || null,
      option_4_sk: form.option_4_sk || null,
      back_text_sk: isFillBlank ? (form.back_text_sk || null) : null,
    };
    const { error } = editingId
      ? await supabase.from('questions').update(payload).eq('id', editingId)
      : await supabase.from('questions').insert(payload);
    if (error) {
      toast({ title: t('Chyba'), description: error.message, variant: 'destructive' });
      return;
    }
    setShowForm(false);
    setEditingId(null);
    toast({ title: t('Uloženo') });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(t('Přesunout otázku do koše?'))) return;
    await supabase.rpc('soft_delete_question', { p_id: id });
    load();
  };

  const generateAi = async () => {
    if (!aiText.trim() || aiTypes.length === 0) return;
    if (!Number.isFinite(aiCount)) {
      toast({ title: t('Chybí hodnota'), description: t('Vyplňte počet otázek.'), variant: 'destructive' });
      return;
    }
    setAiLoading(true);
    setAiResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: {
          text: aiText,
          group_id: groupId,
          mode: 'final_test',
          types: aiTypes,
          count: Math.min(Math.max(aiCount, 1), 30),
          existing_questions: questions.map(q => q.question_text),
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const list = (data?.questions || []) as any[];
      setAiResults(list);
      setAiSelected(new Set(list.map((_, i) => i)));
    } catch (e: any) {
      toast({ title: t('Chyba'), description: e.message || t('Nepodařilo se vygenerovat'), variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  const saveAi = async () => {
    if (!aiResults) return;
    const toInsert = aiResults
      .filter((_, i) => aiSelected.has(i))
      .map((q, i) => ({
        group_id: groupId,
        level_id: null,
        type: q.type,
        question_text: q.question_text,
        option_1: q.option_1 || null,
        option_2: q.option_2 || null,
        option_3: q.option_3 || null,
        option_4: q.option_4 || null,
        correct_answer: q.correct_answer || null,
        back_text: q.back_text || null,
        wrong_option_1: null,
        wrong_option_2: null,
        wrong_option_3: null,
        order_index: questions.length + i,
      }));
    if (toInsert.length === 0) return;
    const { error } = await supabase.from('questions').insert(toInsert);
    if (error) {
      toast({ title: t('Chyba'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('{n} otázek přidáno', { n: toInsert.length }) });
    setShowAi(false);
    setAiResults(null);
    setAiText('');
    load();
  };

  const toggleAiType = (t: string) =>
    setAiTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const LangToggle = () => (
    <div className="flex items-center gap-2">
      <div className="inline-flex rounded-md border p-0.5 bg-muted/40">
        <button
          type="button"
          onClick={() => setEditLang('cs')}
          className={`px-2.5 py-1 text-xs font-medium rounded ${editLang === 'cs' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
        >
          🇨🇿 {t('Čeština')}
        </button>
        <button
          type="button"
          onClick={() => setEditLang('sk')}
          className={`px-2.5 py-1 text-xs font-medium rounded ${editLang === 'sk' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
        >
          🇸🇰 {t('Slovenčina')}
        </button>
      </div>
      {editLang === 'sk' && (
        <span className="text-xs text-muted-foreground">{t('Prázdné pole = použije se česká verze')}</span>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <GraduationCap className="mr-1 h-4 w-4" /> {t('Závěrečný test')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {t('Závěrečný test — {title}', { title: groupTitle })}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">

        {showAi ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => { setShowAi(false); setAiResults(null); }}>
              <ArrowLeft className="mr-1 h-4 w-4" /> {t('Zpět')}
            </Button>
            {!aiResults ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {t('AI vybere POUZE nejdůležitější informace z textu (vhodné pro závěrečný test).')}
                </p>
                <Textarea
                  placeholder={t('Vložte text (obsah celé skupiny levelů, klíčové pojmy...)')}
                  value={aiText}
                  onChange={e => setAiText(e.target.value)}
                  rows={8}
                />
                <div className="flex gap-2 flex-wrap">
                  {[{ t: 'quiz', l: `🧠 ${t('Kvíz')}` }, { t: 'fill_blank', l: `✏️ ${t('Doplňování')}` }].map(o => (
                    <button
                      key={o.t}
                      onClick={() => toggleAiType(o.t)}
                      className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        aiTypes.includes(o.t) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('Počet otázek')}</label>
                  <NumberField min={1} max={30} value={aiCount} onChange={v => setAiCount(v)} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('Doporučeno: 30 (15 kvízových + 15 doplňovacích).')}
                  </p>
                </div>
                <Button onClick={generateAi} disabled={aiLoading || !aiText.trim() || aiTypes.length === 0} className="w-full">
                  {aiLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('Generuji...')}</> : <><Sparkles className="mr-2 h-4 w-4" /> {t('Vygenerovat')}</>}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t('Vygenerováno {n} otázek. Vyberte které uložit:', { n: aiResults.length })}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAiSelected(new Set(aiResults.map((_, i) => i)))}>{t('Vybrat vše')}</Button>
                  <Button variant="outline" size="sm" onClick={() => setAiSelected(new Set())}>{t('Zrušit')}</Button>
                </div>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {aiResults.map((q, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        const next = new Set(aiSelected);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        setAiSelected(next);
                      }}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        aiSelected.has(i) ? 'border-primary bg-primary/5' : 'border-border opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {q.type === 'quiz' ? `🧠 ${t('Kvíz')}` : `✏️ ${t('Doplňování')}`}
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
                    </div>
                  ))}
                </div>
                <Button onClick={saveAi} disabled={aiSelected.size === 0} className="w-full">
                  <Plus className="mr-1 h-4 w-4" /> {t('Uložit {n} otázek', { n: aiSelected.size })}
                </Button>
              </>
            )}
          </div>
        ) : showForm ? (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }}>
              <ArrowLeft className="mr-1 h-4 w-4" /> {t('Zpět na seznam')}
            </Button>
            <LangToggle />
            <div>
              <label className="text-sm font-medium mb-1 block">{t('Typ')}</label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">🧠 {t('Kvíz')}</SelectItem>
                  <SelectItem value="fill_blank">✏️ {t('Doplňování')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === 'quiz' ? (
              <div>
                <label className="text-sm font-medium mb-1 block">{t('Text otázky')}</label>
                <Textarea value={fv('question_text')} onChange={e => setFv('question_text')(e.target.value)} />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium mb-1 block">{t('Věta (s „______" jako mezerou)')}</label>
                <Textarea
                  value={fv('back_text')}
                  onChange={e => setFv('back_text')(e.target.value)}
                  placeholder={t('Např. Hlavní město ČR je ______.')}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Možnosti odpovědí')}</label>
              <Input placeholder={t('Možnost 1')} value={fv('option_1')} onChange={e => setFv('option_1')(e.target.value)} />
              <Input placeholder={t('Možnost 2')} value={fv('option_2')} onChange={e => setFv('option_2')(e.target.value)} />
              <Input placeholder={t('Možnost 3 (volitelná)')} value={fv('option_3')} onChange={e => setFv('option_3')(e.target.value)} />
              <Input placeholder={t('Možnost 4 (volitelná)')} value={fv('option_4')} onChange={e => setFv('option_4')(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('Která je správná?')}</label>
              <Select value={String(form.correct_answer)} onValueChange={v => setForm({ ...form, correct_answer: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('Možnost 1')}</SelectItem>
                  <SelectItem value="2">{t('Možnost 2')}</SelectItem>
                  {form.option_3 && <SelectItem value="3">{t('Možnost 3')}</SelectItem>}
                  {form.option_4 && <SelectItem value="4">{t('Možnost 4')}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} className="w-full">{t('Uložit')}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                {t('Otázek:')} <strong>{questions.length}</strong> · {t('Min. skóre:')} <strong>{t('{n}%', { n: passingScore })}</strong>
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShowAi(true); setAiResults(null); }}>
                  <Sparkles className="mr-1 h-4 w-4" /> {t('AI generování')}
                </Button>
                <Button size="sm" onClick={startCreate}>
                  <Plus className="mr-1 h-4 w-4" /> {t('Přidat otázku')}
                </Button>
              </div>
            </div>
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t('Zatím žádné otázky závěrečného testu.')}</p>
            ) : (
              <div className="space-y-2">
                {questions.map(q => (
                  <div key={q.id} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {q.type === 'quiz' ? '🧠' : '✏️'}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{q.question_text}</p>
                      {q.correct_answer && (
                        <p className="text-xs text-success truncate">
                          {t('Správně:')} {[q.option_1, q.option_2, q.option_3, q.option_4][(q.correct_answer || 1) - 1]}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(q)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(q.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
