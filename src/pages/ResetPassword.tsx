import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Seo from '@/components/Seo';
import zgrpLogo from '@/assets/zgrp-logo.jpg.asset.json';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';
import { useT } from '@/lib/i18n';

const PASSWORD_RE = /^(?=.*[a-zá-ž])(?=.*[A-ZÁ-Ž])(?=.*\d).{8,}$/;

export default function ResetPassword() {
  const t = useT();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || session) setReady('ok');
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      // The recovery link puts tokens in the URL hash; supabase-js consumes them
      // asynchronously, so allow a short grace period before declaring failure.
      if (session) {
        setReady('ok');
      } else if (window.location.hash.includes('access_token')) {
        setTimeout(() => {
          supabase.auth.getSession().then(({ data }) => {
            if (mounted) setReady(data.session ? 'ok' : 'invalid');
          });
        }, 1200);
      } else {
        setReady('invalid');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_RE.test(password)) {
      toast({
        title: t('Slabé heslo'),
        description: t('Heslo musí mít alespoň 8 znaků a obsahovat velké písmeno, malé písmeno a číslo.'),
        variant: 'destructive',
      });
      return;
    }
    if (password !== confirm) {
      toast({ title: t('Hesla se neshodují'), description: t('Zadejte prosím obě hesla stejně.'), variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: t('Chyba'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('Heslo změněno'), description: t('Nyní jste přihlášeni.') });
    navigate('/');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-4">
      <Seo
        title={t('Obnova hesla – ZGRP Academy')}
        description={t('Nastavte si nové heslo do ZGRP Academy.')}
        canonical="https://zgrpacademy.lovable.app/reset-password"
        robots="noindex, nofollow"
      />
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center space-y-2">
          <img src={zgrpLogo.url} alt={t('Logo ZGRP Academy')} className="mx-auto h-16 w-16 rounded-full object-cover mb-2" />
          <h1 className="text-2xl font-semibold leading-none tracking-tight">{t('Nastavení nového hesla')}</h1>
          <CardDescription>{t('Zadejte nové heslo ke svému účtu.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {ready === 'checking' && <p className="text-sm text-muted-foreground text-center">{t('Ověřuji odkaz…')}</p>}

          {ready === 'invalid' && (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                {t('Odkaz pro obnovu hesla je neplatný nebo už vypršel. Nechte si prosím poslat nový.')}
              </p>
              <Button className="w-full gradient-primary text-primary-foreground" onClick={() => navigate('/auth')}>
                {t('Zpět na přihlášení')}
              </Button>
            </div>
          )}

          {ready === 'ok' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    aria-label={t('Nové heslo')}
                    placeholder={t('Nové heslo')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10"
                    minLength={8}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground pl-1">
                  {t('Alespoň 8 znaků, jedno velké písmeno, jedno malé písmeno a číslo.')}
                </p>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  aria-label={t('Nové heslo znovu')}
                  placeholder={t('Nové heslo znovu')}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="pl-10"
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                {loading ? t('Ukládám…') : t('Nastavit nové heslo')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
