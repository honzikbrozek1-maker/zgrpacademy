import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Printer } from 'lucide-react';

interface Props {
  title: string;
  subtitle: string;
  userName: string;
  groupTitle: string;
  score: number;
  issuedAt: string;
}

export default function DiplomaCertificate({ title, subtitle, userName, groupTitle, score, issuedAt }: Props) {
  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const safe = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    win.document.write(`
      <html><head><title>${safe(title)} - ${safe(groupTitle)}</title>
      <style>
        body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Inter', system-ui, sans-serif; background: white; }
        .diploma { border: 4px double hsl(168, 65%, 38%); border-radius: 16px; padding: 60px; max-width: 700px; text-align: center; }
        .diploma h1 { font-size: 32px; margin: 0 0 8px; color: hsl(168, 65%, 38%); }
        .diploma h2 { font-size: 20px; margin: 0 0 40px; color: #666; font-weight: 400; }
        .diploma .name { font-size: 28px; font-weight: 700; margin: 20px 0; }
        .diploma .detail { color: #666; margin: 8px 0; }
        .diploma .score { font-size: 48px; font-weight: 800; color: hsl(168, 65%, 38%); margin: 20px 0; }
        .diploma .icon { font-size: 48px; margin-bottom: 16px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="diploma">
        <div class="icon">🎓</div>
        <h1>${safe(title)}</h1>
        <h2>${safe(subtitle)}</h2>
        <p class="detail">Tímto certifikujeme, že</p>
        <p class="name">${safe(userName)}</p>
        <p class="detail">úspěšně absolvoval/a kurz</p>
        <p class="name">${safe(groupTitle)}</p>
        <p class="score">${score}%</p>
        <p class="detail">Datum vydání: ${new Date(issuedAt).toLocaleDateString('cs-CZ')}</p>
      </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-elevated border-2 border-primary/30">
        <CardContent className="p-8 md:p-12 text-center space-y-4">
          <GraduationCap className="h-12 w-12 mx-auto text-primary" />
          <h2 className="text-2xl md:text-3xl font-bold text-primary">{title}</h2>
          <p className="text-muted-foreground">{subtitle}</p>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">Tímto certifikujeme, že</p>
            <p className="text-xl font-bold mt-1">{userName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">úspěšně absolvoval/a kurz</p>
            <p className="text-xl font-bold mt-1">{groupTitle}</p>
          </div>
          <p className="text-4xl font-extrabold text-primary">{score}%</p>
          <p className="text-sm text-muted-foreground">
            Datum vydání: {new Date(issuedAt).toLocaleDateString('cs-CZ')}
          </p>
        </CardContent>
      </Card>
      <div className="flex justify-center">
        <Button onClick={handlePrint} className="gradient-primary text-primary-foreground">
          <Printer className="mr-1 h-4 w-4" /> Vytisknout diplom
        </Button>
      </div>
    </div>
  );
}
