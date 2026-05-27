import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, RotateCcw, Loader2 } from 'lucide-react';

interface DeletedItem {
  id: string;
  entity_type: 'question' | 'level' | 'level_group' | 'user';
  entity_id: string;
  label: string | null;
  deleted_at: string;
  expires_at: string;
}

const typeLabel: Record<DeletedItem['entity_type'], string> = {
  question: 'Otázka',
  level: 'Level',
  level_group: 'Skupina levelů',
  user: 'Uživatel',
};

export default function RecycleBinTab() {
  const { toast } = useToast();
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    // Auto-purge expired first (best-effort)
    await supabase.rpc('purge_expired_deleted_items');
    const { data } = await supabase
      .from('deleted_items')
      .select('id, entity_type, entity_id, label, deleted_at, expires_at')
      .order('deleted_at', { ascending: false });
    setItems((data as DeletedItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const restore = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.rpc('restore_deleted_item', { p_id: id });
    setBusyId(null);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Obnoveno' });
    load();
  };

  const purge = async (id: string) => {
    if (!confirm('Trvale smazat? Tato akce je nevratná.')) return;
    setBusyId(id);
    const { error } = await supabase.from('deleted_items').delete().eq('id', id);
    setBusyId(null);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Trvale smazáno' });
    load();
  };

  const remainingDays = (expires: string) => {
    const ms = new Date(expires).getTime() - Date.now();
    const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    return days;
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Smazané položky se zde uchovávají <strong>7 dní</strong>, poté se trvale odstraní. Můžeš je obnovit nebo trvale smazat dřív.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Načítání...
        </div>
      ) : items.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            Koš je prázdný.
          </CardContent>
        </Card>
      ) : (
        items.map(it => (
          <Card key={it.id} className="shadow-card">
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">{typeLabel[it.entity_type]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Smazáno {new Date(it.deleted_at).toLocaleString('cs')}
                  </span>
                </div>
                <p className="font-medium truncate">{it.label || '(bez názvu)'}</p>
                <p className="text-xs text-muted-foreground">
                  Trvale smazáno za {remainingDays(it.expires_at)} {remainingDays(it.expires_at) === 1 ? 'den' : 'dní'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={busyId === it.id} onClick={() => restore(it.id)}>
                  <RotateCcw className="mr-1 h-3 w-3" /> Obnovit
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" disabled={busyId === it.id} onClick={() => purge(it.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
