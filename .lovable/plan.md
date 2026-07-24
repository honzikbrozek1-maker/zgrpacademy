## Stav
✅ Krok 1 hotový — starý Stripe účet je odpojený (Payments dashboard to potvrzuje: „no payment integration enabled").

## Další kroky

### Krok 2 — Spustím enable Stripe (já, po schválení)
Zavolám `enable_stripe_payments`. Objeví se ti **formulář v Lovable**, kde vyplníš:
- email (může být jiný než tvůj Lovable účet — např. účet nové firmy)
- jméno / název podnikatele
- základní údaje

Po odeslání Lovable vytvoří **testovací Stripe účet** a vygeneruje **claim link**.

### Krok 3 — Claim + go-live wizard (ty, ve Stripe)
1. Klikneš na claim link → přihlásíš se do **nového** Stripe účtu (nebo si založíš nový).
2. Ověříš email.
3. Projdeš go-live wizardem ve Stripe:
   - ověření podnikatele (jméno, IČO, adresa)
   - bankovní účet pro výplaty
   - dvoufázové ověření (2FA)
4. Na obrazovce **„Choose what to copy"** ze sandboxu zaškrtni **Lovable app** (jinak nedostanu live klíče).
5. Odešleš k aktivaci.

Lovable pak automaticky vygeneruje nové live klíče a webhooky a přepíše je v projektu. Kód se ručně upravovat nemusí.

### Krok 4 — Nová cena 100 Kč (já)
- Vytvořím produkt / cenu `registration_fee_v3` = **10 000 haléřů (100 Kč)**.
- V `src/pages/Checkout.tsx` přepnu `priceId` z `registration_fee_v2` → `registration_fee_v3`.
- Text „15 Kč" v UI přepíšu na „100 Kč".
- Starou cenu `registration_fee_v2` nemažu (historické platby na ni odkazují).

### Krok 5 — Ověření (já)
- `payments--get_go_live_status` že všechny kroky svítí zeleně.
- Testovací platba kartou `4242 4242 4242 4242` v sandboxu na 100 Kč.
- Kontrola, že webhook `checkout.session.completed` dorazí a v tabulce `payments` vznikne záznam.

---

## Co teď potřebuji od tebe
Schval tento plán tlačítkem **„Implement plan"**. Jakmile schválíš, hned spustím `enable_stripe_payments` a zobrazí se ti formulář z kroku 2.
