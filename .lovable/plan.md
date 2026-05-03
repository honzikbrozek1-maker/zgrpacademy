# Odeslání pozvánky přes e-mailového klienta (mailto)

## Co to udělá

Když na stránce **Sdílet aplikaci** vytvoříte pozvánku a vyplníte e-mail příjemce, aplikace:
1. vytvoří pozvánku v databázi (jako dosud),
2. **automaticky otevře váš výchozí e-mailový klient** (Gmail, Outlook, Apple Mail…) s předvyplněným:
   - **příjemcem** = zadaný e-mail,
   - **předmětem** = „Pozvánka do ZGRP Academy",
   - **textem** v češtině s rolí (Uživatel/Administrátor), odkazem na pozvánku a informací o platnosti 7 dní,
3. odkaz pro jistotu zkopíruje i do schránky,
4. zobrazí potvrzovací hlášku.

Vy už jen v e-mailovém klientovi zkontrolujete a kliknete *Odeslat*. E-mail půjde z **vaší vlastní adresy**, takže působí osobně a nepotřebujeme žádnou doménu, DNS ani admin práva.

## Pokud e-mail nevyplníte

Funguje to jako dnes — pozvánka se vytvoří a odkaz se zkopíruje do schránky.

## Aktualizace odkazů

Při této úpravě zároveň přepíšu poslední zbývající odkazy v `AdminShare.tsx` z `zgrpacademy.lovable.app` na **`zgrpacademy.vercel.app`** (oficiální veřejná adresa, jak jste dříve požadoval). Týká se to:
- odkazu generovaného v pozvánce (`/invite/<kód>`),
- odkazu v sekci „Odkaz na aplikaci",
- odkazu v tlačítku „Kopírovat" u existujících pozvánek.

## Soubory, které se změní

- `src/pages/AdminShare.tsx` — jediný upravený soubor:
  - úprava funkce `createInvite` (sestavení `mailto:` URL a otevření klienta),
  - úprava funkce `copyLink` (nový základ URL),
  - úprava konstanty `appUrl` (nový základ URL).

## Co se NEmění

- Databáze, RLS politiky, edge funkce — žádné backendové změny.
- Logika přijímání pozvánek (`InvitePage.tsx`) zůstává stejná.
- Pokud byste v budoucnu chtěl plně automatické odesílání bez otevírání klienta, stačí požádat admina workspace o přidání e-mailové domény a vrátíme se k řešení s edge funkcí.

## Technická poznámka

`mailto:` odkaz má omezenou maximální délku (cca 2000 znaků v některých klientech), ale náš text je krátký (~250 znaků), takže to nehrozí. Diakritika a zalomení řádků se kódují přes `encodeURIComponent`.
