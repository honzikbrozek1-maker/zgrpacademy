import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

export interface Crumb {
  label: string;
  to?: string;
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={i}>
              <li className="inline-flex items-center">
                {i === 0 && <Home className="h-3.5 w-3.5 mr-1" aria-hidden />}
                {c.to && !last ? (
                  <Link to={c.to} className="hover:text-foreground transition-colors">
                    {c.label}
                  </Link>
                ) : (
                  <span className={last ? 'text-foreground font-medium' : ''} aria-current={last ? 'page' : undefined}>
                    {c.label}
                  </span>
                )}
              </li>
              {!last && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
