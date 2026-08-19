import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Share2, Copy, Plus, Link as LinkIcon, Users, Shield, Trash2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useT } from '@/lib/i18n';

interface InviteLink {
  id: string;
  code: string;
  role: string;
  used_by: string | null;
  expires_at: string;
  created_at: string;
  created_by: string;
}

const APP_URL = 'https://zgrpacademy.lovable.app';

export default function AdminShare() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const t = useT();
  const [invites, setInvites] = useState<InviteLink[]>([]);
  const [newRole, setNewRole] = useState<string>('user');

  useEffect(() => {
    if (user) fetchInvites();
  }, [user]);

  const fetchInvites = async () => {
    if (!user) return;

    // Auto-delete expired, unused invites
    await supabase
      .from('invite_links')
      .delete()
      .eq('created_by', user.id)
      .is('used_by', null)
      .lt('expires_at', new Date().toISOString());

    const { data } = await supabase
      .from('invite_links')
      .select('*')
      .eq('created_by', user.id)
      .is('used_by', null)
      .order('created_at', { ascending: false });

    if (data) setInvites(data);
  };

  const createInvite = async () => {
    if (!user) return;

    const { error } = await supabase.from('invite_links').insert({
      created_by: user.id,
      role: newRole as 'admin' | 'user',
    });

    if (error) {
      toast({ title: t('Chyba'), description: error.message, variant: 'destructive' });
      return;
    }

    fetchInvites();
    toast({ title: t('Pozvánka vytvořena') });
  };

  const deleteInvite = async (inviteId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('invite_links')
      .delete()
      .eq('id', inviteId)
      .eq('created_by', user.id)
      .is('used_by', null);

    if (error) {
      toast({ title: t('Chyba'), description: error.message, variant: 'destructive' });
      return;
    }

    setInvites((currentInvites) => currentInvites.filter((invite) => invite.id !== inviteId));
    toast({ title: t('Pozvánka smazána') });
  };

  const copyLink = (code: string) => {
    const url = `${APP_URL}/invite/${code}`;
    navigator.clipboard.writeText(url);
    toast({ title: t('Odkaz zkopírován'), description: url });
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Share2 className="h-6 w-6 text-primary" /> {t('Sdílet aplikaci')}
        </h1>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><LinkIcon className="h-5 w-5" /> {t('Odkaz na aplikaci')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('Sdílejte tento odkaz pro přístup k aplikaci:')}</p>
            <div className="flex gap-2">
              <Input value={APP_URL} readOnly />
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(APP_URL); toast({ title: t('Odkaz zkopírován') }); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <>
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="h-5 w-5" /> {t('Vytvořit pozvánku')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('Vytvořte pozvánkový odkaz a sdílejte jej s uživatelem. Odkaz je platný 7 dní.')}</p>
                <div className="flex gap-2">
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user"><Users className="mr-1 h-3 w-3 inline" /> {t('Uživatel')}</SelectItem>
                      <SelectItem value="admin"><Shield className="mr-1 h-3 w-3 inline" /> {t('Admin')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={createInvite}>
                    <Plus className="mr-1 h-4 w-4" /> {t('Vytvořit pozvánku')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {invites.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">{t('Vaše aktivní pozvánky')}</h2>
                <div className="space-y-2">
                  {invites.map(inv => (
                    <Card key={inv.id} className="shadow-card">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={inv.role === 'admin' ? 'default' : 'secondary'}>
                              {inv.role === 'admin' ? t('Admin') : t('Uživatel')}
                            </Badge>
                            <Badge variant="outline" className="text-success">{t('Aktivní')}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('Vytvořena:')} {new Date(inv.created_at).toLocaleDateString('cs')} • {t('Vyprší:')} {new Date(inv.expires_at).toLocaleDateString('cs')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => copyLink(inv.code)}>
                            <Copy className="mr-1 h-3 w-3" /> {t('Kopírovat')}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteInvite(inv.id)}>
                            <Trash2 className="mr-1 h-3 w-3" /> {t('Smazat')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
