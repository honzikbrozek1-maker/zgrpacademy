# Migrace na nový Stripe účet

Cílem je přesměrovat platby ze současného Stripe účtu na tvůj druhý (už aktivovaný) účet, přenést produkt (registrační poplatek 15 Kč) a co nejvíce zákazníků/faktur. Musíš pracovat **ve Stripe i tady v Lovable** — postup níže.

## Krok 1 — Export dat ze starého Stripe účtu (ty, ve Stripe)

Přihlas se do **starého** Stripe účtu → sekce vlevo dole podle potřeby:

1. **Customers → Export** → CSV se všemi zákazníky (email, jméno, adresa, VAT ID, metadata včetně `userId`).
2. **Payments → Export** → historie plateb (pro archiv).
3. **Invoices → Export** → PDF faktur, které chceš mít u sebe (Stripe je po odpojení nechá dostupné, ale je dobré mít zálohu).
4. **Products → poznač si** `product_id` a `price_id` (v našem případě to je `registration_fee_v2` — je uložený jako `lookup_key`, takže se ve Stripe přenese pod stejným názvem).

**Co se NEDÁ přenést automaticky:**
- Historické faktury a payment intenty zůstávají navždy na starém účtu.
- Kreditní karty zákazníků (Stripe je nedá exportovat mimo tzv. „PCI copy" proces — musí ho žádat nový účet u Stripe supportu, viz krok 6).

## Krok 2 — Import zákazníků do nového Stripe účtu (ty, ve Stripe)

V **novém** účtu:

1. **Customers → Import** → nahraj CSV z kroku 1. Ověř, že v každém řádku zůstal sloupec `metadata[userId]` — to je klíč, přes který naše aplikace zákazníky páruje s uživateli v databázi. Bez něj by při další platbě systém založil duplikát.
2. **Products** — nemusíš zakládat ručně. Když v Lovable přepneme integraci (krok 4), systém při publishi produkt `registration_fee_v2` automaticky vytvoří v novém účtu se stejným `lookup_key`, takže existující kód (`stripe.prices.list({ lookup_keys: ["registration_fee_v2"] })`) bude fungovat beze změny.

## Krok 3 — Odpojení starého účtu (ty, v Lovable)

V Lovable otevři **Payments dashboard** (Více → Payments) a v pravém horním rohu **⋮ → Disconnect Stripe**. Tím se uvolní slot pro nové připojení.

<presentation-actions><presentation-open-payments>Otevřít Payments dashboard</presentation-open-payments></presentation-actions>

⚠️ Po odpojení **přestanou fungovat nové platby**, dokud nedokončíš krok 4. Existující uživatelé s `has_paid = true` v databázi zůstávají zaplacení — ti nic nepocítí.

## Krok 4 — Připojení nového účtu (ty + já, v Lovable)

Až mi napíšeš, že je krok 3 hotový, spustím znovu `enable_stripe_payments`. Ty pak:

1. Klikneš na claim link ve Stripe dashboardu, který ti pošlu.
2. Přihlásíš se do **nového** Stripe účtu (ne starého!) a potvrdíš propojení.
3. Projdeš go-live wizardem (většinu už máš hotovou z předchozího účtu — ověření podnikatele, banka atd.). Až se rozhodneš „Choose what to copy" ze sandboxu, ujisti se, že je zaškrtnutá **Lovable app**.
4. Po dokončení Lovable automaticky vygeneruje nové live API klíče, webhooky a přepíše je v projektových tajných proměnných. Ani `.env`, ani `create-checkout`, ani webhook handler se ručně upravovat nemusí — všechna logika běží přes proxy gateway, která si klíče najde sama.

## Krok 5 — Ověření (já)

Po dokončení kroku 4:

- Zkontroluju `payments--get_go_live_status`, že jsou všechny kroky zelené.
- Publish → test platby v sandbox režimu kartou `4242 4242 4242 4242`.
- Zkontroluju, že webhook `checkout.session.completed` dojde a v `payments` tabulce se objeví nový záznam s `environment='live'` po první ostré platbě.

## Krok 6 — Volitelné: migrace uložených karet (jen když to potřebuješ)

Naše aplikace vybírá **jednorázový poplatek 15 Kč**, takže si zákazníci karty neukládají — tenhle krok můžeš přeskočit. Kdybys v budoucnu měl předplatné, Stripe umí přesunout tokeny karet mezi účty přes tzv. **PCI Copy** (musí se žádat u [Stripe Data Migrations](https://support.stripe.com/contact/email?topic=data_migrations), trvá 1–2 týdny).

## Co uděláš ty vs. co udělám já

| Krok | Kdo |
|------|-----|
| 1. Export ze starého účtu | ty (Stripe) |
| 2. Import zákazníků do nového | ty (Stripe) |
| 3. Disconnect v Lovable | ty (Payments dashboard) |
| 4a. Spuštění nového enable flow | já (po tvém signálu) |
| 4b. Claim + go-live wizard | ty (Stripe) |
| 5. Test a ověření | já |
| 6. PCI Copy karet | nepotřebujeme |

## Technická poznámka (nemusíš číst)

Náš kód není závislý na konkrétním Stripe účtu — `create-checkout/index.ts` používá `lookup_key` (`registration_fee_v2`) a `resolveOrCreateCustomer` hledá zákazníky přes `metadata['userId']`. Dokud v importu zůstane `userId` metadata a produkt se vytvoří se stejným `lookup_key`, přepnutí účtu je pro aplikaci neviditelné. Existující řádky v tabulkách `payments` a `profiles.has_paid` zůstávají platné.

---

Až budeš mít hotové kroky 1–3, dej vědět a spustím krok 4.
