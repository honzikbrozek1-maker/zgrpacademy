import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useT, useLang } from '@/lib/i18n';
import logoSpolek from '@/assets/logo-spolek.png';
import diplomaBorder from '@/assets/diploma-border.png';
import signatureBrozekAsset from '@/assets/signature-brozek.png.asset.json';

const signatureBrozek = signatureBrozekAsset.url;
const SECONDARY_SIGNATORY = 'Ing. Tomáš Brožek, MBA';

interface Props {
  title: string;          // "CERTIFIKÁT"
  subtitle: string;       // small line under the date (e.g. "ZGRP Academy")
  introText: string;      // intro sentence above the award title
  awardTitle: string;     // big highlighted title (e.g. "SPECIALISTA ZDRAVOTNÍHO PROTOKOLU")
  noteText?: string;      // optional sentence under the recipient name
  issuer?: string;        // issuing organisation, rendered at the bottom
  signatory?: string;     // deprecated - no longer rendered
  validityYears: number;  // 0 = unlimited
  userName: string;       // auto: recipient
  groupTitle: string;     // auto: course / group name
  score: number;          // auto: achieved %
  issuedAt: string;       // auto: ISO date
  hidePrint?: boolean;    // when embedded as a live preview
  maxWidth?: number;      // override default 720 preview width
}

const fmtDate = (d: Date, lang: 'cs' | 'sk' = 'cs') => d.toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'cs-CZ');

