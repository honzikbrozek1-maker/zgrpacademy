# Automatické odesílání pozvánek e-mailem

## Co to udělá

Když na stránce **Sdílet aplikaci** vytvoříte pozvánku a vyplníte e-mail příjemce, aplikace:
1. vytvoří pozvánku v databázi (jako dosud),
2. **automaticky odešle e-mail** s odkazem na zadanou adresu,
3. zobrazí potvrzení, že e-mail byl odeslán.

Pokud e-mail nevyplníte, chování zůstane stejné jako teď (jen vytvoření pozvánky + zkopírování odkazu).

## Jak to bude vypadat pro příjemce

Příjemce dostane e-mail v češtině s:
- pozdravem a vysvětlením, že byl pozván do ZGRP Academy,
- informací, jakou roli získá (Uživatel / Admin),
- tlačítkem **Přijmout pozvánku** vedoucím na `https://zgrpacademy.vercel.app/invite/<kód>`,
- informací o platnosti pozvánky (7 dní).

## Technická realizace

**Backend (nová edge funkce `send-invite-email`):**
- Přijme `email`, `inviteCode`, `role`.
- Ověří přihlášeného uživatele a že je admin (přes JWT + `has_role`).
- Validuje vstup pomocí Zod (formát e-mailu, max délky).
- Odešle e-mail přes vestavěný Lovable Emails systém (transakční e-maily — bez nutnosti Resend API klíče).
- Vrátí úspěch / chybu.

**Frontend (`src/pages/AdminShare.tsx`):**
- Po `insert` do `invite_links` zavolá `supabase.functions.invoke('send-invite-email', ...)` pokud je vyplněn e-mail.
- Aktualizuje toast hlášky („E-mail odeslán na …" / „Chyba při odesílání").

**Infrastruktura e-mailů:**
- Spustí se setup transakčních e-mailů (`scaffold_transactional_email`). To vyžaduje, aby byla v projektu nakonfigurovaná **e-mailová doména** (přes Lovable Cloud → Emails). Pokud doména ještě není nastavena, otevře se průvodce nastavením.
- Žádné externí API klíče (Resend, SendGrid) nejsou potřeba — vše běží přes Lovable Cloud.

## Soubory, které se změní/vytvoří

- **Vytvoří se:** `supabase/functions/send-invite-email/index.ts` — odeslání e-mailu.
- **Upraví se:** `src/pages/AdminShare.tsx` — volání edge funkce po vytvoření pozvánky.
- **Automaticky:** infrastruktura transakčních e-mailů (queue, cron, atd.).

## Předpoklad

Pro odesílání e-mailů z vlastní domény je potřeba mít v Lovable Cloud nastavenou a ověřenou e-mailovou doménu (DNS záznamy). Pokud zatím není, průvodce vás tím provede — bez ověřené domény e-maily nepůjdou doručit.

## Co zůstane stejné

- Odkazy v aplikaci dál ukazují na `https://zgrpacademy.vercel.app` (jak jste dříve požadoval).
- Pokud e-mail v poli necháte prázdný, funguje vše jako dosud (vytvoření + kopírování odkazu).
