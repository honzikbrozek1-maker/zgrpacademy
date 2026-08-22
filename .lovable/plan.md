# Cookie souhlas (cookie consent banner)

## Proč to přidáváme
V ČR a na Slovensku platí GDPR + ePrivacy. V aplikaci zatím nejsou analytické ani marketingové cookies, ale Supabase (přihlášení), Stripe (platba) a PWA ukládají technické cookies. Pro bezpečný provoz a případné budoucí měření (Google Analytics apod.) přidáme jednoduchý, nenápadný cookie banner s možností výběru kategorií.

## Co se postaví

### 1. Nový komponent `CookieConsent`
- Zobrazí se při první návštěvě na spodní části obrazovky (desktop i mobil).
- Dvě tlačítka: **„Přijmout vše"** a **„Podrobné nastavení"**.
- V detailním nastavení kategorie:
  - **Nezbytné** – vždy zapnuté, nelze vypnout (auth, Stripe, bezpečnost, PWA).
  - **Funkční** – jazyk, barevné schéma, preference zvuku (výchozí zapnuto).
  - **Analytické** – výchozí vypnuto, připraveno pro Google Analytics / jiné měření.
  - **Marketingové** – výchozí vypnuto, připraveno pro reklamní pixely.
- Souhlas se uloží do `localStorage` pod klíčem `cookie-consent`.
- Po uložení banner zmizí a znovu se nezobrazí, dokud uživatel nevymaže localStorage.

### 2. Integrace do aplikace
- Komponent se vloží do `src/App.tsx` mimo router, aby byl viditelný na všech stránkách (včetně landing page).
- Vytvoří se hook `useCookieConsent` pro čtení souhlasu v jiných částech aplikace (např. pro budoucí analytiku).

### 3. Překlady
- Přidá se slovníkový klíč do českého a slovenského jazykového souboru (`src/lib/i18n/sk/shell.ts` nebo nový `src/lib/i18n/sk/cookies.ts`).
- Texty budou přeložené do češtiny i slovenštiny.

### 4. Odkaz na zásady cookies
- Do banneru se přidá odkaz na stránku se zásadami používání cookies. Pro jednoduchost využijeme existující landing page nebo přidáme nový statický text na landing page (`/`), dokud nebude samostatná stránka podmínek.

### 5. Budoucí rozšířitelnost
- Kód analytických/marketingových skriptů se bude načítat jen při souhlasu. V tuto chvíli se žádné nové skripty nepřidávají.

## Technické detaily
- Bez nových závislostí (postavíme na shadcn/ui komponentech – Sheet/Dialog, Switch, Button).
- Responzivní design, nezastínění důležitého obsahu na mobilu.
- Barevné schéma bude respektovat aktuální theme pomocí existujících CSS proměnných.
- Výchozí jazyk banneru dle aktuálního nastavení aplikace.

## Výsledek
Návštěvník uvidí při první návštěvě jednoduchý dolní banner, může buď jedním kliknutím přijmout vše, nebo si nastavit kategorie. Souhlas se uloží, banner se nebude opakovat. Aplikace bude připravena na bezpečné připojení analytiky bez porušení GDPR.
