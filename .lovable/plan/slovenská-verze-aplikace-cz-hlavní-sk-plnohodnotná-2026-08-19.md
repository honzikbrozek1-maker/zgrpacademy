# Slovenská verze aplikace (CZ hlavní, SK plnohodnotná)

Cíl: celá aplikace použitelná ve slovenštině — rozhraní i obsah (levely, skupiny, otázky, certifikáty). Čeština zůstává výchozím a hlavním jazykem.

## Jak to bude fungovat pro uživatele

- Při první návštěvě se jazyk zvolí automaticky podle prohlížeče (slovenský prohlížeč → slovenština, vše ostatní → čeština).
- Ruční přepínač jazyka (CZ / SK) bude v hlavičce a v Nastavení účtu; volba se uloží do profilu, takže platí na všech zařízeních.
- Obsah (názvy levelů, popisy, otázky, texty certifikátů) se zobrazí ve slovenštině, pokud existuje slovenský překlad; jinak se automaticky použije česká verze — nikde tedy nevznikne prázdné místo.
- V admin sekci u každého levelu, skupiny i otázky přibude záložka „SK", kde se vyplní slovenská verze textů.

## Části řešení

### 1. Databáze (překlady obsahu)
Přidání volitelných slovenských polí:
- `levels`: `title_sk`, `description_sk`
- `level_groups`: `title_sk`, `description_sk` a slovenské varianty všech textů certifikátu (nadpis, podnadpis, úvod, tělo, poznámka, vydavatel, název ocenění)
- `questions`: `question_text_sk`, `option_1_sk`–`option_4_sk`, `back_text_sk`, `wrong_option_1_sk`–`wrong_option_3_sk`
- `profiles`: `language` (výchozí `cs`)

Zároveň se upraví bezpečné funkce (`get_practice_questions`, `get_level_test`, `get_group_test`, `complete_*`, `list_my_diplomas`), aby vracely texty v požadovaném jazyce s automatickým návratem k češtině. Vyhodnocování správných odpovědí zůstává beze změny na serveru.

### 2. Rozhraní (překlad textů)
- Zavedení lehkého překladového systému (slovníky `cs` a `sk` + hook `useT()`), bez nové těžké knihovny.
- Postupný převod všech obrazovek: přihlášení a registrace, platba, výběr sekce, přehled, levely a detail levelu, procvičovací moduly (kvíz, doplňovačka, kartičky), testy, opakování, certifikáty, účet, pozvánky, admin sekce, vyhledávání, mobilní navigace, chybové a systémové hlášky.
- Slovenské znění bude přirozená slovenština, ne doslovný přepis.

### 3. SEO
- Slovenská verze meta titulků a popisů podle zvoleného jazyka.
- `hreflang` odkazy pro `cs` a `sk`, `lang` atribut na `<html>` se mění podle jazyka.

## Technické poznámky

- Překlady UI: `src/lib/i18n/cs.ts`, `src/lib/i18n/sk.ts`, provider `src/lib/i18n/index.tsx` s `useT()`; klíče jsou ploché řetězce s podporou proměnných (`{count}`).
- Výběr jazyka: profil (`profiles.language`) → localStorage → `navigator.language` → `cs`.
- Obsah: pomocná funkce `pickLang(row, field, lang)` pro fallback na češtinu; v RPC totéž přes `coalesce`.
- Admin formuláře dostanou přepínač CZ/SK nad textovými poli, aby zůstaly přehledné.
- Práce proběhne po vrstvách: nejdřív databáze a jádro překladů, pak jednotlivé obrazovky.
