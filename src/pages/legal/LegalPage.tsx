import { Link } from 'react-router-dom';
import Seo from '@/components/Seo';
import LegalFooter from '@/components/LegalFooter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLang, useT } from '@/lib/i18n';
import type { LegalDoc } from './legalContent';

export default function LegalPage({ doc, path }: { doc: Record<'cs' | 'sk', LegalDoc>; path: string }) {
  const { lang } = useLang();
  const t = useT();
  const content = doc[lang] ?? doc.cs;
  const url = `https://zgrpacademy.lovable.app${path}`;

  return (
    <div className="min-h-screen bg-background">
      <Seo title={`${content.title} – ZGRP Academy`} description={content.description} canonical={url} ogUrl={url} />

      <main className="mx-auto max-w-3xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('Zpět')}
          </Link>
        </Button>

        <h1 className="text-2xl font-bold md:text-3xl">{content.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('Poslední aktualizace')}: {content.updated}
        </p>

        <div className="mt-8 space-y-8">
          {content.sections.map(section => (
            <section key={section.heading} className="space-y-2">
              <h2 className="text-lg font-semibold">{section.heading}</h2>
              {section.paragraphs.map(p => (
                <p key={p} className="text-sm leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
