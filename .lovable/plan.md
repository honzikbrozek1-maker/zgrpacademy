## Kde najdeš claim link

Claim link (odkaz pro propojení s novým Stripe účtem) se generuje **v Payments dashboardu v Lovable**, ne přes chat.

### Postup
1. Otevři **Payments dashboard** (tlačítko níže).
2. Uvidíš sekci **Go live** s 5 kroky.
3. Klikni na **Krok 1 — Claim your Stripe account** → objeví se tlačítko / odkaz, který tě zavede na Stripe stránku „Create a Stripe account to claim this sandbox from Lovable".
4. Tam se přihlásíš do **nového** Stripe účtu (nebo si založíš nový) a projdeš onboarding — viz kroky, které jsem popsal minule (ověření podnikatele, banka, 2FA, „Choose what to copy" → zaškrtnout **Lovable app**).

<presentation-actions>
<presentation-open-payments>Otevřít Payments dashboard</presentation-open-payments>
</presentation-actions>

### Co jsem už udělal
- ✅ Znovu jsem zapnul built-in payments (nový test účet je vytvořený).
- ✅ Vytvořil jsem produkt `registration_fee` s cenou `registration_fee_v3` = **100 Kč (10 000 haléřů)**.

### Zbývá udělat po tvém claim
1. Ty projdeš onboarding v Stripe (kroky 1–3 v Payments dashboardu).
2. Lovable automaticky vygeneruje live klíče (krok 4 — automat).
3. Já přepnu v `src/pages/Checkout.tsx` `priceId` z `registration_fee_v2` na `registration_fee_v3` a text „15 Kč" → „100 Kč".
4. Otestuji platbu kartou `4242 4242 4242 4242`.

---

Schval tento plán tlačítkem **„Implement plan"**, abych mohl mezitím přepnout `priceId` a text v Checkout stránce (funguje to hned v test režimu — nemusíš čekat na dokončení go-live).
