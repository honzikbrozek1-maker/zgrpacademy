import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import logoSpolek from '@/assets/logo-spolek.png';
import diplomaBorder from '@/assets/diploma-border.png';

interface Props {
  title: string;          // "CERTIFIKÁT"
  subtitle: string;       // small line under name (e.g. "ZGRP Academy")
  bodyText: string;       // italic event description (free text, no placeholders)
  signatory: string;      // person who signs the diploma
  validityYears: number;  // 0 = unlimited
  userName: string;       // auto: recipient
  groupTitle: string;     // auto: course / group name
  score: number;          // auto: achieved %
  issuedAt: string;       // auto: ISO date
}

const fmtDate = (d: Date) => d.toLocaleDateString('cs-CZ');

export default function DiplomaCertificate({
  title, subtitle, bodyText, signatory, validityYears,
  userName, groupTitle, score, issuedAt,
}: Props) {
  const issued = new Date(issuedAt);
  const validUntil = new Date(issued);
  validUntil.setFullYear(validUntil.getFullYear() + (validityYears || 0));

  const interpolate = (s: string) =>
    (s || '')
      .replace(/\{user_name\}/gi, userName)
      .replace(/\{group_title\}/gi, groupTitle)
      .replace(/\{score\}/gi, `${score}%`)
      .replace(/\{date\}/gi, fmtDate(issued))
      .replace(/\{valid_until\}/gi, validityYears > 0 ? fmtDate(validUntil) : '');

  const resolvedBody = interpolate(bodyText);



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
        html, body { margin: 0; padding: 0; background: white; font-family: 'Inter', system-ui, sans-serif; color: #1a1a1a; }
        .page { position: relative; width: 210mm; height: 297mm; margin: 0 auto; background: white; overflow: hidden; }
        .frame { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; pointer-events: none; }
        .safe { position: absolute; inset: 38mm 40mm 32mm 40mm; display: flex; flex-direction: column; align-items: center; text-align: center; }
        .logo { width: 150px; height: auto; margin-bottom: 10px; }
        .title { font-family: 'Cormorant Garamond', 'Times New Roman', serif; font-size: 48px; letter-spacing: 5px; margin: 4px 0 6px; font-weight: 500; }
        .udelen { font-size: 12px; letter-spacing: 6px; color: #555; margin-bottom: 14px; }
        .recipient { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 600; margin: 4px 0 10px; }
        .divider { width: 40%; height: 1.5px; background: #1a1a1a; margin: 8px 0 14px; }
        .prefix { font-size: 13px; color: #444; letter-spacing: 1px; margin-bottom: 6px; }
        .italic { font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 600; font-size: 18px; line-height: 1.4; color: #111; max-width: 120mm; margin: 0 auto; white-space: pre-line; }
        .body { font-size: 13px; line-height: 1.6; color: #2a2a2a; max-width: 120mm; margin: 16px auto 0; }
        .meta { font-size: 12px; color: #444; margin-top: 4px; }
        .meta strong { color: #111; }
        .sub { font-size: 11px; color: #666; margin-top: 6px; letter-spacing: 1px; }
        .sig { margin-top: auto; padding-top: 18px; width: 100%; display: flex; flex-direction: column; align-items: center; }
        .sig-line { width: 220px; border-top: 1px solid #555; margin: 0 auto 4px; }
        .sig-name { font-size: 13px; color: #111; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="page">
        <img class="frame" src="${borderUrl}" alt="" />
        <div class="safe">
          <img class="logo" src="${logoUrl}" alt="Spolek v Rovnováze z.s." />
          <div class="title">${safe(title.toUpperCase())}</div>
          <div class="udelen">UDĚLEN PRO</div>
          <div class="recipient">${safe(userName)}</div>
          <div class="divider"></div>
          <div class="prefix">za úspěšné absolvování odborné zkoušky z</div>
          <div class="italic">${safe(groupTitle)}</div>
          ${bodyText ? `<div class="body">${safe(bodyText)}</div>` : ''}
          <div class="meta" style="margin-top:16px">Datum vydání: <strong>${safe(fmtDate(issued))}</strong></div>
          ${validityYears > 0 ? `<div class="meta">Platnost do: <strong>${safe(fmtDate(validUntil))}</strong></div>` : ''}
          ${subtitle ? `<div class="sub">${safe(subtitle)}</div>` : ''}
          <div class="sig">
            <div class="sig-line"></div>
            <div class="sig-name">${safe(signatory)}</div>
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
        {/* Safe area well inside the gold border */}
        <div className="absolute inset-[14%_18%_12%_18%] flex flex-col items-center text-center text-foreground">
          <img src={logoSpolek} alt="Spolek v Rovnováze z.s." className="h-24 w-auto mb-2" />
          <h1
            className="text-[clamp(22px,4.6vw,42px)] tracking-[0.14em] font-medium leading-none mt-1"
            style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
          >
            {title.toUpperCase()}
          </h1>
          <div className="text-[clamp(9px,1.1vw,11px)] tracking-[0.4em] text-muted-foreground mt-3 mb-2">
            UDĚLEN PRO
          </div>
          <div
            className="font-semibold text-[clamp(16px,2.6vw,24px)]"
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
          >
            {userName}
          </div>
          <div className="w-[40%] h-[1.5px] bg-foreground my-3" />
          <p className="text-[clamp(10px,1.2vw,13px)] tracking-wide text-muted-foreground mb-1">
            za úspěšné absolvování odborné zkoušky z
          </p>
          <p
            className="italic font-semibold text-[clamp(12px,1.7vw,16px)] leading-snug max-w-[88%] text-foreground"
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
          >
            {groupTitle}
          </p>
          {bodyText && (
            <p className="text-[clamp(10px,1.25vw,13px)] leading-relaxed max-w-[88%] text-foreground/85 mt-3 whitespace-pre-line">
              {bodyText}
            </p>
          )}
          <div className="text-[clamp(10px,1.25vw,12px)] text-muted-foreground mt-4 space-y-0.5">
            <div>Datum vydání: <span className="text-foreground font-medium">{fmtDate(issued)}</span></div>
            {validityYears > 0 && (
              <div>Platnost do: <span className="text-foreground font-medium">{fmtDate(validUntil)}</span></div>
            )}
            {subtitle && <div className="pt-1 tracking-widest text-[10px]">{subtitle}</div>}
          </div>
          <div className="mt-auto pt-3 w-full flex flex-col items-center">
            <div className="w-[50%] border-t border-foreground/50 mb-1" />
            <div className="text-[clamp(11px,1.4vw,14px)] text-foreground">{signatory}</div>
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
