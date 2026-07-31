import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

/**
 * In-app notifications for admins: shows a toast when someone requests
 * admin access (on load if there are pending requests, and live via realtime).
 */
export function useAdminRequestNotifications() {
  const { isAdmin, user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const notifiedOnLoad = useRef(false);

  useEffect(() => {
    if (!isAdmin || !user) {
      setPendingCount(0);
      return;
    }
    let cancelled = false;

    const loadCount = async () => {
      const { count } = await supabase
        .from('admin_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('target_admin_id', user.id);
      if (cancelled) return;
      const n = count ?? 0;
      setPendingCount(n);
      if (n > 0 && !notifiedOnLoad.current) {
        notifiedOnLoad.current = true;
        toast({
          title: 'Nové žádosti o admin oprávnění',
          description: `Čeká na vyřízení: ${n}. Otevřete Admin panel pro schválení.`,
        });
      }
    };

    loadCount();

    const channel = supabase
      .channel('admin-requests-notify')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_requests', filter: `target_admin_id=eq.${user.id}` },
        () => {
          toast({
            title: 'Nová žádost o admin oprávnění',
            description: 'Někdo žádá o admin oprávnění. Otevřete Admin panel.',
          });
          loadCount();
        },
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_requests' }, loadCount)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isAdmin, user]);

  return { pendingCount };
}
