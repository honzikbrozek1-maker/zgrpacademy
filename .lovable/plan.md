## Cíl
Přepnout platby na nový Stripe účet a změnit registrační poplatek z 15 Kč na **100 Kč**. Žádná data se nepřenášejí.

## Krok 1 — Odpojení starého Stripe účtu (ty)
Otevři **Payments dashboard** v Lovable → v pravém horním rohu **⋮ → Disconnect Stripe**.

⚠️ Po odpojení nové platby přestanou fungovat, dokud nedokončíš krok 2. Uživatelé, kteří už mají `has_paid = true`, zůstávají zaplacení a nic nepocítí.

## Krok 2 — Napiš mi, až je odpojeno
Já pak znovu spustím `enable_stripe_payments` a pošlu ti claim link.

## Krok 3 — Připojení nového účtu (ty ve Stripe)
1. Klikneš na claim link, přihlásíš se do **nového** Stripe účtu.
2. Projdeš go-live wizardem (ověření podnikatele, banka, 2FA — většinu už máš z předchozího účtu).
3. Při „Choose what to copy" ze sandboxu ujisti se, že je zaškrtnutá **Lovable app**.
4. Lovable pak automaticky vygeneruje nové live klíče, webhooky a přepíše je v projektových tajných proměnných. Kód se ručně upravovat nemusí.

## Krok 4 — Změna ceny na 100 Kč (já)
Vytvořím novou cenu `registration_fee_v3` = **10000 haléřů (100 Kč)** pod produktem registračního poplatku a v `src/pages/Checkout.tsx` přepnu `priceId` z `registration_fee_v2` na `registration_fee_v3`. Text „15 Kč" v UI (Checkout stránka) přepíšu na „100 Kč".

Starou cenu `registration_fee_v2` nemažu — historické platby na ni odkazují.

## Krok 5 — Ověření (já)
- `payments--get_go_live_status` že jsou všechny kroky zelené.
- Test platba kartou `4242 4242 4242 4242` v sandbox režimu na 100 Kč.
- Ověření, že `checkout.session.completed` webhook dorazí a v `payments` tabulce se objeví záznam s `environment='live'` po první ostré platbě.

## Co uděláš ty vs. co já

| Krok | Kdo |
|------|-----|
| 1. Disconnect starého účtu | ty (Payments dashboard) |
| 2. Signál, že je odpojeno | ty (chat) |
| 3a. Spuštění enable flow | já |
| 3b. Claim + go-live wizard v novém účtu | ty (Stripe) |
| 4. Nová cena 100 Kč + úprava kódu | já |
| 5. Test a ověření | já |

---

Až budeš mít hotový krok 1, dej vědět a pustím se do kroku 3a a 4.
