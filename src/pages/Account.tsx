import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

import { User, Mail, Lock, Trophy, Star, BookOpen, Palette, Volume2, Trash2 } from 'lucide-react';
import { colorSchemes } from '@/lib/colorSchemes';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sounds';
import AppLayout from '@/components/AppLayout';

export default function Account() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { colorScheme, setColorScheme } = useTheme();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Uloženo', description: 'Profil byl aktualizován.' });
      await refreshProfile();
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Chyba', description: 'Heslo musí mít alespoň 6 znaků.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Heslo změněno', description: 'Vaše heslo bylo úspěšně změněno.' });
      setNewPassword('');
    }
    setLoading(false);
  };

  const handleColorSchemeChange = async (schemeId: string) => {
    setColorScheme(schemeId);
    if (user) {
      await supabase.from('profiles').update({ color_scheme: schemeId }).eq('user_id', user.id);
    }
    toast({ title: 'Barevné schéma změněno' });
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundOn(enabled);
    setSoundEnabled(enabled);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SMAZAT') return;
    // Delete user data then sign out
    if (user) {
      await supabase.from('review_items').delete().eq('user_id', user.id);
      await supabase.from('user_progress').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('user_id', user.id);
      await supabase.from('user_roles').delete().eq('user_id', user.id);
    }
    toast({ title: 'Účet smazán', description: 'Vaše data byla odstraněna.' });
    await signOut();
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 animate-slide-up pb-20">
        <h1 className="text-2xl font-bold">Nastavení účtu</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 mx-auto text-amber-500 mb-1" />
              <p className="text-2xl font-bold">{profile?.total_points || 0}</p>
              <p className="text-xs text-muted-foreground">Body</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 mx-auto text-violet-500 mb-1" />
              <p className="text-2xl font-bold">{profile?.current_level || 1}</p>
              <p className="text-xs text-muted-foreground">Level</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <BookOpen className="h-6 w-6 mx-auto text-emerald-500 mb-1" />
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-muted-foreground">Aktivita</p>
            </CardContent>
          </Card>
        </div>

        {/* Profile */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profil</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">E-mail</label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user?.email}</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Zobrazované jméno</label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="mt-1" />
            </div>
            <Button onClick={handleUpdateProfile} disabled={loading} className="gradient-primary text-primary-foreground">
              Uložit změny
            </Button>
          </CardContent>
        </Card>

        {/* Sound settings */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><Volume2 className="h-5 w-5" /> Zvuky</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Zvukové efekty</p>
                <p className="text-xs text-muted-foreground">Přehrávat zvuk při správné a špatné odpovědi</p>
              </div>
              <Switch checked={soundOn} onCheckedChange={handleSoundToggle} />
            </div>
          </CardContent>
        </Card>

        {/* Color scheme */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Barevné schéma</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Vyberte si barvu, která se vám líbí nejvíce:</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {colorSchemes.map(scheme => {
                const isActive = colorScheme === scheme.id;
                const hsl = scheme.light['--primary'];
                return (
                  <button
                    key={scheme.id}
                    onClick={() => handleColorSchemeChange(scheme.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      isActive ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: `hsl(${hsl})` }}
                    />
                    <span className="text-xs font-medium">{scheme.emoji}</span>
                    <span className="text-xs">{scheme.name}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Změna hesla</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input type="password" placeholder="Nové heslo (min. 6 znaků)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <Button onClick={handleChangePassword} disabled={loading} variant="outline">
              Změnit heslo
            </Button>
          </CardContent>
        </Card>

        {/* Delete account */}
        <Card className="shadow-card border-destructive/30">
          <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Smazání účtu</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Smazání účtu je nevratné. Všechna vaše data budou odstraněna.
            </p>
            {!showDeleteConfirm ? (
              <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-1 h-4 w-4" /> Smazat účet
              </Button>
            ) : (
              <div className="space-y-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-sm font-medium text-destructive">Pro potvrzení napište „SMAZAT":</p>
                <Input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="SMAZAT"
                  className="border-destructive/30"
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    disabled={deleteConfirmText !== 'SMAZAT'}
                    onClick={handleDeleteAccount}
                  >
                    Potvrdit smazání
                  </Button>
                  <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>
                    Zrušit
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
