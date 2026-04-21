import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Share2, Copy, Plus, Link as LinkIcon, Users, Shield, Mail, Send, Trash2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

interface InviteLink {
  id: string;
  code: string;
  role: string;
  used_by: string | null;
  expires_at: string;
  created_at: string;
  created_by: string;
}

export default function AdminShare() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [invites, setInvites] = useState<InviteLink[]>([]);
  const [newRole, setNewRole] = useState<string>('user');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) fetchInvites();
  }, [user]);

  const fetchInvites = async () => {
    if (!user) return;

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

    const { data, error } = await supabase.from('invite_links').insert({
      created_by: user.id,
      role: newRole as 'admin' | 'user',
    }).select().single();

    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }

    fetchInvites();

    if (email && data) {
      const url = `https://zgrpacademy.vercel.app/invite/${data.code}`;
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Pozvánka vytvořena',
        description: `Odkaz zkopírován do schránky. Pošlete ho na: ${email}`,
      });
      setEmail('');
    } else {
      toast({ title: 'Pozvánka vytvořena' });
    }
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
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }

    setInvites((currentInvites) => currentInvites.filter((invite) => invite.id !== inviteId));
    toast({ title: 'Pozvánka smazána' });
  };

  const copyLink = (code: string) => {
    const url = `https://zgrpacademy.vercel.app/invite/${code}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Odkaz zkopírován', description: url });
  };

  const appUrl = 'https://zgrpacademy.vercel.app';

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Share2 className="h-6 w-6 text-primary" /> Sdílet aplikaci
        </h1>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><LinkIcon className="h-5 w-5" /> Odkaz na aplikaci</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Sdílejte tento odkaz pro přístup k aplikaci:</p>
            <div className="flex gap-2">
              <Input value={appUrl} readOnly />
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(appUrl); toast({ title: 'Odkaz zkopírován' }); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <>
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Mail className="h-5 w-5" /> Pozvat uživatele</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Vytvořte pozvánku a pošlete ji přímo na e-mail:</p>
                <div className="space-y-3">
                  <Input
                    type="email"
                    placeholder="E-mail příjemce (volitelné)"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user"><Users className="mr-1 h-3 w-3 inline" /> Uživatel</SelectItem>
                        <SelectItem value="admin"><Shield className="mr-1 h-3 w-3 inline" /> Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={createInvite}>
                      {email ? <><Send className="mr-1 h-4 w-4" /> Vytvořit a zkopírovat</> : <><Plus className="mr-1 h-4 w-4" /> Vytvořit pozvánku</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {invites.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Vaše aktivní pozvánky</h2>
                <div className="space-y-2">
                  {invites.map(inv => (
                    <Card key={inv.id} className="shadow-card">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={inv.role === 'admin' ? 'default' : 'secondary'}>
                              {inv.role === 'admin' ? 'Admin' : 'Uživatel'}
                            </Badge>
                            <Badge variant="outline" className="text-success">Aktivní</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Vytvořena: {new Date(inv.created_at).toLocaleDateString('cs')} • Vyprší: {new Date(inv.expires_at).toLocaleDateString('cs')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => copyLink(inv.code)}>
                            <Copy className="mr-1 h-3 w-3" /> Kopírovat
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteInvite(inv.id)}>
                            <Trash2 className="mr-1 h-3 w-3" /> Smazat
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
