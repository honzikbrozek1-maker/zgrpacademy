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
import { Home, Layers, Share2, Shield, Sun, Moon, LogOut, GraduationCap, Volume2, VolumeX, UserCog, Settings } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sounds';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const isMobile = useIsMobile();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

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
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleToggleSound}>
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {!collapsed && <span>{soundOn ? 'Vypnout zvuky' : 'Zapnout zvuky'}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {!collapsed && <span>{theme === 'light' ? 'Tmavý režim' : 'Světlý režim'}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* Account */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/account')} className="text-base py-5 min-h-[52px]">
              <Link to="/account" onClick={closeMobileIfNeeded} className="flex items-center gap-2">
                <div className="relative">
                  <UserCog className="h-5 w-5" />
                  <Settings className="h-2.5 w-2.5 absolute -bottom-0.5 -right-0.5 text-muted-foreground" />
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
