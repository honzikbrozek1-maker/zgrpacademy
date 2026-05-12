import { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Printer, ArrowLeft } from 'lucide-react';

interface Props {
  levelTitle: string;
  userName: string;
  score: number;
  completedAt: string;
  onBack: () => void;
}

export default function LevelDiploma({ levelTitle, userName, score, completedAt, onBack }: Props) {
  const diplomaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = diplomaRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const safe = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    win.document.write(`
      <html><head><title>Diplom - ${safe(levelTitle)}</title>
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
        <h1>Certifikát o absolvování</h1>
        <h2>ZGRP Academy</h2>
        <p class="detail">Tímto certifikujeme, že</p>
        <p class="name">${safe(userName)}</p>
        <p class="detail">úspěšně absolvoval/a kurz</p>
        <p class="name">${safe(levelTitle)}</p>
        <p class="score">${Number(score)}%</p>
        <p class="detail">Datum: ${safe(new Date(completedAt).toLocaleDateString('cs-CZ'))}</p>
      </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Diploma preview */}
      <div ref={diplomaRef}>
        <Card className="shadow-elevated border-2 border-primary/30">
          <CardContent className="p-8 md:p-12 text-center space-y-4">
            <GraduationCap className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold text-primary">Certifikát o absolvování</h2>
            <p className="text-muted-foreground">ZGRP Academy</p>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">Tímto certifikujeme, že</p>
              <p className="text-xl font-bold mt-1">{userName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">úspěšně absolvoval/a kurz</p>
              <p className="text-xl font-bold mt-1">{levelTitle}</p>
            </div>
            <p className="text-4xl font-extrabold text-primary">{score}%</p>
            <p className="text-sm text-muted-foreground">
              Datum: {new Date(completedAt).toLocaleDateString('cs-CZ')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Zpět do levelu
        </Button>
        <Button onClick={handlePrint} className="gradient-primary text-primary-foreground">
          <Printer className="mr-1 h-4 w-4" /> Vytisknout diplom
        </Button>
      </div>
    </div>
  );
}
