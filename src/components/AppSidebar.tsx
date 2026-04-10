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
import { Home, Layers, Share2, Shield, Sun, Moon, UserCog, LogOut, GraduationCap } from 'lucide-react';

export function AppSidebar() {
  const { isAdmin, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const topItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/levels', icon: Layers, label: 'Levely' },
    { to: '/share', icon: Share2, label: 'Sdílet aplikaci' },
    { to: '/admin', icon: Shield, label: 'Admin panel' },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-lg">Zinzino Academy</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {topItems.map(item => {
                const active = isActive(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.to} className="flex items-center gap-2">
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
            <SidebarMenuButton onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {!collapsed && <span>{theme === 'light' ? 'Tmavý režim' : 'Světlý režim'}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/account')}>
              <Link to="/account" className="flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                {!collapsed && <span>{profile?.display_name || 'Můj účet'}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Odhlásit se</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
