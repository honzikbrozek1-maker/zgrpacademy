import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { UserCog } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function AppLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b bg-card/80 backdrop-blur-md sticky top-0 z-50 px-3">
            <SidebarTrigger />
            {isMobile && (
              <Link to="/account" className="p-2 rounded-lg hover:bg-muted transition-colors">
                <UserCog className="h-5 w-5 text-muted-foreground" />
              </Link>
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
