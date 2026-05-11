## Cíl
1. Přidat na stránce **Checkout** (`src/pages/Checkout.tsx`) viditelnou nápovědu, co patří do **Line 1** a **Line 2** adresního formuláře, protože pole jsou součástí Stripe iframe a nelze je upravit přímo.
2. Otestovat kompletní platební tok a integraci se Stripe.

> Pozn.: Stripe Embedded Checkout běží v iframe – vlastní popisky uvnitř formuláře měnit nemůžeme. Proto nápovědu umístíme **nad** checkout do informační karty.

---

## Část 1 — UI změna

Soubor: `src/pages/Checkout.tsx`

Pod stávající kartu „Registrační poplatek" přidat malou informační kartu / `Alert` s textem:

```
Vyplnění adresy:
• Řádek 1 (Line 1) – ulice a číslo popisné (např. „Pražská 123")
• Řádek 2 (Line 2) – nepovinné, slouží pro doplněk adresy
  (např. „byt 5", „patro 3", „c/o Jan Novák"). V ČR/SK
  většinou nechte prázdné.
```

Použít existující komponenty `Card` / `Alert` z `@/components/ui/*` a sémantické tokeny (žádné hardcoded barvy). Žádné změny logiky, žádné edge funkce, žádné DB migrace.

---

## Část 2 — Test plateb a Stripe integrace

Sekvence kontrol bez zásahu do kódu (pouze čtení):

1. **Konfigurace**
   - `.env.development` / `.env.production` obsahují `VITE_PAYMENTS_CLIENT_TOKEN` (sandbox `pk_test_…`).
   - `supabase/config.toml` má `verify_jwt = false` u `create-checkout`, `payments-webhook`, `list-invoices`.
   - `src/lib/stripe.ts` správně detekuje environment z prefixu tokenu.

2. **Edge funkce – statická revize**
   - `create-checkout`: ověřit allowlist origin (preview + published), správné `ui_mode: embedded_page`, `invoice_creation.enabled`, `tax_id_collection`, `billing_address_collection: required`, `resolveOrCreateCustomer` (metadata.userId).
   - `payments-webhook`: ověřit, že `checkout.session.completed` ukládá `stripe_invoice_id`, `stripe_customer_id` a nastavuje `has_paid = true`.
   - `list-invoices`: ověřit fallback přes `stripe.invoices.list({ customer })` u plateb bez `stripe_invoice_id`.

3. **Runtime test (přes nástroje)**
   - `supabase--curl_edge_functions` na `create-checkout` s preview origin – očekáváme `clientSecret`.
   - `supabase--edge_function_logs` pro `create-checkout` a `payments-webhook` – kontrola, že nejsou chyby z posledních volání.
   - `supabase--curl_edge_functions` na `list-invoices` jako přihlášený uživatel.

4. **Frontend tok**
   - `src/pages/Checkout.tsx` – embedded checkout se mountuje pouze pro nezaplacené uživatele.
   - `src/pages/CheckoutReturn.tsx` – čte `session_id`, ukazuje výsledek.
   - `src/components/InvoicesList.tsx` – tlačítka „Zobrazit" / „Stáhnout PDF", fallback hláška pro staré platby.
   - `PaymentTestModeBanner` se zobrazuje v sandbox módu.

5. **Stripe go-live status**
   - `payments--get_go_live_status` – přehled stavu live účtu (informativní, neblokující).

Výsledkem testu bude krátký report v chatu: co prošlo OK, co je k pozornosti (např. nedokončené go-live kroky, chybějící DPH nastavení ve Stripe dashboardu).

---

## Technické poznámky
- Pouze 1 soubor se mění: `src/pages/Checkout.tsx`.
- Žádná změna v Stripe iframe – tam to z principu nejde.
- Po implementaci: vizuální kontrola přes preview a testovací karta `4242 4242 4242 4242`.
