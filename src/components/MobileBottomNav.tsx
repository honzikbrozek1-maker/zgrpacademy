import { Link, useLocation } from 'react-router-dom';
import { Home, Layers, GraduationCap, UserCog, Shield } from 'lucide-react';
import { useAppPath } from '@/lib/pathContext';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export default function MobileBottomNav() {
  const location = useLocation();
  const { basePath } = useAppPath();
  const { isAdmin } = useAuth();

  const items = [
    { to: basePath, icon: Home, label: 'Domů', exact: true },
    { to: `${basePath}/levels`, icon: Layers, label: 'Levely' },
    { to: `${basePath}/diplomas`, icon: GraduationCap, label: 'Diplomy' },
    ...(isAdmin ? [{ to: `${basePath}/admin`, icon: Shield, label: 'Admin' }] : []),
    { to: `${basePath}/account`, icon: UserCog, label: 'Účet' },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      aria-label="Hlavní navigace"
    >
      <ul className="flex items-stretch justify-around">
        {items.map((it) => {
          const active = isActive(it.to, it.exact);
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <it.icon className={cn('h-5 w-5', active && 'scale-110 transition-transform')} />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
