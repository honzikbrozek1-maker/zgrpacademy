import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Languages, RefreshCw } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';

type Entity = 'levels' | 'groups' | 'questions';

const ENTITIES: { key: Entity; table: 'levels' | 'level_groups' | 'questions'; field: string }[] = [
  { key: 'groups', table: 'level_groups', field: 'title_sk' },
  { key: 'levels', table: 'levels', field: 'title_sk' },
  { key: 'questions', table: 'questions', field: 'question_text_sk' },
];

interface Counts {
  total: number;
  missing: number;
}

export default function SlovakContentTab() {
  const t = useT();
  const [counts, setCounts] = useState<Record<Entity, Counts>>({
    groups: { total: 0, missing: 0 },
    levels: { total: 0, missing: 0 },
    questions: { total: 0, missing: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<Entity | null>(null);
  const [progress, setProgress] = useState(0);

  const labels: Record<Entity, string> = {
    groups: t('Skupiny a certifikáty'),
    levels: t('Levely'),
    questions: t('Otázky'),
  };

  const load = useCallback(async () => {
    setLoading(true);
    const next = {} as Record<Entity, Counts>;
    for (const e of ENTITIES) {
      const { count: total } = await supabase.from(e.table).select('id', { count: 'exact', head: true });
      const { count: missing } = await supabase
        .from(e.table)
        .select('id', { count: 'exact', head: true })
        .or(`${e.field}.is.null,${e.field}.eq.`);
      next[e.key] = { total: total ?? 0, missing: missing ?? 0 };
    }
    setCounts(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const translate = async (entity: Entity) => {
    setRunning(entity);
    setProgress(0);
    const startMissing = counts[entity].missing || 1;
    let remaining = startMissing;
    let guard = 0;

    try {
      while (remaining > 0 && guard < 200) {
        guard++;
        const { data, error } = await supabase.functions.invoke('translate-content', { body: { entity } });
        if (error) throw error;
        const res = data as { translated: number; remaining: number; error?: string };
        if (res?.error) throw new Error(res.error);
        if (!res || res.translated === 0) {
          remaining = res?.remaining ?? 0;
          break;
        }
        remaining = res.remaining;
        setProgress(Math.round(((startMissing - remaining) / startMissing) * 100));
      }
      toast({ title: t('Překlad dokončen'), description: labels[entity] });
    } catch (e) {
      toast({
        title: t('Chyba překladu'),
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setRunning(null);
      setProgress(0);
      load();
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">{t('Slovenský obsah')}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('Automatický překlad českého obsahu do slovenštiny. Přeloží se jen položky, které slovenskou verzi zatím nemají — ručně upravené texty zůstanou beze změny.')}
          </p>
        </CardContent>
      </Card>

      {ENTITIES.map(e => {
        const c = counts[e.key];
        const done = c.total - c.missing;
        return (
          <Card key={e.key} className="shadow-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium">{labels[e.key]}</p>
                  <p className="text-sm text-muted-foreground">
                    {loading ? t('Načítání...') : t('Přeloženo {done} z {total}', { done, total: c.total })}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={loading || running !== null || c.missing === 0}
                  onClick={() => translate(e.key)}
                >
                  {running === e.key ? (
                    <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Languages className="mr-1 h-4 w-4" />
                  )}
                  {c.missing === 0 ? t('Hotovo') : t('Přeložit ({n})', { n: c.missing })}
                </Button>
              </div>
              {running === e.key && <Progress value={progress} className="h-2" />}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
