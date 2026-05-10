
## Cíl
Pro každou zaplacenou platbu v sekci „Faktury" (stránka **Nastavení účtu**) i na stránce **CheckoutReturn** zobrazit klikatelné tlačítka **„Zobrazit fakturu"** (hosted URL) a **„Stáhnout PDF"** (přímý odkaz na PDF).

Aktuální komponenta `InvoicesList.tsx` už tlačítka generuje, ale jen pokud edge funkce `list-invoices` vrátí `hosted_invoice_url` a `invoice_pdf`. U starých plateb (před zapnutím `invoice_creation`) jsou tyto hodnoty `null` → tlačítka chybí. Proto je potřeba doplnit fallback a hlavně dokončit nastavení ve Stripe, aby se faktury vůbec generovaly.

---

## Část 1 — Co upravím v kódu

### 1.1 `supabase/functions/list-invoices/index.ts`
- Když platba **nemá** `stripe_invoice_id` (staré platby), zkusit dohledat fakturu přes `stripe.invoices.list({ customer: stripe_customer_id, limit: 5 })` a vybrat tu, která odpovídá `payment_intent`.
- Pokud i tak žádná není, vrátit `hosted_invoice_url: null` a v UI místo tlačítek zobrazit hlášku „Faktura není k dispozici – platba proběhla před zapnutím fakturace."
- Vrátit navíc pole `created`, `status` a `number` (číslo faktury) pro hezčí zobrazení.

### 1.2 `src/components/InvoicesList.tsx`
- Přidat dvě jasná tlačítka u každé položky:
  - **„Zobrazit"** → otevře `hosted_invoice_url` v novém okně (Stripe hosted stránka, lze tisknout/uložit).
  - **„Stáhnout PDF"** → odkazuje na `invoice_pdf` s atributem `download`.
- Pokud žádný URL není, zobrazit disabled tlačítko + krátké vysvětlení.
- Zobrazit číslo faktury (`number`), datum a částku.

### 1.3 Bez DB migrace
Schéma `payments` už má `stripe_invoice_id` – stačí, aby ho webhook ukládal (už ukládá).

---

## Část 2 — Návod, co udělat ve Stripe (uživatelská akce)

Tady je krok za krokem, kde co kliknout. **Bez tohoto se PDF faktury negenerují korektně a nebudou splňovat ČR/SK náležitosti.**

### Krok A — Claim Stripe účtu (propojení s vaší firmou)
1. V Lovable v levém menu otevřete **Payments**.
2. Přepněte na záložku **Live** (nebo „Go live").
3. Klikněte na **Claim Stripe account**.
4. Otevře se Stripe stránka – přihlaste se k existujícímu firemnímu Stripe účtu (nebo si vytvořte nový, pokud ho ještě nemáte propojený).
5. Potvrďte ověřovací e-mail od Stripu.

### Krok B — Vyplnění firemních údajů (jinak faktura nebude platná v ČR/SK)
Ve Stripe dashboardu (`dashboard.stripe.com`):
1. **Settings → Business → Public details**
   - Název firmy, adresa, IČO, telefon, e-mail.
2. **Settings → Business → Tax details / Tax IDs**
   - Přidat **DIČ** (pokud jste plátce DPH). Vyberte „CZ – VAT" nebo „SK – VAT".
3. **Settings → Billing → Invoice template**
   - Logo firmy.
   - **Footer**: text s IČO, DIČ, zápisem v OR (např. „Společnost zapsaná v OR vedeném u …, oddíl C, vložka …").
   - **Memo**: volitelná poznámka.
   - **Default payment terms**: 0 dní (platba předem).
4. **Settings → Billing → Invoice numbering**
   - Nechte výchozí pořadové číslování (Stripe generuje formát `XXXX-0001`).

### Krok C — Daně (DPH)
Tři možnosti, vyberte jednu:
- **A) Stripe Tax (doporučeno, +0,5 % z transakce)** — Stripe automaticky vypočítá a vybere DPH. Zapne se v **Settings → Tax → Stripe Tax** a u Checkout sessions se přidá `automatic_tax: { enabled: true }`.
- **B) Bez Stripe Tax** — DPH si počítáte sami. U produktu nastavíte cenu s DPH; faktura DPH neukáže rozloženou.
- **C) Plné Managed Payments (+3,5 %)** — Stripe řeší vše včetně podání DPH. Pro malé projekty zbytečné.

Pokud chcete A nebo C, řekněte mi to a já to v kódu přepnu.

### Krok D — Po dokončení nastavení
1. V Lovable Payments klikněte **Run readiness check** – ověří, že vše funguje.
2. Zkušebně proveďte platbu testovací kartou (`4242 4242 4242 4242` v sandbox módu).
3. Ve Stripe dashboardu **Invoices** zkontrolujte, že se faktura vygenerovala se správnými údaji.
4. V aplikaci v **Nastavení účtu → Faktury** klikněte na „Stáhnout PDF" – PDF se musí stáhnout přímo.

### Kde ve Stripe najdete jednotlivé faktury (pro vás jako majitele)
- `dashboard.stripe.com` → **Billing → Invoices** – všechny vystavené faktury, lze stáhnout, refundovat, znovu odeslat e-mailem.

---

## Část 3 — Technické detaily implementace (pro odbornou kontrolu)

```text
list-invoices (edge function)
 ├─ select payments where status='paid' AND user_id=auth.user
 ├─ for each payment:
 │   ├─ if stripe_invoice_id → stripe.invoices.retrieve(id)
 │   ├─ else if stripe_customer_id + payment_intent
 │   │       → stripe.invoices.list({customer, limit:5})
 │   │       → match by payment_intent
 │   └─ else → null URLs
 └─ return {id, number, amount, currency, created,
            status, hosted_invoice_url, invoice_pdf}
```

UI v `InvoicesList.tsx`:
- 2 tlačítka na řádek: `<a href={hosted_invoice_url} target="_blank">Zobrazit</a>` a `<a href={invoice_pdf} download>PDF</a>`.
- Fallback text, když URL chybí.

---

## Co potvrdit před implementací
1. Použít **Stripe Tax (varianta A, +0,5 %)** pro automatický výpočet DPH? Nebo zatím **bez DPH automatiky (B)**?
2. Mám rovnou doplnit do `create-checkout` parametr `automatic_tax: { enabled: true }` (pokud zvolíte A)?

Po odpovědi spustím implementaci kódových změn (cca 2 soubory) a vy paralelně vyplníte údaje ve Stripe dashboardu podle návodu výše.
