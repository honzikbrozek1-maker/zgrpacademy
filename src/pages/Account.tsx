import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useAppPath } from '@/lib/pathContext';
import { useSectionProfile } from '@/hooks/useSectionProfile';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Lock, Palette, Volume2, Trash2, Receipt } from 'lucide-react';
import { colorSchemes } from '@/lib/colorSchemes';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sounds';
import AppLayout from '@/components/AppLayout';
import { InvoicesList } from '@/components/InvoicesList';

export default function Account() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { setColorScheme } = useTheme();
  const { category } = useAppPath();
  const { sectionProfile, refreshSectionProfile } = useSectionProfile(category);
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [selectedSchemeId, setSelectedSchemeId] = useState(sectionProfile?.color_scheme || 'teal');

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile]);

  useEffect(() => {
    if (!sectionProfile?.color_scheme) return;

    setSelectedSchemeId(sectionProfile.color_scheme);
    setColorScheme(sectionProfile.color_scheme);
  }, [sectionProfile?.color_scheme, setColorScheme]);

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
    const previousSchemeId = selectedSchemeId;

    setSelectedSchemeId(schemeId);
    setColorScheme(schemeId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`section-color-scheme:${category}`, schemeId);
    }

    if (user) {
      const { error } = await supabase
        .from('section_profiles')
        .update({ color_scheme: schemeId })
        .eq('user_id', user.id)
        .eq('category', category);

      if (error) {
        setSelectedSchemeId(previousSchemeId);
        setColorScheme(previousSchemeId);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`section-color-scheme:${category}`, previousSchemeId);
        }
        toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
        return;
      }

      refreshSectionProfile();
    }

    toast({ title: 'Barevné schéma změněno' });
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundOn(enabled);
    setSoundEnabled(enabled);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SMAZAT') return;
    if (user) {
      await supabase.from('review_items').delete().eq('user_id', user.id);
      await supabase.rpc('reset_my_progress');
      await supabase.from('section_profiles').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('user_id', user.id);
      await supabase.from('user_roles').delete().eq('user_id', user.id);
    }
    toast({ title: 'Účet smazán', description: 'Vaše data byla odstraněna.' });
    await signOut();
  };

  const currentSchemeId = selectedSchemeId;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4 animate-slide-up pb-20">
        <h1 className="text-2xl font-bold">Nastavení účtu</h1>

        <Card className="shadow-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4" /> Profil</div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{user?.email}</span>
            </div>
            <div className="flex gap-2">
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Zobrazované jméno" className="flex-1" />
              <Button onClick={handleUpdateProfile} disabled={loading} size="sm" className="gradient-primary text-primary-foreground">
                Uložit
              </Button>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Zvukové efekty</span>
              </div>
              <Switch checked={soundOn} onCheckedChange={handleSoundToggle} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><Palette className="h-4 w-4" /> Barevné schéma ({category === 'products' ? 'Produkty' : 'Backoffice'})</div>
            <div className="grid grid-cols-6 gap-2">
              {colorSchemes.map(scheme => {
                const isActive = currentSchemeId === scheme.id;
                const hsl = scheme.light['--primary'];
                return (
                  <button
                    key={scheme.id}
                    onClick={() => handleColorSchemeChange(scheme.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                      isActive ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: `hsl(${hsl})` }}
                    />
                    <span className="text-[10px]">{scheme.emoji}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><Lock className="h-4 w-4" /> Změna hesla</div>
            <div className="flex gap-2">
              <Input type="password" placeholder="Nové heslo (min. 6 znaků)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="flex-1" />
              <Button onClick={handleChangePassword} disabled={loading} variant="outline" size="sm">
                Změnit
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><Receipt className="h-4 w-4" /> Faktury</div>
            <InvoicesList />
          </CardContent>
        </Card>

        <Card className="shadow-card border-destructive/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive"><Trash2 className="h-4 w-4" /> Smazání účtu</div>
            {!showDeleteConfirm ? (
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowDeleteConfirm(true)}>
                Smazat účet
              </Button>
            ) : (
              <div className="space-y-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-xs font-medium text-destructive">Pro potvrzení napište „SMAZAT":</p>
                <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="SMAZAT" className="border-destructive/30 h-8 text-sm" />
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" disabled={deleteConfirmText !== 'SMAZAT'} onClick={handleDeleteAccount}>Potvrdit</Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>Zrušit</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
