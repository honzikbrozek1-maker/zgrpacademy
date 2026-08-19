import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, Package, Briefcase, ArrowRight } from 'lucide-react';
import zgrpLogo from '@/assets/zgrp-logo.jpg.asset.json';
import Seo from '@/components/Seo';
import { useT } from '@/lib/i18n';

export default function PathSelection() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Seo
        title={t('Výběr sekce – ZGRP Academy')}
        description={t('Vyberte si, zda chcete procvičovat produktové znalosti, nebo backoffice ZinzinoGroup.')}
        canonical="https://zgrpacademy.lovable.app/"
        ogUrl="https://zgrpacademy.lovable.app/"
      />
      <div className="w-full max-w-2xl space-y-8 animate-slide-up">
        {/* Header */}
        <div className="text-center space-y-2">
          <img
            src={zgrpLogo.url}
            alt="Logo ZGRP Academy"
            className="mx-auto h-20 w-20 rounded-full object-cover mb-3"
            loading="lazy"
          />

          <h1 className="text-2xl font-bold">{t('Vítejte, {name}!', { name: profile?.display_name || t('uživateli') })}</h1>
          <p className="text-muted-foreground">{t('Co chcete dnes procvičovat?')}</p>
        </div>

        {/* Two paths */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Products path - teal/green */}
          <Card
            className="shadow-card hover:shadow-elevated transition-all cursor-pointer group border-2 border-transparent hover:border-primary/40 relative overflow-hidden"
            onClick={() => navigate('/products')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <CardContent className="p-6 md:p-8 space-y-4 relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">{t('Produkty Zinzino')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('Učte se o produktech, procvičujte znalosti a skládejte testy.')}
                </p>
              </div>
              <div className="flex items-center text-primary text-sm font-medium gap-1 group-hover:gap-2 transition-all">
                {t('Pokračovat')} <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          {/* Backoffice path - indigo/blue */}
          <Card
            className="shadow-card hover:shadow-elevated transition-all cursor-pointer group border-2 border-transparent hover:border-indigo-500/40 relative overflow-hidden"
            onClick={() => navigate('/backoffice')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <CardContent className="p-6 md:p-8 space-y-4 relative">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Briefcase className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">{t('Backoffice & Odměny')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('Práce s backoffice systémem, systém odměn a business nástroje.')}
                </p>
              </div>
              <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-sm font-medium gap-1 group-hover:gap-2 transition-all">
                {t('Pokračovat')} <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
