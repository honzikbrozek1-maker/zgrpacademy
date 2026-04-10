import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, Package, Briefcase, ArrowRight } from 'lucide-react';

export default function PathSelection() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8 animate-slide-up">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-3">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Vítejte, {profile?.display_name || 'uživateli'}!</h1>
          <p className="text-muted-foreground">Co chcete dnes procvičovat?</p>
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
                <h2 className="text-xl font-bold mb-1">Produkty Zinzino</h2>
                <p className="text-sm text-muted-foreground">
                  Učte se o produktech, procvičujte znalosti a skládejte testy.
                </p>
              </div>
              <div className="flex items-center text-primary text-sm font-medium gap-1 group-hover:gap-2 transition-all">
                Pokračovat <ArrowRight className="h-4 w-4" />
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
                <h2 className="text-xl font-bold mb-1">Backoffice & Odměny</h2>
                <p className="text-sm text-muted-foreground">
                  Práce s backoffice systémem, systém odměn a business nástroje.
                </p>
              </div>
              <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-sm font-medium gap-1 group-hover:gap-2 transition-all">
                Pokračovat <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
