## Proč se v platbě stále ukazuje testovací režim

Tvoje účet ve Stripe už je v live režimu (proto v dashboardu vidíš zelený banner „Live mode"). Aplikace ale rozhoduje o tom, zda jet v testu nebo na ostro, podle toho, kde je spuštěná:

- **Preview / náhled** (`*.lovable.app`, `*.lovableproject.com`) → vždy načítá `.env.development`, který obsahuje `pk_test_…` token → posílá do Stripe `environment: "sandbox"` → tedy testovací platba s kartou 4242…
- **Publikovaná doména** (`zgrpacademy.lovable.app` po stisknutí **Publish/Update**) → načítá `.env.production` s `pk_live_…` → ostrá platba.

V síťových requestech vidím, že `create-checkout` opravdu odesílá `environment: "sandbox"` a vrací `cs_test_…` session — to potvrzuje, že platbu zkoušíš z preview.

**Co s tím:** žádná změna v kódu není potřeba. Stačí v editoru kliknout na **Publish → Update**, otevřít `https://zgrpacademy.lovable.app` a tam zkusit platbu — proběhne na ostro. Preview nech sloužit testovacím platbám (kartou 4242…), to je záměr a nemělo by se to měnit, jinak bys riskoval, že při vývoji omylem spustíš reálnou platbu.

## Nápověda k městu a PSČ

Stripe Embedded Checkout je vykreslovaný v iframe — vlastní placeholdery do polí „City" a „Postal code" tam dopsat nejde, Stripe to v tomto UI nepovoluje. Můžu ale rozšířit naši vlastní nápovědu nad formulářem tak, aby zmiňovala i město a PSČ.

### Změna v `src/pages/Checkout.tsx`

Do existující karty „Nápověda k vyplnění adresy" přidat dva řádky:

- **City (Město):** název obce, např. *Praha* nebo *Brno*.
- **Postal code (PSČ):** poštovní směrovací číslo, v ČR 5 číslic (např. *110 00*), na SK 5 číslic (např. *811 01*).

Zbytek karty zůstává.

## Co se nemění

- `src/lib/stripe.ts`, `.env.production`, `.env.development`, edge funkce `create-checkout` — vše už je správně, žádná úprava není potřeba.
- Banner „Všechny platby v náhledu jsou v testovacím režimu" zůstává — v produkci se sám skryje.

## Po implementaci

1. Klikni v editoru na **Publish → Update**.
2. Otevři `https://zgrpacademy.lovable.app/checkout`.
3. Zkus reálnou kartu — banner test režimu bude pryč a Stripe vrátí `cs_live_…` session.
