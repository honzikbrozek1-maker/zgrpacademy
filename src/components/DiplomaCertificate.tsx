import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import logoSpolek from '@/assets/logo-spolek.png';
import diplomaBorder from '@/assets/diploma-border.png';

interface Props {
  title: string;
  subtitle: string;
  bodyText: string;
  signatory: string;
  validityYears: number;
  userName: string;
  groupTitle: string;
  score: number;
  issuedAt: string;
}

const fmtDate = (d: Date) => d.toLocaleDateString('cs-CZ');

function renderTemplate(tpl: string, vars: Record<string, string | number>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export default function DiplomaCertificate({
  title, subtitle, bodyText, signatory, validityYears,
  userName, groupTitle, score, issuedAt,
}: Props) {
  const issued = new Date(issuedAt);
  const validUntil = new Date(issued);
  validUntil.setFullYear(validUntil.getFullYear() + (validityYears || 0));

  const vars = {
    user_name: userName,
    group_title: groupTitle,
    date: fmtDate(issued),
    score: `${score}%`,
    valid_until: fmtDate(validUntil),
  };
  const body = renderTemplate(bodyText || '', vars);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const safe = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    const logoUrl = new URL(logoSpolek, window.location.origin).href;
    const borderUrl = new URL(diplomaBorder, window.location.origin).href;
    win.document.write(`
      <html><head><title>${safe(title)} - ${safe(groupTitle)}</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        body { margin: 0; font-family: 'Inter', system-ui, sans-serif; background: white; }
        .page { position: relative; width: 210mm; height: 297mm; margin: 0 auto; background: white; }
        .frame { position: absolute; inset: 0; background: url('${borderUrl}') no-repeat center/100% 100%; pointer-events: none; }
        .content { position: absolute; inset: 14% 12% 12% 12%; display: flex; flex-direction: column; align-items: center; text-align: center; }
        .logo { width: 130px; height: auto; margin-bottom: 8px; }
        .title { font-family: 'Cormorant Garamond', 'Times New Roman', serif; font-size: 64px; letter-spacing: 4px; margin: 0; color: #1a1a1a; font-weight: 500; }
        .udelen { font-size: 16px; letter-spacing: 4px; color: #444; margin: 8px 0 18px; }
        .divider { width: 55%; height: 2px; background: #1a1a1a; margin: 4px 0 24px; }
        .recipient { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 600; margin: 4px 0 18px; color: #111; }
        .body { font-size: 16px; line-height: 1.6; color: #2a2a2a; max-width: 520px; margin: 0 auto; }
        .body em { font-style: italic; font-weight: 600; color: #111; }
        .meta { margin-top: 22px; font-size: 14px; color: #444; }
        .meta strong { color: #111; }
        .score { font-size: 36px; font-weight: 700; color: hsl(168, 65%, 38%); margin: 14px 0 6px; }
        .sig-wrap { margin-top: auto; padding-top: 24px; }
        .sig-name { font-size: 16px; color: #111; margin-top: 4px; }
        .sig-line { width: 240px; border-top: 1px solid #888; margin: 6px auto 0; padding-top: 4px; font-size: 12px; color: #777; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="page">
        <div class="frame"></div>
        <div class="content">
          <img class="logo" src="${logoUrl}" alt="Spolek v rovnováze z.s." />
          <h1 class="title">${safe(title.toUpperCase())}</h1>
          <div class="udelen">udělen pro</div>
          <div class="recipient">${safe(userName)}</div>
          <div class="divider"></div>
          <p class="body">${safe(body)}</p>
          <div class="score">${score}%</div>
          <div class="meta">
            <div>Datum vydání: <strong>${safe(fmtDate(issued))}</strong></div>
            ${validityYears > 0 ? `<div>Platnost do: <strong>${safe(fmtDate(validUntil))}</strong></div>` : ''}
            <div style="margin-top:6px">${safe(subtitle)}</div>
          </div>
          <div class="sig-wrap">
            <div class="sig-name">${safe(signatory)}</div>
            <div class="sig-line">Spolek v Rovnováze z.s.</div>
          </div>
        </div>
      </div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="space-y-4">
      <div
        className="relative mx-auto bg-white shadow-elevated overflow-hidden"
        style={{ width: '100%', maxWidth: 720, aspectRatio: '210 / 297' }}
      >
        <img
          src={diplomaBorder}
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
        />
        <div className="absolute inset-[12%_10%_10%_10%] flex flex-col items-center text-center text-foreground">
          <img src={logoSpolek} alt="Spolek v rovnováze z.s." className="h-20 w-auto mb-2" />
          <h1
            className="font-serif text-[clamp(28px,6vw,56px)] tracking-[0.15em] font-medium leading-none"
            style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
          >
            {title.toUpperCase()}
          </h1>
          <div className="text-[clamp(10px,1.4vw,14px)] tracking-[0.35em] text-muted-foreground mt-2 mb-3">
            udělen pro
          </div>
          <div
            className="font-semibold text-[clamp(18px,3.2vw,28px)]"
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
          >
            {userName}
          </div>
          <div className="w-[55%] h-[2px] bg-foreground my-3" />
          <p className="text-[clamp(11px,1.5vw,15px)] leading-relaxed max-w-[80%] text-foreground/85 whitespace-pre-line">
            {body}
          </p>
          <div className="text-[clamp(22px,4vw,34px)] font-bold text-primary mt-3">{score}%</div>
          <div className="text-[clamp(10px,1.3vw,13px)] text-muted-foreground mt-2 space-y-0.5">
            <div>Datum vydání: <span className="text-foreground font-medium">{fmtDate(issued)}</span></div>
            {validityYears > 0 && (
              <div>Platnost do: <span className="text-foreground font-medium">{fmtDate(validUntil)}</span></div>
            )}
            <div className="pt-1">{subtitle}</div>
          </div>
          <div className="mt-auto pt-4 text-center">
            <div className="text-[clamp(11px,1.4vw,14px)] text-foreground">{signatory}</div>
            <div className="mx-auto mt-1 pt-1 border-t border-muted-foreground/50 w-[60%] text-[10px] text-muted-foreground">
              Spolek v Rovnováze z.s.
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <Button onClick={handlePrint} className="gradient-primary text-primary-foreground">
          <Printer className="mr-1 h-4 w-4" /> Vytisknout diplom
        </Button>
      </div>
    </div>
  );
}
