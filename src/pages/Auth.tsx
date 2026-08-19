import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Seo from '@/components/Seo';
import zgrpLogo from '@/assets/zgrp-logo.jpg.asset.json';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Mail, Lock, User } from 'lucide-react';
import { InAppBrowserNotice } from '@/components/InAppBrowserNotice';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useT } from '@/lib/i18n';

export default function Auth() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // When "stay signed in" is off, the session lives only for this browser tab.
    try {
      localStorage.setItem('auth-remember', rememberMe ? '1' : '0');
      sessionStorage.setItem('auth-tab', '1');
    } catch {
      /* storage may be unavailable in private mode */
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: t('Chyba přihlášení'), description: error.message, variant: 'destructive' });
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    const target = (resetEmail || email).trim();
    if (!target) {
      toast({ title: t('Zadejte e-mail'), description: t('Napište e-mail, na který máte účet.'), variant: 'destructive' });
      return;
    }
    setResetSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetSending(false);
    if (error) {
      toast({ title: t('Chyba'), description: error.message, variant: 'destructive' });
      return;
    }
    setResetOpen(false);
    toast({
      title: t('E-mail odeslán'),
      description: t('Na {n} jsme poslali odkaz pro nastavení nového hesla. Zkontrolujte i spam.', { n: target }),
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^(?=.*[a-zá-ž])(?=.*[A-ZÁ-Ž])(?=.*\d).{8,}$/.test(password)) {
      toast({
        title: t('Slabé heslo'),
        description: t('Heslo musí mít alespoň 8 znaků a obsahovat velké písmeno, malé písmeno a číslo.'),
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin },
    });
    if (error) {
      toast({ title: t('Chyba registrace'), description: error.message, variant: 'destructive' });
    } else if (data.session) {
      // Auto-confirmed, user is logged in
      toast({ title: t('Registrace úspěšná'), description: t('Vítejte!') });
      navigate('/');
    } else {
      toast({ title: t('Registrace úspěšná'), description: t('Zkontrolujte svůj e-mail pro potvrzení.') });
    }
    setLoading(false);
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({ title: t('Chyba přihlášení'), description: String(result.error), variant: 'destructive' });
      setLoading(false);
      return;
    }
    if (result.redirected) {
      return;
    }
    navigate('/');
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-4">
      <Seo
        title={t('Přihlášení – ZGRP Academy')}
        description={t('Přihlaste se nebo si vytvořte účet v ZGRP Academy – vzdělávací platformě pro partnery ZinzinoGroup.')}
        canonical="https://zgrpacademy.lovable.app/auth"
        ogTitle={t('Přihlášení – ZGRP Academy')}
        ogDescription={t('Vstup do vzdělávací platformy ZGRP Academy.')}
        ogUrl="https://zgrpacademy.lovable.app/auth"
      />
      <InAppBrowserNotice className="w-full max-w-md" />
      <Card className="w-full max-w-md shadow-elevated relative">
        <LanguageSwitcher className="absolute top-3 right-3" />
        <CardHeader className="text-center space-y-2">
          <img
            src={zgrpLogo.url}
            alt={t('Logo ZGRP Academy')}
            className="mx-auto h-20 w-20 rounded-full object-cover mb-2"
          />

          <h1 className="text-2xl font-semibold leading-none tracking-tight">{t('Přihlášení do ZGRP Academy')}</h1>
          <CardDescription>{t('Vzdělávací platforma pro partnery ZinzinoGroup')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full mb-2 flex items-center gap-2"
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('Přihlásit se přes Google')}
          </Button>

          <Button
            variant="outline"
            className="w-full mb-4 flex items-center gap-2"
            onClick={() => handleOAuthLogin('apple')}
            disabled={loading}
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16.365 1.43c0 1.14-.42 2.2-1.19 3.02-.89.96-2.02 1.53-3.06 1.44a3.4 3.4 0 0 1 1.2-2.94c.76-.83 2.06-1.44 3.05-1.52zM20.5 17.02c-.55 1.27-.82 1.84-1.53 2.97-.99 1.57-2.39 3.53-4.12 3.54-1.54.01-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.73-.02-3.05-1.79-4.04-3.36C.06 16.12-.2 10.98 1.5 8.25c1.2-1.94 3.1-3.07 4.88-3.07 1.82 0 2.96 1 4.46 1 1.46 0 2.35-1 4.45-1 1.59 0 3.27.86 4.47 2.35-3.93 2.15-3.29 7.76.74 9.49z" />
            </svg>
            {t('Přihlásit se přes Apple')}
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">{t('nebo')}</span></div>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('Přihlášení')}</TabsTrigger>
              <TabsTrigger value="register">{t('Registrace')}</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={t('E-mail')} type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" autoComplete="email" required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={t('Heslo')} type="password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" autoComplete="current-password" required />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <Checkbox checked={rememberMe} onCheckedChange={v => setRememberMe(v === true)} />
                    {t('Zůstat přihlášen')}
                  </label>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => { setResetEmail(email); setResetOpen(true); }}
                  >
                    {t('Zapomenuté heslo?')}
                  </button>
                </div>
                <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                  {loading ? t('Přihlašování...') : t('Přihlásit se')}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
                <div className="space-y-1">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('Např. Tomáš Fuk')}
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="pl-10"
                      autoComplete="name"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pl-1">
                    {t('Zadejte své celé jméno a příjmení – bude uvedeno na certifikátu.')}
                  </p>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={t('E-mail')} type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
                </div>
                <div className="space-y-1">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={t('Heslo')} type="password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required minLength={8} />
                  </div>
                  <p className="text-xs text-muted-foreground pl-1">
                    {t('Alespoň 8 znaků, jedno velké písmeno, jedno malé písmeno a číslo. Speciální znaky nejsou nutné.')}
                  </p>
                </div>
                <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                  {loading ? t('Registrace...') : t('Zaregistrovat se')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Zapomenuté heslo')}</DialogTitle>
            <DialogDescription>
              {t('Zadejte e-mail, kterým jste se registrovali. Pošleme vám odkaz pro nastavení nového hesla.')}
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder={t('E-mail')}
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              className="pl-10"
              autoComplete="email"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>{t('Zrušit')}</Button>
            <Button
              className="gradient-primary text-primary-foreground"
              onClick={handleResetPassword}
              disabled={resetSending}
            >
              {resetSending ? t('Odesílám…') : t('Odeslat odkaz')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
