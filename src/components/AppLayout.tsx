import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { GraduationCap, Home, RotateCcw, Settings, Shield, Sun, Moon, LogOut, User, Share2 } from 'lucide-react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/review', icon: RotateCcw, label: 'Procvičování' },
    { to: '/account', icon: Settings, label: 'Účet' },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', icon: Shield, label: 'Admin' });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg hidden sm:block">Zinzino Academy</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{profile?.display_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account"><Settings className="mr-2 h-4 w-4" /> Nastavení účtu</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin"><Shield className="mr-2 h-4 w-4" /> Administrace</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/share"><Share2 className="mr-2 h-4 w-4" /> Sdílení & Pozvánky</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Odhlásit se</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur-md z-50">
        <div className="flex justify-around py-2">
          {navItems.map(item => {
            const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                <item.icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
