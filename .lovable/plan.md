# Propojení Google Search Console

Cíl: propojit projekt s Google Search Console, ověřit vlastnictví domény `zgrpacademy.lovable.app` a odeslat sitemap. Indexace zůstává povolená (žádné změny v `robots.txt` ani `sitemap.xml`).

## Kroky

1. **Spustit propojení s Google Search Console**
   - Otevře se ti přihlašovací okno Googlu, kde vybereš účet a odsouhlasíš přístup.
   - Použij ten Google účet, přes který chceš mít Search Console spravovanou (typicky tvůj hlavní).

2. **Získat ověřovací meta tag**
   - Google vrátí unikátní `<meta name="google-site-verification" content="...">` tag.

3. **Vložit ověřovací tag do `index.html`**
   - Přidám ho do `<head>` webu, aby ho Google mohl při ověření najít.

4. **Publikovat změny**
   - Bez publikace Google tag neuvidí. Po propojení tě vyzvu, ať klikneš na Publish → Update.

5. **Ověřit vlastnictví u Googlu**
   - Zavolám Google API pro ověření domény `https://zgrpacademy.lovable.app/`.

6. **Přidat property a odeslat sitemap**
   - Přidám `zgrpacademy.lovable.app` jako property v Search Console.
   - Odešlu `https://zgrpacademy.lovable.app/sitemap.xml`, aby Google věděl, které stránky procházet.

7. **Označit SEO nález jako vyřešený**
   - V panelu SEO & AI search zmizí varování „Google Search Console isn't fully set up".

## Co se NEmění

- `public/robots.txt` — indexace zůstává povolená pro všechny roboty.
- `public/sitemap.xml` — ponechán beze změn.
- Žádná úprava aplikační logiky ani UI.

## Co budu potřebovat od tebe

- **Krok 1:** kliknout v propojovacím okně na tvůj Google účet a schválit přístup.
- **Krok 4:** kliknout na tlačítko Publish → Update, aby se ověřovací meta tag dostal na živý web.

Po schválení tohoto plánu spustím krok 1.
