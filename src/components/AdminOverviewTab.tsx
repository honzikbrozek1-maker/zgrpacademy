import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, CreditCard, TrendingUp, Users } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface DailyPoint {
  day: string;
  registrations: number;
  payments: number;
}

interface Stats {
  total_users: number;
  paid_users: number;
  users_7d: number;
  users_30d: number;
  revenue_total: number;
  revenue_30d: number;
  payments_total: number;
  payments_30d: number;
  daily: DailyPoint[];
}

const formatCzk = (haleru: number) =>
  new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(haleru / 100);

const formatDay = (day: string) => {
  const [, month, date] = day.split('-');
  return `${Number(date)}.${Number(month)}.`;
};

export default function AdminOverviewTab() {
  const t = useT();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('admin_overview_stats');
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      setStats(data as unknown as Stats);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-sm text-destructive">{t('Nepodařilo se načíst přehled:')} {error}</p>;
  if (!stats) return <p className="text-sm text-muted-foreground">{t('Načítání přehledu…')}</p>;

  const conversion = stats.total_users > 0 ? Math.round((stats.paid_users / stats.total_users) * 100) : 0;

  const cards = [
    {
      label: t('Registrovaní uživatelé'),
      value: String(stats.total_users),
      hint: t('+{a} za 7 dní · +{b} za 30 dní', { a: stats.users_7d, b: stats.users_30d }),
      icon: Users,
    },
    {
      label: t('Zaplacení uživatelé'),
      value: String(stats.paid_users),
      hint: t('Konverze {c} %', { c: conversion }),
      icon: TrendingUp,
    },
    {
      label: t('Tržby celkem'),
      value: formatCzk(stats.revenue_total),
      hint: t('{n} plateb', { n: stats.payments_total }),
      icon: Banknote,
    },
    {
      label: t('Tržby za 30 dní'),
      value: formatCzk(stats.revenue_30d),
      hint: t('{n} plateb', { n: stats.payments_30d }),
      icon: CreditCard,
    },
  ];

  const chartData = stats.daily.map(point => ({ ...point, label: formatDay(point.day) }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(card => (
          <Card key={card.label} className="shadow-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <card.icon className="h-4 w-4" />
                {card.label}
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold">{t('Posledních 30 dní')}</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="registrations" name={t('Registrace')} fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="payments" name={t('Platby')} fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('Tržby a platby zahrnují pouze ostré (live) platby, testovací se nezapočítávají.')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
