import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useAppPath } from '@/lib/pathContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Home, Layers, Share2, Shield, Sun, Moon, LogOut, GraduationCap, Volume2, VolumeX, UserCog, Settings, Package, Briefcase } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sounds';
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

export function AppSidebar() {
  const { profile, signOut, isAdmin, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    if (!isAdmin || !user) { setPendingRequests(0); return; }
    let cancelled = false;
    const load = async () => {
      const { count } = await supabase
        .from('admin_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('target_admin_id', user.id);
      if (!cancelled) setPendingRequests(count ?? 0);
    };
    load();
    const channel = supabase
      .channel('admin-requests-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_requests' }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [isAdmin, user]);
  const { state, setOpenMobile } = useSidebar();
  const { currentPath, basePath, pathLabel } = useAppPath();
  const accountPath = `${basePath}/account`;
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const isMobile = useIsMobile();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const isBackoffice = currentPath === 'backoffice';
  const accentClass = isBackoffice ? 'text-indigo-500' : 'text-primary';
  const accentBg = isBackoffice ? 'bg-indigo-500/15' : 'gradient-primary';

  const isActive = (path: string) =>
    path === basePath ? location.pathname === basePath : location.pathname.startsWith(path);

  const closeMobileIfNeeded = () => {
    if (isMobile) setOpenMobile(false);
  };

  const topItems = [
    { to: basePath, icon: Home, label: 'Dashboard' },
    { to: `${basePath}/levels`, icon: Layers, label: 'Levely' },
    { to: `${basePath}/diplomas`, icon: GraduationCap, label: 'Moje certifikáty' },
    { to: `${basePath}/share`, icon: Share2, label: 'Sdílet aplikaci' },
    { to: `${basePath}/admin`, icon: Shield, label: 'Admin panel' },
  ];

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <Link to="/" onClick={closeMobileIfNeeded} className="flex items-center gap-2 px-4 py-4 hover:opacity-80 transition-opacity">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accentBg}`}>
            {isBackoffice
              ? <Briefcase className="h-4 w-4 text-white" />
              : <GraduationCap className="h-4 w-4 text-primary-foreground" />
            }
          </div>
          {!collapsed && <span className="font-bold text-lg">ZGRP Academy</span>}
        </Link>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Current path indicator */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/" onClick={closeMobileIfNeeded} className={`flex items-center gap-2 ${accentClass} font-medium`}>
                    {isBackoffice ? <Briefcase className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                    {!collapsed && <span>{pathLabel}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Separator-like spacing */}
              <div className="my-1" />

              {topItems.map(item => {
                const active = isActive(item.to);
                const showBadge = item.to === `${basePath}/admin` && isAdmin && pendingRequests > 0;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} aria-label={item.label}>
                      <Link to={item.to} onClick={closeMobileIfNeeded} className="flex items-center gap-2 relative" aria-label={item.label}>
                        <span className="relative inline-flex">
                          <item.icon className="h-4 w-4" />
                          {showBadge && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar" aria-label={`${pendingRequests} nových žádostí`} />
                          )}
                        </span>
                        {!collapsed && (
                          <span className="flex items-center gap-2">
                            {item.label}
                            {showBadge && (
                              <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-destructive text-destructive-foreground">
                                {pendingRequests}
                              </span>
                            )}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleToggleSound} aria-label={soundOn ? 'Vypnout zvuky' : 'Zapnout zvuky'}>
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {!collapsed && <span>{soundOn ? 'Vypnout zvuky' : 'Zapnout zvuky'}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} aria-label={theme === 'light' ? 'Tmavý režim' : 'Světlý režim'}>
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {!collapsed && <span>{theme === 'light' ? 'Tmavý režim' : 'Světlý režim'}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* Account */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive(accountPath)} className="text-base py-5 min-h-[52px]">
              <Link to={accountPath} onClick={closeMobileIfNeeded} className="flex items-center gap-2">
                <div className="relative">
                  <UserCog className="h-5 w-5" />
                  <Settings className="h-2.5 w-2.5 absolute -bottom-0.5 -right-0.5 text-muted-foreground" />
                </div>
                {!collapsed && <span className="font-medium">{profile?.display_name || 'Můj účet'}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => { closeMobileIfNeeded(); signOut(); }} aria-label="Odhlásit se">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Odhlásit se</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
