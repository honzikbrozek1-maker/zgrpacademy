import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppPath } from '@/lib/pathContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GraduationCap } from 'lucide-react';
import AdminGroupTestDialog from './AdminGroupTestDialog';
import { NumberField } from './NumberField';
import DiplomaCertificate from './DiplomaCertificate';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';

interface Group {
  id: string;
  category: string;
  title: string;
  description: string | null;
  order_index: number;
  diploma_title: string;
  diploma_subtitle: string;
  diploma_intro_text: string;
  diploma_award_title: string;
  diploma_note_text: string;
  diploma_issuer: string;
  diploma_signatory: string;
  diploma_validity_years: number;
  min_average_score: number;
  final_test_passing_score: number;
  title_sk: string | null;
  description_sk: string | null;
  diploma_title_sk: string | null;
  diploma_subtitle_sk: string | null;
  diploma_intro_text_sk: string | null;
  diploma_award_title_sk: string | null;
  diploma_note_text_sk: string | null;
  diploma_issuer_sk: string | null;
}

interface Level {
  id: string;
  title: string;
  order_index: number;
  group_id: string | null;
  category: string;
}

const DEFAULT_INTRO = 'o absolvování kurzu zakončeného odbornou zkouškou a získání titulu';
const DEFAULT_AWARD = 'SPECIALISTA ZDRAVOTNÍHO PROTOKOLU';
const DEFAULT_ISSUER = 'SPOLEK V ROVNOVÁZE Z.S.';

const emptyForm = {
  title: '',
  description: '',
  order_index: 1,
  diploma_title: 'CERTIFIKÁT',
  diploma_subtitle: 'ZGRP Academy',
  diploma_intro_text: DEFAULT_INTRO,
  diploma_award_title: DEFAULT_AWARD,
  diploma_note_text: '',
  diploma_issuer: DEFAULT_ISSUER,
  diploma_signatory: '',
  diploma_validity_years: 1,
  min_average_score: 90,
  final_test_passing_score: 90,
  title_sk: '',
  description_sk: '',
  diploma_title_sk: '',
  diploma_subtitle_sk: '',
  diploma_intro_text_sk: '',
  diploma_award_title_sk: '',
  diploma_note_text_sk: '',
  diploma_issuer_sk: '',
};

