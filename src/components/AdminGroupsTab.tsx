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

interface Group {
  id: string;
  category: string;
  title: string;
  description: string | null;
  order_index: number;
  diploma_title: string;
  diploma_subtitle: string;
  diploma_body_text: string;
  diploma_signatory: string;
  diploma_validity_years: number;
  min_average_score: number;
  final_test_passing_score: number;
}

interface Level {
  id: string;
  title: string;
  order_index: number;
  group_id: string | null;
  category: string;
}

const emptyForm = {
  title: '',
  description: '',
  order_index: 1,
  diploma_title: 'CERTIFIKÁT',
  diploma_subtitle: 'ZGRP Academy',
  diploma_body_text: '',
  diploma_signatory: 'MUDr. Gabriela Hanslianová',
  diploma_validity_years: 1,
  min_average_score: 70,
  final_test_passing_score: 70,
};

export default function AdminGroupsTab() {
  const { category } = useAppPath();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [{ data: g }, { data: l }] = await Promise.all([
      supabase.from('level_groups').select('*').eq('category', category).order('order_index'),
      supabase.from('levels').select('id,title,order_index,group_id,category').eq('category', category).order('order_index'),
    ]);
    if (g) setGroups(g);
    if (l) setLevels(l);
  };

  useEffect(() => { load(); }, [category]);

  const startCreate = () => {
    setForm({ ...emptyForm, order_index: groups.length + 1 });
    setEditingId(null);
    setShowDialog(true);
  };

  const startEdit = (g: Group) => {
    setForm({
      title: g.title,
      description: g.description || '',
      order_index: g.order_index,
      diploma_title: g.diploma_title,
      diploma_subtitle: g.diploma_subtitle,
      diploma_body_text: g.diploma_body_text ?? emptyForm.diploma_body_text,
      diploma_signatory: g.diploma_signatory ?? emptyForm.diploma_signatory,
      diploma_validity_years: g.diploma_validity_years ?? 1,
      min_average_score: g.min_average_score,
      final_test_passing_score: g.final_test_passing_score ?? 70,
    });
    setEditingId(g.id);
    setShowDialog(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Chyba', description: 'Vyplňte název skupiny', variant: 'destructive' });
      return;
    }
    const payload = { ...form, category };
    const { error } = editingId
      ? await supabase.from('level_groups').update(payload).eq('id', editingId)
      : await supabase.from('level_groups').insert(payload);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }
    setShowDialog(false);
    toast({ title: 'Uloženo' });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Smazat skupinu? Levely zůstanou, jen se odpojí.')) return;
    const { error } = await supabase.from('level_groups').delete().eq('id', id);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Smazáno' });
    load();
  };

  const assignLevelToGroup = async (levelId: string, groupId: string | null) => {
    const { error } = await supabase.from('levels').update({ group_id: groupId }).eq('id', levelId);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Skupiny levelů a diplomy</h2>
          <p className="text-sm text-muted-foreground">Diplom se vydá po dokončení všech levelů ve skupině.</p>
        </div>
        <Button onClick={startCreate} className="gradient-primary text-primary-foreground">
          <Plus className="mr-1 h-4 w-4" /> Nová skupina
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Zatím žádné skupiny.</CardContent></Card>
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
                          <Badge variant="secondary">min. {g.min_average_score}%</Badge>
                          <Badge variant="outline">{groupLevels.length} levelů</Badge>
                        </h3>
                        {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          Diplom: <strong>{g.diploma_title}</strong> — {g.diploma_subtitle}
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
          <h3 className="font-semibold">Přiřazení levelů ke skupinám</h3>
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
                    <SelectItem value="none">— Bez skupiny —</SelectItem>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {levels.length === 0 && <p className="text-sm text-muted-foreground">Žádné levely.</p>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Upravit skupinu' : 'Nová skupina'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Název skupiny *</label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="např. Modul: Základy ZGRP" />
            </div>
            <div>
              <label className="text-sm font-medium">Popis</label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Pořadí</label>
                <Input type="number" value={form.order_index} onChange={e => setForm({ ...form, order_index: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium">Min. průměrné skóre (%)</label>
                <Input type="number" min={0} max={100} value={form.min_average_score} onChange={e => setForm({ ...form, min_average_score: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Min. skóre závěrečného testu (%)</label>
              <Input type="number" min={0} max={100} value={form.final_test_passing_score} onChange={e => setForm({ ...form, final_test_passing_score: Number(e.target.value) })} />
            </div>
            <div className="border-t pt-3 space-y-3">
              <p className="text-sm font-medium">Konfigurace diplomu</p>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p>✨ Jméno absolventa, název kurzu, datum vydání i platnost se na diplom doplní <strong>automaticky</strong>.</p>
                <p>Vyplňte jen pole níže — žádné značky jako <code>{'{user_name}'}</code> psát nemusíte.</p>
              </div>
              <div>
                <label className="text-sm font-medium">Nadpis diplomu</label>
                <Input value={form.diploma_title} onChange={e => setForm({ ...form, diploma_title: e.target.value })} placeholder="CERTIFIKÁT" />
              </div>
              <div>
                <label className="text-sm font-medium">Popis kurzu / akce <span className="text-muted-foreground font-normal">(nepovinné, zobrazí se pod jménem)</span></label>
                <Textarea
                  rows={3}
                  value={form.diploma_body_text}
                  onChange={e => setForm({ ...form, diploma_body_text: e.target.value })}
                  placeholder="Např.: Vzdělávací akce je zařazena v centrální databázi školících akcí České lékařské komory dle SP č. 16 pod registračním číslem 120042 a je hodnocena 5 kredity za účast."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Drobný text pod datem <span className="text-muted-foreground font-normal">(nepovinné)</span></label>
                <Input value={form.diploma_subtitle} onChange={e => setForm({ ...form, diploma_subtitle: e.target.value })} placeholder="např. ZGRP Academy" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Podpisující osoba</label>
                  <Input value={form.diploma_signatory} onChange={e => setForm({ ...form, diploma_signatory: e.target.value })} placeholder="MUDr. Gabriela Hanslianová" />
                </div>
                <div>
                  <label className="text-sm font-medium">Platnost (roky)</label>
                  <Input type="number" min={0} value={form.diploma_validity_years} onChange={e => setForm({ ...form, diploma_validity_years: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground mt-1">0 = bez omezení</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Zrušit</Button>
              <Button onClick={save} className="gradient-primary text-primary-foreground">Uložit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
