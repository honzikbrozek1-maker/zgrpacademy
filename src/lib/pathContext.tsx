import { createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export type AppPath = 'products' | 'backoffice';

interface PathContextValue {
  currentPath: AppPath;
  category: string;
  basePath: string;
  pathLabel: string;
}

const PathContext = createContext<PathContextValue>({
  currentPath: 'products',
  category: 'products',
  basePath: '/products',
  pathLabel: 'Produkty Zinzino',
});

export const useAppPath = () => useContext(PathContext);

export function PathProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isBackoffice = location.pathname.startsWith('/backoffice');
  
  const value: PathContextValue = isBackoffice
    ? { currentPath: 'backoffice', category: 'backoffice', basePath: '/backoffice', pathLabel: 'Backoffice & Odměny' }
    : { currentPath: 'products', category: 'products', basePath: '/products', pathLabel: 'Produkty Zinzino' };

  return <PathContext.Provider value={value}>{children}</PathContext.Provider>;
}
