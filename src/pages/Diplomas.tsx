import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import DiplomaCertificate from '@/components/DiplomaCertificate';

interface Diploma {
  diploma_id: string;
  group_id: string;
  group_title: string;
  category: string;
  diploma_title: string;
  diploma_subtitle: string;
  diploma_body_text: string;
  diploma_intro_text: string;
  diploma_award_title: string;
  diploma_note_text: string;
  diploma_issuer: string;
  diploma_signatory: string;
  diploma_validity_years: number;
  average_score: number;
  issued_at: string;
}

export default function Diplomas() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [diplomas, setDiplomas] = useState<Diploma[]>([]);
  const [selected, setSelected] = useState<Diploma | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Auto-issue diplomas for any group the user is now eligible for
      // (e.g. groups created/assigned after the level was already completed).
      const { data: groups } = await supabase.from('level_groups').select('id');
      if (groups) {
        await Promise.all(
          groups.map(g => supabase.rpc('issue_diploma_if_eligible', { p_group_id: g.id }))
        );
      }
      const { data } = await supabase.rpc('list_my_diplomas');
      if (data) setDiplomas(data as Diploma[]);
      setLoading(false);
    })();
  }, []);

  if (selected) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8 max-w-3xl mx-auto pb-20 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Zpět na seznam
          </Button>
          <DiplomaCertificate
            title={selected.diploma_title}
            subtitle={selected.diploma_subtitle}
            introText={selected.diploma_intro_text}
            awardTitle={selected.diploma_award_title}
            noteText={selected.diploma_note_text}
            issuer={selected.diploma_issuer}
            signatory={selected.diploma_signatory}
            validityYears={selected.diploma_validity_years}
            userName={profile?.display_name || 'Uživatel'}
            groupTitle={selected.group_title}
            score={selected.average_score}
            issuedAt={selected.issued_at}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-slide-up pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Moje certifikáty</h1>
            <p className="text-sm text-muted-foreground">Certifikáty získané za dokončené skupiny levelů.</p>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Načítání...</p>
        ) : diplomas.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center space-y-3">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Zatím nemáte žádný certifikát. Dokončete všechny levely ve skupině s požadovaným skóre.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {diplomas.map(d => (
              <Card key={d.diploma_id} className="shadow-card cursor-pointer hover:shadow-elevated transition-all" onClick={() => setSelected(d)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold truncate">{d.group_title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {d.diploma_title} · {new Date(d.issued_at).toLocaleDateString('cs-CZ')}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-primary shrink-0">{d.average_score}%</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
