import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Briefcase, GraduationCap, CheckCircle2, ArrowRight } from 'lucide-react';
import zgrpLogo from '@/assets/zgrp-logo.jpg.asset.json';
import Seo from '@/components/Seo';
import { useT } from '@/lib/i18n';

export default function Landing() {
  const t = useT();

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={t('ZGRP Academy – vzdělávací platforma pro partnery Zinzino')}
        description={t('Online vzdělávání pro partnery ZinzinoGroup: produktové znalosti a backoffice. Procvičování, testy a certifikáty. Jednorázový registrační poplatek 150 Kč.')}
        canonical="https://zgrpacademy.lovable.app/"
        ogUrl="https://zgrpacademy.lovable.app/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Course',
          name: 'ZGRP Academy',
          description:
            'Vzdělávací platforma pro partnery ZinzinoGroup – produktové znalosti a backoffice, procvičování, testy a certifikáty.',
          inLanguage: 'cs',
          url: 'https://zgrpacademy.lovable.app/',
          provider: {
            '@type': 'Organization',
            name: 'ZGRP Academy',
            url: 'https://zgrpacademy.lovable.app/',
          },
        }}
        jsonLdId="landing-course"
      />

      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <img
              src={zgrpLogo.url}
              alt="Logo ZGRP Academy"
              className="h-9 w-9 rounded-full object-cover"
            />
            <span className="font-semibold">ZGRP Academy</span>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">{t('Přihlásit se')}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-4 py-12">
        <section className="space-y-5 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">
            {t('Vzdělávací platforma pro partnery ZinzinoGroup')}
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            {t('Naučte se produkty Zinzino i práci s backoffice systémem. Procvičujte pomocí kvízů a doplňovaček, skládejte testy a získejte certifikát o absolvování.')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                {t('Začít se učit')} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auth">{t('Už mám účet')}</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('Jednorázový registrační poplatek 150 Kč – bez měsíčních plateb.')}
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-center text-2xl font-bold">{t('Dvě vzdělávací cesty')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-card">
              <CardContent className="space-y-3 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{t('Produkty Zinzino')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('Učte se o produktech, procvičujte znalosti a skládejte testy.')}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="space-y-3 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15">
                  <Briefcase className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold">{t('Backoffice & Odměny')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('Práce s backoffice systémem, systém odměn a business nástroje.')}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-center text-2xl font-bold">{t('Jak to funguje')}</h2>
          <ul className="grid gap-4 md:grid-cols-3">
            <li className="rounded-xl border p-5">
              <CheckCircle2 className="mb-2 h-5 w-5 text-primary" />
              <h3 className="mb-1 font-semibold">{t('1. Procvičování')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('Kvízy, kartičky a doplňovačky s ukládáním postupu – můžete kdykoli navázat.')}
              </p>
            </li>
            <li className="rounded-xl border p-5">
              <CheckCircle2 className="mb-2 h-5 w-5 text-primary" />
              <h3 className="mb-1 font-semibold">{t('2. Testy')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('Závěrečné testy úrovní s vyhodnocením odpovědí, abyste věděli, kde udělat pokrok.')}
              </p>
            </li>
            <li className="rounded-xl border p-5">
              <GraduationCap className="mb-2 h-5 w-5 text-primary" />
              <h3 className="mb-1 font-semibold">{t('3. Certifikát')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('Po zvládnutí skupiny úrovní získáte certifikát o absolvování odborné zkoušky.')}
              </p>
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold">{t('Začněte ještě dnes')}</h2>
          <p className="mx-auto mb-5 max-w-xl text-muted-foreground">
            {t('Vytvořte si účet, uhraďte jednorázový registrační poplatek a získejte přístup ke všem materiálům v češtině i slovenštině.')}
          </p>
          <Button asChild size="lg">
            <Link to="/auth">{t('Vytvořit účet')}</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        ZGRP Academy
      </footer>
    </div>
  );
}
