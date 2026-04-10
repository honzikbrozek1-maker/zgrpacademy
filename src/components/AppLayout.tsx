import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { UserCog } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function AppLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const isOnAccount = location.pathname === '/account';

  const handleAccountClick = () => {
    if (isOnAccount) {
      navigate(-1);
    } else {
      navigate('/account');
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
              <button
                onClick={handleAccountClick}
                className="p-3 -m-1 rounded-lg hover:bg-muted transition-colors"
              >
                <UserCog className="h-6 w-6 text-muted-foreground" />
              </button>
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
