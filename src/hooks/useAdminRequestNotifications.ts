import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

/**
 * In-app notifications for admins: shows an actionable toast when someone
 * requests admin access (on load if there are pending requests, and live via
 * realtime). Admins can approve/reject straight from the toast.
 * Also mirrors the notification to a native browser notification, so it shows
 * up when the tab is in the background.
 */
export function useAdminRequestNotifications() {
  const { isAdmin, user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const notifiedOnLoad = useRef(false);

  const notifyNative = useCallback((title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, tag: 'admin-request', icon: '/favicon.ico' });
    } catch {
      /* ignore */
    }
  }, []);

  // Ask for permission once, for admins only.
  useEffect(() => {
    if (!isAdmin || typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    const key = 'admin-notif-permission-asked';
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    Notification.requestPermission().catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !user) {
      setPendingCount(0);
      return;
    }
    let cancelled = false;

    const decide = async (requestId: string, approve: boolean) => {
      const { error } = await supabase.rpc('handle_admin_request', {
        p_request_id: requestId,
        p_approve: approve,
      });
      if (error) {
        toast.error('Chyba', { description: error.message });
      } else {
        toast.success(approve ? 'Žádost schválena' : 'Žádost zamítnuta');
      }
      loadCount();
    };

    const showRequestToast = async (requestId: string, userId: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', userId)
        .maybeSingle();
      const name = profile?.display_name || 'Neznámý uživatel';
      notifyNative('Nová žádost o admin oprávnění', `${name} žádá o admin oprávnění.`);
      toast('Nová žádost o admin oprávnění', {
        description: `${name} žádá o admin oprávnění.`,
        duration: 30000,
        action: { label: 'Schválit', onClick: () => decide(requestId, true) },
        cancel: { label: 'Zamítnout', onClick: () => decide(requestId, false) },
      });
    };

    const loadCount = async () => {
      const { data } = await supabase
        .from('admin_requests')
        .select('id, user_id')
        .eq('status', 'pending')
        .eq('target_admin_id', user.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      const rows = data ?? [];
      setPendingCount(rows.length);
      if (rows.length > 0 && !notifiedOnLoad.current) {
        notifiedOnLoad.current = true;
        if (rows.length === 1) {
          showRequestToast(rows[0].id, rows[0].user_id);
        } else {
          notifyNative('Nové žádosti o admin oprávnění', `Čeká na vyřízení: ${rows.length}.`);
          toast('Nové žádosti o admin oprávnění', {
            description: `Čeká na vyřízení: ${rows.length}. Otevřete Admin panel pro schválení.`,
            duration: 30000,
          });
        }
      }
    };

    loadCount();

    const channel = supabase
      .channel('admin-requests-notify')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_requests', filter: `target_admin_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { id: string; user_id: string };
          showRequestToast(row.id, row.user_id);
          loadCount();
        },
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_requests' }, loadCount)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isAdmin, user, notifyNative]);

  return { pendingCount };
}
