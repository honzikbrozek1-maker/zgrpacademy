import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import logoSpolek from '@/assets/logo-spolek.png';
import diplomaBorder from '@/assets/diploma-border.png';
import signatureBrozekAsset from '@/assets/signature-brozek.png.asset.json';

const signatureBrozek = signatureBrozekAsset.url;
const SECONDARY_SIGNATORY = 'Ing. Tomáš Brožek, MBA';

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

  // Split body text around the highlight phrase "SPECIALISTA ZDRAVOTNÍHO PROTOKOLU"
  // so we can render it as a large graphic headline. Preserve line breaks so
  // paragraphs like "Vydává SPOLEK V ROVNOVÁZE Z.S." render on their own row.
  const HIGHLIGHT_RE = /SPECIALISTA\s+ZDRAVOTNÍHO\s+PROTOKOLU/i;
  const highlightMatch = resolvedBody.match(HIGHLIGHT_RE);
  const bodyBefore = highlightMatch ? resolvedBody.slice(0, highlightMatch.index!).replace(/[ \t,]+$/, '').replace(/\n+$/, '') : '';
  const bodyHighlight = highlightMatch ? highlightMatch[0].toUpperCase().replace(/\s+/g, ' ') : '';
  let bodyAfter = highlightMatch ? resolvedBody.slice(highlightMatch.index! + highlightMatch[0].length).replace(/^[ \t,]+/, '').replace(/^\n+/, '') : '';

  // Extract the "Vydává ..." line so it can be rendered at the bottom of the page.
  const ISSUER_RE = /(^|\n)\s*(Vydává[^\n]*)/i;
  const issuerMatch = bodyAfter.match(ISSUER_RE);
  const issuerLine = issuerMatch ? issuerMatch[2].trim() : '';
  if (issuerMatch) {
    bodyAfter = bodyAfter.replace(ISSUER_RE, '').replace(/\s+$/, '').replace(/\n{2,}/g, '\n\n');
  }

  // Split a body chunk around the recipient name so it can be styled larger.
  // Returns segments in order: text, name, text, name, ...
  const splitByName = (chunk: string): Array<{ kind: 'text' | 'name'; value: string }> => {
    if (!chunk || !userName) return chunk ? [{ kind: 'text', value: chunk }] : [];
    const parts = chunk.split(userName);
    const out: Array<{ kind: 'text' | 'name'; value: string }> = [];
    parts.forEach((p, i) => {
      if (p) out.push({ kind: 'text', value: p });
      if (i < parts.length - 1) out.push({ kind: 'name', value: userName });
    });
    return out;
  };






  const handlePrint = () => {
    // Use a hidden iframe instead of window.open — on iOS Safari a new tab
    // gets stuck on the diploma after the print sheet is dismissed, with no
    // way to navigate back. An iframe keeps the user on the current page.
    const safe = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    const renderSegmentsHtml = (segs: Array<{ kind: 'text' | 'name'; value: string }>) =>
      segs.map(s => s.kind === 'name' ? `<span class="recipient-name">${safe(s.value)}</span>` : safe(s.value)).join('');
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
        .title { font-family: 'Cormorant Garamond', 'Times New Roman', serif; font-size: 48px; letter-spacing: 5px; margin: 4px 0 6px; font-weight: 500; }
        .eyebrow { font-size: 12px; letter-spacing: 8px; color: #888; margin: 2px 0 10px; text-transform: uppercase; }
        .body-lead { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 20px; line-height: 1.5; color: #2a2a2a; max-width: 140mm; margin: 0 auto; white-space: pre-line; }
        .headline { font-family: 'Cormorant Garamond', 'Times New Roman', serif; font-weight: 700; font-size: 44px; letter-spacing: 4px; line-height: 1.1; margin: 14px auto 12px; color: #111; text-transform: uppercase; max-width: 160mm; }
        .headline-accent { display: block; width: 60px; height: 3px; background: #1a1a1a; margin: 10px auto; }
        .body-tail { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 18px; line-height: 1.5; color: #2a2a2a; max-width: 140mm; margin: 0 auto; white-space: pre-line; }
        .recipient-name { display: inline-block; font-family: 'Cormorant Garamond', serif; font-style: normal; font-weight: 600; font-size: 32px; letter-spacing: 2px; color: #111; padding: 2px 6px 0; line-height: 1.1; }
        .italic { font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 600; font-size: 18px; line-height: 1.4; color: #111; max-width: 140mm; margin: 0 auto; white-space: pre-line; }
        .meta { font-size: 12px; color: #444; margin-top: 4px; }
        .meta strong { color: #111; }
        .sub { font-size: 11px; color: #666; margin-top: 6px; letter-spacing: 1px; }
        .sig-row { margin-top: auto; padding-top: 18px; width: 100%; display: flex; justify-content: space-around; align-items: flex-end; gap: 20px; }
        .sig-block { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 0; }
        .sig-img { height: 50px; width: auto; max-width: 220px; object-fit: contain; margin-bottom: -6px; }
        .sig-line { width: 220px; max-width: 100%; border-top: 1px solid #555; margin: 0 auto 4px; }
        .sig-name { font-size: 13px; color: #111; text-align: center; }
        .sig-role { font-size: 10px; color: #666; letter-spacing: 1px; margin-top: 2px; text-transform: uppercase; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="page">
        <img class="frame" src="${borderUrl}" alt="" />
        <div class="safe">
          <img class="logo" src="${logoUrl}" alt="Spolek v Rovnováze z.s." />
          <div class="eyebrow">Certifikát</div>
          ${highlightMatch
            ? `${bodyBefore ? `<div class="body-lead">${renderSegmentsHtml(splitByName(bodyBefore))}</div>` : ''}
               <div class="headline">${safe(bodyHighlight)}</div>
               <span class="headline-accent"></span>
               ${bodyAfter ? `<div class="body-tail">${renderSegmentsHtml(splitByName(bodyAfter))}</div>` : ''}`

            : (resolvedBody
                ? `<div class="italic">${safe(resolvedBody)}</div>`
                : `<div class="body-lead">za úspěšné absolvování odborné zkoušky z</div>
                   <div class="italic">${safe(groupTitle)}</div>`)}

          <div class="meta" style="margin-top:16px">Datum vydání: <strong>${safe(fmtDate(issued))}</strong></div>
          ${validityYears > 0 ? `<div class="meta">Platnost do: <strong>${safe(fmtDate(validUntil))}</strong></div>` : ''}
          ${subtitle ? `<div class="sub">${safe(subtitle)}</div>` : ''}
          <div class="sig-row">
            ${signatory ? `
              <div class="sig-block">
                <div class="sig-line"></div>
                <div class="sig-name">${safe(signatory)}</div>
                <div class="sig-role">za spolek</div>
              </div>` : ''}
            <div class="sig-block">
              <img class="sig-img" src="${sigBrozekUrl}" alt="" />
              <div class="sig-line"></div>
              <div class="sig-name">${safe(SECONDARY_SIGNATORY)}</div>
              <div class="sig-role">za spolek</div>
            </div>
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
  // absolute px font sizes). We visually scale it down with CSS transform,
  // measuring the actual container width so layout/line-breaks are 1:1 with
  // the printed diploma on every device (incl. narrow iPhone viewports).
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
              <div style={{ fontSize: 12, letterSpacing: 8, color: '#888', margin: '2px 0 10px', textTransform: 'uppercase' }}>
                Certifikát
              </div>
              {highlightMatch ? (
                <>
                  {bodyBefore && (
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 20, lineHeight: 1.5, color: '#2a2a2a', maxWidth: 530, margin: '0 auto', whiteSpace: 'pre-line' }}>
                      {splitByName(bodyBefore).map((s, i) => s.kind === 'name'
                        ? <span key={i} style={{ display: 'inline-block', fontStyle: 'normal', fontWeight: 600, fontSize: 32, letterSpacing: 2, color: '#111', padding: '2px 6px 0', lineHeight: 1.1 }}>{s.value}</span>
                        : <span key={i}>{s.value}</span>)}
                    </div>
                  )}
                  <div style={{ fontFamily: "'Cormorant Garamond', 'Times New Roman', serif", fontWeight: 700, fontSize: 44, letterSpacing: 4, lineHeight: 1.1, margin: '14px auto 12px', color: '#111', textTransform: 'uppercase', maxWidth: 605 }}>
                    {bodyHighlight}
                  </div>
                  <span style={{ display: 'block', width: 60, height: 3, background: '#1a1a1a', margin: '0 auto 10px' }} />
                  {bodyAfter && (
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 18, lineHeight: 1.5, color: '#2a2a2a', maxWidth: 530, margin: '0 auto', whiteSpace: 'pre-line' }}>
                      {splitByName(bodyAfter).map((s, i) => s.kind === 'name'
                        ? <span key={i} style={{ display: 'inline-block', fontStyle: 'normal', fontWeight: 600, fontSize: 32, letterSpacing: 2, color: '#111', padding: '2px 6px 0', lineHeight: 1.1 }}>{s.value}</span>
                        : <span key={i}>{s.value}</span>)}
                    </div>
                  )}
                </>

              ) : resolvedBody ? (
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 600, fontSize: 18, lineHeight: 1.4, color: '#111', maxWidth: 530, margin: '0 auto', whiteSpace: 'pre-line' }}>
                  {resolvedBody}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: '#444', letterSpacing: 1, marginBottom: 6 }}>za úspěšné absolvování odborné zkoušky z</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 600, fontSize: 18, lineHeight: 1.4, color: '#111', maxWidth: 454, margin: '0 auto', whiteSpace: 'pre-line' }}>
                    {groupTitle}
                  </div>
                </>
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
              <div style={{ marginTop: 'auto', paddingTop: 18, width: '100%', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', gap: 20 }}>
                {signatory && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <div style={{ width: 220, maxWidth: '100%', borderTop: '1px solid #555', margin: '0 auto 4px' }} />
                    <div style={{ fontSize: 13, color: '#111', textAlign: 'center' }}>{signatory}</div>
                    <div style={{ fontSize: 10, color: '#666', letterSpacing: 1, marginTop: 2, textTransform: 'uppercase' }}>za spolek</div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <img src={signatureBrozek} alt="" style={{ height: 50, width: 'auto', maxWidth: 220, objectFit: 'contain', marginBottom: -6 }} />
                  <div style={{ width: 220, maxWidth: '100%', borderTop: '1px solid #555', margin: '0 auto 4px' }} />
                  <div style={{ fontSize: 13, color: '#111', textAlign: 'center' }}>{SECONDARY_SIGNATORY}</div>
                  <div style={{ fontSize: 10, color: '#666', letterSpacing: 1, marginTop: 2, textTransform: 'uppercase' }}>za spolek</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {!hidePrint && (
        <div className="flex justify-center">
          <Button onClick={handlePrint} className="gradient-primary text-primary-foreground">
            <Printer className="mr-1 h-4 w-4" /> Vytisknout certifikát
          </Button>
        </div>
      )}
    </div>
  );
}