export default function DiplomaCertificate({
  title, subtitle, introText, awardTitle, noteText, issuer, validityYears,
  userName, groupTitle, score, issuedAt, hidePrint, maxWidth = 720,
}: Props) {
  const t = useT();
  const { lang } = useLang();
  const issued = new Date(issuedAt);
  const validUntil = new Date(issued);
  validUntil.setFullYear(validUntil.getFullYear() + (validityYears || 0));

  const interpolate = (s: string) =>
    (s || '')
      .replace(/\{user_name\}/gi, userName)
      .replace(/\{group_title\}/gi, groupTitle)
      .replace(/\{score\}/gi, `${score}%`)
      .replace(/\{date\}/gi, fmtDate(issued, lang))
      .replace(/\{valid_until\}/gi, validityYears > 0 ? fmtDate(validUntil, lang) : '');

  const intro = interpolate(introText).trim();
  const award = interpolate(awardTitle).trim().toUpperCase();
  const note = interpolate(noteText || '').trim();
  const issuerLine = interpolate(issuer || '').trim();

  const handlePrint = () => {
    // Use a hidden iframe instead of window.open — on iOS Safari a new tab
    // gets stuck on the certificate after the print sheet is dismissed.
    const safe = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    const logoUrl = new URL(logoSpolek, window.location.origin).href;
    const borderUrl = new URL(diplomaBorder, window.location.origin).href;
    const sigBrozekUrl = new URL(signatureBrozek, window.location.origin).href;

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
        .title { font-family: 'Cormorant Garamond', 'Times New Roman', serif; font-size: 56px; letter-spacing: 8px; margin: 6px 0 8px; font-weight: 600; text-transform: uppercase; color: #111; }
        .intro { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 20px; line-height: 1.5; color: #2a2a2a; max-width: 140mm; margin: 0 auto; white-space: pre-line; }
        .award { font-family: 'Cormorant Garamond', 'Times New Roman', serif; font-weight: 700; font-size: 44px; letter-spacing: 4px; line-height: 1.1; margin: 14px auto 10px; color: #111; text-transform: uppercase; max-width: 160mm; }
        .accent { display: block; width: 60px; height: 3px; background: #1a1a1a; margin: 0 auto 14px; }
        .for { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 18px; color: #2a2a2a; }
        .name { font-family: 'Cormorant Garamond', serif; font-weight: 700; font-size: 36px; letter-spacing: 2px; color: #111; line-height: 1.2; margin: 2px 0 4px; }
        .note { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 18px; line-height: 1.5; color: #2a2a2a; max-width: 140mm; margin: 6px auto 0; white-space: pre-line; }
        .meta { font-size: 12px; color: #444; margin-top: 4px; }
        .meta strong { color: #111; }
        .sub { font-size: 11px; color: #666; margin-top: 6px; letter-spacing: 1px; }
        .sig-row { margin-top: auto; padding-top: 18px; width: 100%; display: flex; justify-content: space-around; align-items: flex-end; gap: 20px; }
        .sig-block { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 0; }
        .sig-img { height: 50px; width: auto; max-width: 220px; object-fit: contain; margin-bottom: -6px; }
        .sig-line { width: 220px; max-width: 100%; border-top: 1px solid #555; margin: 0 auto 4px; }
        .sig-name { font-size: 13px; color: #111; text-align: center; }
        .sig-role { font-size: 10px; color: #666; letter-spacing: 1px; margin-top: 2px; text-transform: uppercase; }
        .issuer { margin-top: 14px; font-size: 12px; letter-spacing: 3px; color: #333; text-transform: uppercase; text-align: center; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="page">
        <img class="frame" src="${borderUrl}" alt="" />
        <div class="safe">
          <img class="logo" src="${logoUrl}" alt="Spolek v Rovnováze z.s." />
          <div class="title">${safe(title || 'Certifikát')}</div>
          ${intro ? `<div class="intro">${safe(intro)}</div>` : ''}
          ${award ? `<div class="award">${safe(award)}</div><span class="accent"></span>` : ''}
          <div class="for">${safe(t('pro'))}</div>
          <div class="name">${safe(userName)}</div>
          ${note ? `<div class="note">${safe(note)}</div>` : ''}
          <div class="meta" style="margin-top:16px">${safe(t('Datum absolvování'))}: <strong>${safe(fmtDate(issued, lang))}</strong></div>
          ${validityYears > 0 ? `<div class="meta">${safe(t('Platnost do'))}: <strong>${safe(fmtDate(validUntil, lang))}</strong></div>` : ''}
          ${subtitle ? `<div class="sub">${safe(subtitle)}</div>` : ''}
          <div class="sig-row" style="justify-content:center">
            <div class="sig-block" style="flex:0 0 auto">
              <img class="sig-img" src="${sigBrozekUrl}" alt="" />
              <div class="sig-line"></div>
              <div class="sig-name">${safe(SECONDARY_SIGNATORY)}</div>
              <div class="sig-role">${safe(t('za spolek'))}</div>
            </div>
          </div>
          ${issuerLine ? `<div class="issuer">${safe(t('Vydává'))} ${safe(issuerLine)}</div>` : ''}
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
        const onAfter = () => cleanup();
        try {
          iframe.contentWindow?.addEventListener('afterprint', onAfter, { once: true });
        } catch { /* noop */ }
        setTimeout(cleanup, 60_000);
      }
    };

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
  // (A4 at ~96dpi ≈ 794 × 1123 px) and is scaled down with a CSS transform,
  // so line-breaks are 1:1 with the printed certificate on every device.
  const A4_W = 794;
  const A4_H = 1123;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [wrapperW, setWrapperW] = useState(maxWidth);
  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const update = () => setWrapperW(el.clientWidth || maxWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxWidth]);
  const scale = wrapperW / A4_W;

  return (
    <div className="space-y-4">
      <div
        ref={wrapperRef}
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
              <div style={{ fontFamily: "'Cormorant Garamond', 'Times New Roman', serif", fontSize: 56, letterSpacing: 8, margin: '6px 0 8px', fontWeight: 600, textTransform: 'uppercase', color: '#111' }}>
                {title || 'Certifikát'}
              </div>
              {intro && (
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 20, lineHeight: 1.5, color: '#2a2a2a', maxWidth: 530, margin: '0 auto', whiteSpace: 'pre-line' }}>
                  {intro}
                </div>
              )}
              {award && (
                <>
                  <div style={{ fontFamily: "'Cormorant Garamond', 'Times New Roman', serif", fontWeight: 700, fontSize: 44, letterSpacing: 4, lineHeight: 1.1, margin: '14px auto 10px', color: '#111', textTransform: 'uppercase', maxWidth: 605 }}>
                    {award}
                  </div>
                  <span style={{ display: 'block', width: 60, height: 3, background: '#1a1a1a', margin: '0 auto 14px' }} />
                </>
              )}
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 18, color: '#2a2a2a' }}>{t('pro')}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 36, letterSpacing: 2, color: '#111', lineHeight: 1.2, margin: '2px 0 4px' }}>
                {userName}
              </div>
              {note && (
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 18, lineHeight: 1.5, color: '#2a2a2a', maxWidth: 530, margin: '6px auto 0', whiteSpace: 'pre-line' }}>
                  {note}
                </div>
              )}

              <div style={{ fontSize: 12, color: '#444', marginTop: 16 }}>
                {t('Datum absolvování')}: <strong style={{ color: '#111' }}>{fmtDate(issued, lang)}</strong>
              </div>
              {validityYears > 0 && (
                <div style={{ fontSize: 12, color: '#444' }}>
                  {t('Platnost do')}: <strong style={{ color: '#111' }}>{fmtDate(validUntil, lang)}</strong>
                </div>
              )}
              {subtitle && (
                <div style={{ fontSize: 11, color: '#666', marginTop: 6, letterSpacing: 1 }}>{subtitle}</div>
              )}
              <div style={{ marginTop: 'auto', paddingTop: 18, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
                  <img src={signatureBrozek} alt="" style={{ height: 50, width: 'auto', maxWidth: 220, objectFit: 'contain', marginBottom: -6 }} />
                  <div style={{ width: 220, maxWidth: '100%', borderTop: '1px solid #555', margin: '0 auto 4px' }} />
                  <div style={{ fontSize: 13, color: '#111', textAlign: 'center' }}>{SECONDARY_SIGNATORY}</div>
                  <div style={{ fontSize: 10, color: '#666', letterSpacing: 1, marginTop: 2, textTransform: 'uppercase' }}>{t('za spolek')}</div>
                </div>
              </div>
              {issuerLine && (
                <div style={{ marginTop: 14, fontSize: 12, letterSpacing: 3, color: '#333', textTransform: 'uppercase', textAlign: 'center' }}>
                  {t('Vydává')} {issuerLine}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {!hidePrint && (
        <div className="flex justify-center">
          <Button onClick={handlePrint} className="gradient-primary text-primary-foreground">
            <Printer className="mr-1 h-4 w-4" /> {t('Vytisknout certifikát')}
          </Button>
        </div>
      )}
    </div>
  );
}
