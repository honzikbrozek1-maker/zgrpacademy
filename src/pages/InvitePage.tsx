import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Seo from '@/components/Seo';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, CheckCircle } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function InvitePage() {
  const t = useT();
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'used'>('loading');
  const [invite, setInvite] = useState<{ role: string } | null>(null);

  useEffect(() => {
    const checkInvite = async () => {
      if (!code) { setStatus('invalid'); return; }
      // Use secure RPC to look up invite without exposing all invite data
      const { data, error } = await supabase.rpc('lookup_invite', { invite_code: code });
      if (error || !data || data.length === 0) { setStatus('invalid'); return; }
      const inv = data[0];
      if (inv.used_by) { setStatus('used'); return; }
      if (new Date(inv.expires_at) < new Date()) { setStatus('invalid'); return; }
      setInvite({ role: inv.role });
      setStatus('valid');
    };
    checkInvite();
  }, [code]);

  const handleAccept = async () => {
    if (!user || !code) return;
    // Use secure RPC to accept invite (server-side role assignment)
    const { error } = await supabase.rpc('accept_invite', { invite_code: code });
    if (error) {
      toast({ title: t('Chyba'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('Pozvánka přijata!') });
    navigate('/');
  };

  const inviteHead = (
    <Seo
      title={t("Pozvánka do ZGRP Academy")}
      description={t("Přijměte pozvánku do ZGRP Academy a získejte přístup k obsahu platformy.")}
      robots="noindex"
      canonical="https://zgrpacademy.lovable.app/invite"
      ogTitle={t("Pozvánka do ZGRP Academy")}
      ogDescription={t("Pozvánka k registraci v ZGRP Academy.")}
      ogUrl="https://zgrpacademy.lovable.app/invite"
    />
  );

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        {inviteHead}
        <Card className="max-w-md w-full shadow-elevated">
          <CardContent className="p-8 text-center space-y-4">
            <GraduationCap className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-xl font-bold">{t("Pozvánka do ZGRP Academy")}</h1>
            <p className="text-muted-foreground">{t("Pro přijetí pozvánky se nejprve přihlaste nebo zaregistrujte.")}</p>
            <Button onClick={() => navigate('/auth')} className="gradient-primary text-primary-foreground">
              {t("Přihlásit se")}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      {inviteHead}
      <Card className="max-w-md w-full shadow-elevated">
        <CardContent className="p-8 text-center space-y-4">
          {status === 'loading' && <p>{t('Načítání...')}</p>}
          {status === 'invalid' && (
            <>
              <h1 className="text-lg font-semibold">{t('Neplatná pozvánka')}</h1>
              <p className="text-muted-foreground">{t('Tato pozvánka neexistuje nebo vypršela.')}</p>
              <Button onClick={() => navigate('/')}>{t('Zpět')}</Button>
            </>
          )}
          {status === 'used' && (
            <>
              <h1 className="text-lg font-semibold">{t('Pozvánka již byla použita')}</h1>
              <Button onClick={() => navigate('/')}>{t('Zpět')}</Button>
            </>
          )}
          {status === 'valid' && invite && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-success" />
              <h1 className="text-xl font-bold">{t('Pozvánka do ZGRP Academy')}</h1>
              <p className="text-muted-foreground">
                {t('Budete přidáni jako {role}.', { role: invite.role === 'admin' ? t('Administrátor') : t('Uživatel') })}
              </p>
              <Button onClick={handleAccept} className="gradient-primary text-primary-foreground">
                {t('Přijmout pozvánku')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
