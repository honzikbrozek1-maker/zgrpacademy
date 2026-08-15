# Vylepšení: heslo, přihlášení, PWA, vyhledávání, přehled

## 1. Zapomenuté heslo
- Na přihlašovací stránce přibude odkaz „Zapomenuté heslo?" → dialog pro zadání e-mailu.
- Odešle se odkaz pro obnovu (přes výchozí systémové e-maily, bez vlastní domény).
- Nová veřejná stránka `/reset-password`, kde si uživatel nastaví nové heslo (stejné požadavky: 8 znaků, velké + malé písmeno, číslo).
- Ošetření: neplatný/expirovaný odkaz zobrazí srozumitelnou hlášku a nabídne poslat nový.

## 2. Zůstat přihlášen
- Zaškrtávátko „Zůstat přihlášen" na přihlašovacím formuláři (výchozí zapnuto).
- Zapnuto = přihlášení přetrvá i po zavření prohlížeče (jako dnes).
- Vypnuto = odhlášení po zavření prohlížeče (relace jen na dobu okna).

## 3. PWA – instalace na plochu telefonu
- Přidám manifest a ikony (z loga ZGRP), aby šla aplikace přidat na plochu iPhonu i Androidu a otevírala se bez adresního řádku.
- Nenápadná nabídka „Přidat na plochu" v Účtu s návodem pro iPhone (Safari → Sdílet → Přidat na plochu).
- Offline režim nedělám – aplikace potřebuje připojení k databázi a offline cache působí problémy se zastaralou verzí.

## 4. Vyhledávání (Ctrl/Cmd+K)
- Rychlé vyhledávání otevřené zkratkou nebo ikonou lupy v hlavičce/menu.
- Hledá:
  - Stránky a sekce (Levely, Opakování, Certifikáty, Účet, Admin) včetně přepnutí sekce Produkty/Backoffice.
  - Levely a skupiny podle názvu (skok na detail levelu).
  - Otázky podle textu – pro adminy skok do správy otázek, pro běžné uživatele jen otázky z levelů, které mají odemčené.
- Na mobilu dostupné jako ikona lupy.

## 5. Jednoduchý přehled pro admina
- Nová záložka „Přehled" v admin panelu jako první karta:
  - Počet registrovaných uživatelů, z toho zaplacených, konverze v %.
  - Tržby celkem a za posledních 30 dní (jen úspěšné platby, oddělené testovací/ostré prostředí).
  - Počet registrací za posledních 7 a 30 dní.
  - Malý sloupcový graf registrací a plateb za posledních 30 dní.
- Data načtu bezpečnou funkcí v databázi dostupnou jen adminům.

## 6. E-mailová upozornění – zatím vynechávám
Odesílání e-mailů z aplikace vyžaduje vlastní doménu odesílatele (např. `notify.vasedomena.cz`), kterou zatím nemáte. Proto místo e-mailů posílím upozornění v aplikaci a do prohlížeče (jako už funguje u žádostí o admina) i pro:
- novou registraci,
- novou platbu.

Až budete mít doménu, e-maily doplním bez dalších změn v aplikaci.

## Technické detaily
- `src/pages/Auth.tsx`: dialog pro reset hesla (`resetPasswordForEmail` s `redirectTo` na `/reset-password`), checkbox „Zůstat přihlášen".
- Nová stránka `src/pages/ResetPassword.tsx` + veřejná routa v `App.tsx`; ověří recovery relaci a volá `updateUser({ password })`.
- „Zůstat přihlášen": při vypnutí se po přihlášení přepne úložiště relace na `sessionStorage` (bez zásahu do auto-generovaného klienta – vlastní wrapper v `src/lib/auth.tsx`).
- PWA: `public/manifest.webmanifest` + ikony 192/512 z loga, meta tagy v `index.html`. Žádný service worker.
- Vyhledávání: nová komponenta `src/components/GlobalSearch.tsx` postavená na shadcn `CommandDialog`, napojená na `levels`, `level_groups` a `get_practice_questions`; zkratka registrovaná v `AppLayout.tsx`.
- Přehled: nová SECURITY DEFINER funkce `admin_overview_stats()` (kontrola `has_role(auth.uid(),'admin')`) agregující `profiles` a `payments`; nová komponenta `src/components/AdminOverviewTab.tsx` s grafy přes `recharts`.
- Upozornění na registrace/platby: rozšíření `useAdminRequestNotifications.ts` o realtime odběr `profiles` (insert) a `payments` (status `paid`), zobrazení přes Sonner + Notification API.
