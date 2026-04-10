import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, CheckCircle } from 'lucide-react';

export default function InvitePage() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'used'>('loading');
  const [invite, setInvite] = useState<{ role: string } | null>(null);

  useEffect(() => {
    const checkInvite = async () => {
      if (!code) { setStatus('invalid'); return; }
      const { data } = await supabase.from('invite_links').select('*').eq('code', code).single();
      if (!data) { setStatus('invalid'); return; }
      if (data.used_by) { setStatus('used'); return; }
      if (new Date(data.expires_at) < new Date()) { setStatus('invalid'); return; }
      setInvite({ role: data.role });
      setStatus('valid');
    };
    checkInvite();
  }, [code]);

  const handleAccept = async () => {
    if (!user || !code) return;
    // Mark invite as used
    await supabase.from('invite_links').update({ used_by: user.id, used_at: new Date().toISOString() }).eq('code', code);
    // Add role if admin
    if (invite?.role === 'admin') {
      await supabase.from('user_roles').upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id,role' });
    }
    toast({ title: 'Pozvánka přijata!' });
    navigate('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-elevated">
          <CardContent className="p-8 text-center space-y-4">
            <GraduationCap className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-xl font-bold">Pozvánka do ZGRP Academy</h2>
            <p className="text-muted-foreground">Pro přijetí pozvánky se nejprve přihlaste nebo zaregistrujte.</p>
            <Button onClick={() => navigate('/auth')} className="gradient-primary text-primary-foreground">
              Přihlásit se
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full shadow-elevated">
        <CardContent className="p-8 text-center space-y-4">
          {status === 'loading' && <p>Načítání...</p>}
          {status === 'invalid' && (
            <>
              <p className="text-lg font-semibold">Neplatná pozvánka</p>
              <p className="text-muted-foreground">Tato pozvánka neexistuje nebo vypršela.</p>
              <Button onClick={() => navigate('/')}>Zpět</Button>
            </>
          )}
          {status === 'used' && (
            <>
              <p className="text-lg font-semibold">Pozvánka již byla použita</p>
              <Button onClick={() => navigate('/')}>Zpět</Button>
            </>
          )}
          {status === 'valid' && invite && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-success" />
              <h2 className="text-xl font-bold">Pozvánka do ZGRP Academy</h2>
              <p className="text-muted-foreground">
                Budete přidáni jako <strong>{invite.role === 'admin' ? 'Administrátor' : 'Uživatel'}</strong>.
              </p>
              <Button onClick={handleAccept} className="gradient-primary text-primary-foreground">
                Přijmout pozvánku
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
