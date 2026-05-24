import { ReactNode, useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import MobileBottomNav from '@/components/MobileBottomNav';
import { Home, UserCog } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppPath } from '@/lib/pathContext';
import { useSectionProfile } from '@/hooks/useSectionProfile';
import { useTheme } from '@/lib/theme';

export default function AppLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { basePath, category } = useAppPath();
  const { sectionProfile } = useSectionProfile(category);
  const { setColorScheme } = useTheme();
  const accountPath = `${basePath}/account`;
  const isOnAccount = location.pathname === accountPath;
  const isOnDashboard = location.pathname === basePath;
  const colorStorageKey = `section-color-scheme:${category}`;

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const cachedColorScheme = localStorage.getItem(colorStorageKey) || 'teal';
    setColorScheme(cachedColorScheme);
  }, [colorStorageKey, setColorScheme]);

  useEffect(() => {
    if (!sectionProfile?.color_scheme) return;

    if (typeof window !== 'undefined') {
      localStorage.setItem(colorStorageKey, sectionProfile.color_scheme);
    }

    setColorScheme(sectionProfile.color_scheme);
  }, [colorStorageKey, sectionProfile?.color_scheme, setColorScheme]);

  const handleAccountClick = () => {
    if (isOnAccount) {
      navigate(-1);
    } else {
      navigate(accountPath);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b bg-card/80 backdrop-blur-md sticky top-0 z-50 px-3">
            <SidebarTrigger />
            {isMobile && (
              <div className="flex items-center gap-1">
                {!isOnDashboard && (
                  <button
                    onClick={() => navigate(basePath)}
                    className="p-3 -m-1 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Dashboard"
                  >
                    <Home className="h-5 w-5 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={handleAccountClick}
                  className="p-3 -m-1 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Nastavení účtu"
                >
                  <UserCog className="h-6 w-6 text-muted-foreground" />
                </button>
              </div>
            )}
          </header>
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