export default function AdminGroupsTab() {
  const t = useT();
  const { category } = useAppPath();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editLang, setEditLang] = useState<'cs' | 'sk'>('cs');

  const load = async () => {
    const [{ data: g }, { data: l }] = await Promise.all([
      supabase.from('level_groups').select('*').eq('category', category).order('order_index'),
      supabase.from('levels').select('id,title,order_index,group_id,category').eq('category', category).order('order_index'),
    ]);
    if (g) setGroups(g as any);
    if (l) setLevels(l);
  };

  useEffect(() => { load(); }, [category]);

  const startCreate = () => {
    setForm({ ...emptyForm, order_index: groups.length + 1 });
    setEditingId(null);
    setEditLang('cs');
    setShowDialog(true);
  };

  const startEdit = (g: Group) => {
    setForm({
      title: g.title,
      description: g.description || '',
      order_index: g.order_index,
      diploma_title: g.diploma_title,
      diploma_subtitle: g.diploma_subtitle,
      diploma_intro_text: g.diploma_intro_text ?? DEFAULT_INTRO,
      diploma_award_title: g.diploma_award_title ?? DEFAULT_AWARD,
      diploma_note_text: g.diploma_note_text ?? '',
      diploma_issuer: g.diploma_issuer ?? DEFAULT_ISSUER,
      diploma_signatory: g.diploma_signatory ?? emptyForm.diploma_signatory,
      diploma_validity_years: g.diploma_validity_years ?? 1,
      min_average_score: g.min_average_score,
      final_test_passing_score: g.final_test_passing_score ?? 70,
      title_sk: g.title_sk ?? '',
      description_sk: g.description_sk ?? '',
      diploma_title_sk: g.diploma_title_sk ?? '',
      diploma_subtitle_sk: g.diploma_subtitle_sk ?? '',
      diploma_intro_text_sk: g.diploma_intro_text_sk ?? '',
      diploma_award_title_sk: g.diploma_award_title_sk ?? '',
      diploma_note_text_sk: g.diploma_note_text_sk ?? '',
      diploma_issuer_sk: g.diploma_issuer_sk ?? '',
    });
    setEditingId(g.id);
    setEditLang('cs');
    setShowDialog(true);
  };

  // Generic accessor helpers so the same inputs edit either the Czech or Slovak column.
  const fv = (key: keyof typeof emptyForm) => (editLang === 'sk' ? (form as any)[`${key}_sk`] ?? '' : (form as any)[key]);
  const setFv = (key: keyof typeof emptyForm) => (value: string) => {
    if (editLang === 'sk') setForm({ ...form, [`${key}_sk`]: value } as any);
    else setForm({ ...form, [key]: value } as any);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: t('Chyba'), description: t('Vyplňte název skupiny'), variant: 'destructive' });
      return;
    }
    const numericChecks: Array<[number, string]> = [
      [form.order_index, t('Pořadí')],
      [form.min_average_score, t('Min. průměr')],
      [form.final_test_passing_score, t('Min. skóre závěrečného testu')],
      [form.diploma_validity_years, t('Platnost diplomu (roky)')],
    ];
    for (const [v, label] of numericChecks) {
      if (!Number.isFinite(v)) {
        toast({ title: t('Chybí hodnota'), description: t('Vyplňte pole "{label}".', { label }), variant: 'destructive' });
        return;
      }
    }
    const payload = { ...form, category };
    const { error } = editingId
      ? await supabase.from('level_groups').update(payload).eq('id', editingId)
      : await supabase.from('level_groups').insert(payload);
    if (error) {
      toast({ title: t('Chyba'), description: error.message, variant: 'destructive' });
      return;
    }
    setShowDialog(false);
    toast({ title: t('Uloženo') });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(t('Přesunout skupinu do koše? Skupina, její levely i otázky budou obnovitelné 7 dní.'))) return;
    const { error } = await supabase.rpc('soft_delete_group', { p_id: id });
    if (error) {
      toast({ title: t('Chyba'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('Přesunuto do koše') });
    load();
  };

  const assignLevelToGroup = async (levelId: string, groupId: string | null) => {
    const { error } = await supabase.from('levels').update({ group_id: groupId }).eq('id', levelId);
    if (error) {
      toast({ title: t('Chyba'), description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t('Skupiny levelů a certifikáty')}</h2>
          <p className="text-sm text-muted-foreground">{t('Certifikát se vydá po dokončení všech levelů ve skupině.')}</p>
        </div>
        <Button onClick={startCreate} className="gradient-primary text-primary-foreground">
          <Plus className="mr-1 h-4 w-4" /> {t('Nová skupina')}
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('Zatím žádné skupiny.')}</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {groups.map(g => {
            const groupLevels = levels.filter(l => l.group_id === g.id);
            return (
              <Card key={g.id} className="shadow-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold flex items-center gap-2 flex-wrap">
                          <span>{g.title}</span>
                          <Badge variant="secondary">{t('min. {n}%', { n: g.min_average_score })}</Badge>
                          <Badge variant="outline">{t('{n} levelů', { n: groupLevels.length })}</Badge>
                        </h3>
                        {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('Certifikát:')} <strong>{g.diploma_title}</strong> — {g.diploma_subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(g)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="pl-13">
                    <AdminGroupTestDialog
                      groupId={g.id}
                      groupTitle={g.title}
                      passingScore={g.final_test_passing_score ?? 70}
                    />
                  </div>
                  {groupLevels.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-13">
                      {groupLevels.map(l => (
                        <Badge key={l.id} variant="outline" className="font-normal">{l.title}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">{t('Přiřazení levelů ke skupinám')}</h3>
          <div className="space-y-2">
            {levels.map(l => (
              <div key={l.id} className="flex items-center gap-3 p-2 rounded-lg border">
                <span className="flex-1 text-sm">{l.title}</span>
                <Select
                  value={l.group_id || 'none'}
                  onValueChange={v => assignLevelToGroup(l.id, v === 'none' ? null : v)}
                >
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('— Bez skupiny —')}</SelectItem>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {levels.length === 0 && <p className="text-sm text-muted-foreground">{t('Žádné levely.')}</p>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl p-0 gap-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{editingId ? t('Upravit skupinu') : t('Nová skupina')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            <LangToggle />
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
              <div>
                <label className="text-sm font-medium">{t('Název skupiny *')}</label>
                <Input value={fv('title')} onChange={e => setFv('title')(e.target.value)} placeholder={t('např. Modul: Základy ZGRP')} />
              </div>
              <div className="md:w-24">
                <label className="text-sm font-medium">{t('Pořadí')}</label>
                <NumberField value={form.order_index} onChange={v => setForm({ ...form, order_index: v })} />
              </div>
              <div className="md:w-40">
                <label className="text-sm font-medium">{t('Min. průměr (%)')}</label>
                <NumberField min={0} max={100} value={form.min_average_score} onChange={v => setForm({ ...form, min_average_score: v })} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <label className="text-sm font-medium">{t('Popis')}</label>
                <Textarea value={fv('description')} onChange={e => setFv('description')(e.target.value)} rows={2} />
              </div>
              <div className="md:w-56">
                <label className="text-sm font-medium">{t('Min. skóre záv. testu (%)')}</label>
                <NumberField min={0} max={100} value={form.final_test_passing_score} onChange={v => setForm({ ...form, final_test_passing_score: v })} />
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">{t('Konfigurace certifikátu')}</p>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                ✨ {t('Jméno absolventa, název kurzu, datum vydání i platnost se doplní')} <strong>{t('automaticky')}</strong>.
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">{t('Nadpis certifikátu')}</label>
                  <Input value={fv('diploma_title')} onChange={e => setFv('diploma_title')(e.target.value)} placeholder="CERTIFIKÁT" />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('Drobný text pod datem')}</label>
                  <Input value={fv('diploma_subtitle')} onChange={e => setFv('diploma_subtitle')(e.target.value)} placeholder={t('např. ZGRP Academy')} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t('Uvozovací věta')}</label>
                <Textarea
                  rows={2}
                  value={fv('diploma_intro_text')}
                  onChange={e => setFv('diploma_intro_text')(e.target.value)}
                  placeholder="o absolvování kurzu zakončeného odbornou zkouškou a získání titulu"
                />
                <p className="text-xs text-muted-foreground mt-1">{t('Vysází se kurzívou hned pod nadpisem „CERTIFIKÁT“.')}</p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('Titul (hlavní nadpis)')}</label>
                <Input
                  value={fv('diploma_award_title')}
                  onChange={e => setFv('diploma_award_title')(e.target.value)}
                  placeholder="SPECIALISTA ZDRAVOTNÍHO PROTOKOLU"
                />
                <p className="text-xs text-muted-foreground mt-1">{t('Vysází se velkým výrazným písmem. Pod ním je vždy „pro“ a jméno absolventa.')}</p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('Doplňující věta pod jménem')} <span className="text-muted-foreground font-normal">({t('nepovinné')})</span></label>
                <div className="flex flex-wrap gap-1.5 mt-1 mb-1.5">
                  {[
                    { label: t('Jméno absolventa'), token: '{user_name}' },
                    { label: t('Název kurzu'), token: '{group_title}' },
                    { label: t('Skóre'), token: '{score}' },
                    { label: t('Datum absolvování'), token: '{date}' },
                    { label: t('Platnost do'), token: '{valid_until}' },
                  ].map(({ label, token }) => (
                    <Button
                      key={token}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        const el = document.getElementById('diploma-note-text') as HTMLTextAreaElement | null;
                        const cur = fv('diploma_note_text') ?? '';
                        if (el) {
                          const start = el.selectionStart ?? cur.length;
                          const end = el.selectionEnd ?? cur.length;
                          const next = cur.slice(0, start) + token + cur.slice(end);
                          setFv('diploma_note_text')(next);
                          requestAnimationFrame(() => {
                            el.focus();
                            const pos = start + token.length;
                            el.setSelectionRange(pos, pos);
                          });
                        } else {
                          setFv('diploma_note_text')(cur + token);
                        }
                      }}
                    >
                      + {label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  id="diploma-note-text"
                  rows={2}
                  value={fv('diploma_note_text')}
                  onChange={e => setFv('diploma_note_text')(e.target.value)}
                  placeholder={t('Např.: Kurz {group_title} absolvován s výsledkem {score}.')}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('Tlačítka vloží zástupný text, který se na certifikátu automaticky nahradí skutečnou hodnotou.')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('Vydavatel')}</label>
                <Input
                  value={fv('diploma_issuer')}
                  onChange={e => setFv('diploma_issuer')(e.target.value)}
                  placeholder="SPOLEK V ROVNOVÁZE Z.S."
                />
                <p className="text-xs text-muted-foreground mt-1">{t('Zobrazí se dole na certifikátu jako „Vydává …“.')}</p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('Platnost (roky)')}</label>
                <NumberField min={0} value={form.diploma_validity_years} onChange={v => setForm({ ...form, diploma_validity_years: v })} />
                <p className="text-xs text-muted-foreground mt-1">{t('0 = bez omezení')}</p>
              </div>

              <div className="pt-2">
                <p className="text-sm font-medium mb-2">{t('Živý náhled certifikátu')}</p>
                <div className="rounded-lg border bg-muted/30 p-3 flex justify-center">
                  <DiplomaCertificate
                    hidePrint
                    maxWidth={420}
                    title={form.diploma_title || 'CERTIFIKÁT'}
                    subtitle={form.diploma_subtitle}
                    introText={form.diploma_intro_text}
                    awardTitle={form.diploma_award_title}
                    noteText={form.diploma_note_text}
                    issuer={form.diploma_issuer}
                    signatory={form.diploma_signatory}
                    validityYears={form.diploma_validity_years}
                    userName={profile?.display_name || 'Jan Novák'}
                    groupTitle={form.title || t('Název kurzu')}
                    score={95}
                    issuedAt={new Date().toISOString()}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {t('Ukázkové skóre 95 % a dnešní datum. Skutečné hodnoty se doplní při vydání diplomu uživateli.')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
            <Button variant="outline" onClick={() => setShowDialog(false)}>{t('Zrušit')}</Button>
            <Button onClick={save} className="gradient-primary text-primary-foreground">{t('Uložit')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
