import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
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
import { Home, Layers, Share2, Shield, Sun, Moon, UserCog, LogOut, GraduationCap, Volume2, VolumeX, Settings } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { isSoundEnabled, setSoundEnabled, getVolume, setVolume } from '@/lib/sounds';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppSidebar() {
  const { isAdmin, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const isMobile = useIsMobile();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [vol, setVol] = useState(getVolume());

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const closeMobileIfNeeded = () => {
    if (isMobile) setOpenMobile(false);
  };

  const topItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/levels', icon: Layers, label: 'Levely' },
    { to: '/share', icon: Share2, label: 'Sdílet aplikaci' },
    { to: '/admin', icon: Shield, label: 'Admin panel' },
  ];

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const handleVolumeChange = (value: number[]) => {
    const v = value[0];
    setVol(v);
    setVolume(v);
    if (v === 0 && soundOn) { setSoundOn(false); setSoundEnabled(false); }
    if (v > 0 && !soundOn) { setSoundOn(true); setSoundEnabled(true); }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <Link to="/" onClick={closeMobileIfNeeded} className="flex items-center gap-2 px-4 py-4 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-lg">Zinzino Academy</span>}
        </Link>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {topItems.map(item => {
                const active = isActive(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.to} onClick={closeMobileIfNeeded} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.label}</span>}
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
          {/* Theme toggle */}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {!collapsed && <span>{theme === 'light' ? 'Tmavý režim' : 'Světlý režim'}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* Volume control */}
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-3 py-2">
              <button onClick={handleToggleSound} className="shrink-0">
                {soundOn ? <Volume2 className="h-4 w-4 text-muted-foreground" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
              </button>
              {!collapsed && (
                <Slider
                  value={[vol]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={5}
                  className="flex-1"
                />
              )}
            </div>
          </SidebarMenuItem>
          {/* Account */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/account')} className="text-base py-4 min-h-[48px]">
              <Link to="/account" onClick={closeMobileIfNeeded} className="flex items-center gap-2">
                <div className="relative">
                  <UserCog className="h-5 w-5" />
                </div>
                {!collapsed && <span className="font-medium">{profile?.display_name || 'Můj účet'}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => { closeMobileIfNeeded(); signOut(); }}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Odhlásit se</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
