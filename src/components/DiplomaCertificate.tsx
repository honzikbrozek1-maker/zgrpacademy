import { useEffect, useRef, useState } from 'react';
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
  hidePrint?: boolean;    // when embedded as a live preview
  maxWidth?: number;      // override default 720 preview width
}

const fmtDate = (d: Date) => d.toLocaleDateString('cs-CZ');

export default function DiplomaCertificate({
  title, subtitle, bodyText, signatory, validityYears,
  userName, groupTitle, score, issuedAt, hidePrint, maxWidth = 720,
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
    // Use a hidden iframe instead of window.open — on iOS Safari a new tab
    // gets stuck on the diploma after the print sheet is dismissed, with no
    // way to navigate back. An iframe keeps the user on the current page.
    const safe = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    const logoUrl = new URL(logoSpolek, window.location.origin).href;
    const borderUrl = new URL(diplomaBorder, window.location.origin).href;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const cleanup = () => {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 500);
    };

    const doc = iframe.contentDocument;
    if (!doc) { cleanup(); return; }
    const html = `
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
          ${resolvedBody ? `<div class="body">${safe(resolvedBody)}</div>` : ''}
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
    `;
    doc.open();
    doc.write(html);
    doc.close();

    const triggerPrint = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) { cleanup(); return; }
        win.focus();
        win.print();
      } catch {
        // ignore
      } finally {
        // Clean up shortly after the print dialog closes.
        const onAfter = () => cleanup();
        try {
          iframe.contentWindow?.addEventListener('afterprint', onAfter, { once: true });
        } catch { /* noop */ }
        // Fallback cleanup in case afterprint doesn't fire.
        setTimeout(cleanup, 60_000);
      }
    };

    // Wait for images (border + logo) to load so layout matches print output.
    const imgs = Array.from(doc.images || []);
    if (imgs.length === 0) {
      setTimeout(triggerPrint, 200);
    } else {
      let remaining = imgs.length;
      const done = () => { if (--remaining <= 0) setTimeout(triggerPrint, 100); };
      imgs.forEach(img => {
        if (img.complete) done();
        else { img.addEventListener('load', done); img.addEventListener('error', done); }
      });
    }
  };


  // Preview renders at the SAME fixed pixel dimensions as the print output
  // (A4 at ~96dpi ≈ 794 × 1123 px, matching the 210×297mm print page and its
  // absolute px font sizes). We then visually scale it down with CSS transform
  // so layout and line-breaks are 1:1 with the printed diploma on every device.
  const A4_W = 794;
  const A4_H = 1123;
  const scale = maxWidth / A4_W;

  return (
    <div className="space-y-4">
      <div
        className="relative mx-auto"
        style={{ width: '100%', maxWidth, height: A4_H * scale }}
      >
        <div
          className="bg-white shadow-elevated overflow-hidden"
          style={{
            width: A4_W,
            height: A4_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img
              src={diplomaBorder}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', userSelect: 'none' }}
            />
            {/* Safe area — matches print .safe: inset 38mm 40mm 32mm 40mm ≈ 144px 151px 121px 151px */}
            <div
              style={{
                position: 'absolute',
                top: 144, right: 151, bottom: 121, left: 151,
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                color: '#1a1a1a',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <img src={logoSpolek} alt="Spolek v Rovnováze z.s." style={{ width: 150, height: 'auto', marginBottom: 10 }} />
              <div style={{ fontFamily: "'Cormorant Garamond', 'Times New Roman', serif", fontSize: 48, letterSpacing: 5, margin: '4px 0 6px', fontWeight: 500, lineHeight: 1 }}>
                {title.toUpperCase()}
              </div>
              <div style={{ fontSize: 12, letterSpacing: 6, color: '#555', marginBottom: 14 }}>UDĚLEN PRO</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, margin: '4px 0 10px' }}>
                {userName}
              </div>
              <div style={{ width: '40%', height: 1.5, background: '#1a1a1a', margin: '8px 0 14px' }} />
              <div style={{ fontSize: 13, color: '#444', letterSpacing: 1, marginBottom: 6 }}>za úspěšné absolvování odborné zkoušky z</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 600, fontSize: 18, lineHeight: 1.4, color: '#111', maxWidth: 454, margin: '0 auto', whiteSpace: 'pre-line' }}>
                {groupTitle}
              </div>
              {resolvedBody && (
                <div style={{ fontSize: 13, lineHeight: 1.6, color: '#2a2a2a', maxWidth: 454, margin: '16px auto 0', whiteSpace: 'pre-line' }}>
                  {resolvedBody}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#444', marginTop: 16 }}>
                Datum vydání: <strong style={{ color: '#111' }}>{fmtDate(issued)}</strong>
              </div>
              {validityYears > 0 && (
                <div style={{ fontSize: 12, color: '#444' }}>
                  Platnost do: <strong style={{ color: '#111' }}>{fmtDate(validUntil)}</strong>
                </div>
              )}
              {subtitle && (
                <div style={{ fontSize: 11, color: '#666', marginTop: 6, letterSpacing: 1 }}>{subtitle}</div>
              )}
              <div style={{ marginTop: 'auto', paddingTop: 18, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 220, borderTop: '1px solid #555', margin: '0 auto 4px' }} />
                <div style={{ fontSize: 13, color: '#111' }}>{signatory}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {!hidePrint && (
        <div className="flex justify-center">
          <Button onClick={handlePrint} className="gradient-primary text-primary-foreground">
            <Printer className="mr-1 h-4 w-4" /> Vytisknout diplom
          </Button>
        </div>
      )}
    </div>
  );
}
