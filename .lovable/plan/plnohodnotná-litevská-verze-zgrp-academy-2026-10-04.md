# Plnohodnotná litevská verze ZGRP Academy

## Výsledek
Aplikace dostane třetí jazyk **LT – litevštinu**. Litevský návštěvník ji uvidí automaticky podle jazyka prohlížeče, jazyk si však bude moci kdykoli přepnout mezi CZ, SK a LT. Přeloženy budou obrazovky, studijní obsah, otázky, testy, právní stránky i certifikáty.

## Co upravím

### 1. Jazyk celé aplikace
- Rozšířím volbu jazyka na CZ / SK / LT a uložení preference do profilu i prohlížeče.
- Pro prohlížeče s litevštinou (`lt`) nastavím při první návštěvě automaticky litevštinu; uložená volba uživatele má vždy přednost.
- Doplním litevské formátování data a správné označení jazyka stránky pro přístupnost a vyhledávače.

### 2. Všechny obrazovky a systémové texty
- Přeložím přihlášení, registraci, platbu, navigaci, účet, vyhledávání, výuku, procvičování, testy, výsledky, administraci, cookie lištu a chybové či potvrzovací zprávy.
- Zachovám význam českých vět, proměnné jako jména a skóre i názvy značek.
- Doplním litevské texty SEO pro veřejné stránky.

### 3. Studijní obsah a otázky
- Přidám litevská pole k levelům, skupinám, otázkám a všem textům certifikátů.
- Rozšířím zabezpečené funkce pro procvičování a testy, aby vracely litevské otázky i správně kontrolovaly litevské odpovědi.
- Existující český obsah přeložím do přirozené litevštiny po dávkách. Česká verze zůstane bezpečnou zálohou, pokud nový obsah ještě nebude přeložen.

### 4. Certifikáty
- Litevsky se zobrazí název skupiny, nadpis, úvod, titul, poznámka, vydavatel, datum, platnost i ovládací texty.
- Tisk zůstane na jedné stránce A4 a bude používat litevský formát data.

### 5. Administrace překladů
- Stávající správu slovenského obsahu rozšířím na přehled překladů podle jazyka.
- Administrátor uvidí chybějící litevské překlady a bude je moci bezpečně doplnit; ruční překlady se bez výslovného požadavku nepřepíšou.
- Editace otázek a skupin bude podporovat samostatnou litevskou záložku.

### 6. Ověření
- Zkontroluji úplnost překladového slovníku proti skutečně používaným textům.
- Otestuji automatický výběr litevštiny, ruční přepínání a zachování volby po obnovení.
- Ověřím přihlášení, veřejné a právní stránky, studijní obsah, testy a náhled i tisk certifikátu v litevštině.

## Technické detaily
- Databázové sloupce budou používat příponu `_lt`; jazykový kód bude `lt`.
- Lokalizační výběr bude podporovat `cs`, `sk` a `lt` s návratem k češtině pouze při chybějícím překladu.
- Aktualizované databázové funkce zachovají nynější kontroly přihlášení, zaplacení a přístupu k levelům.
- Cena a obchodní pravidla se tímto úkolem nemění; pouze se věrně přeloží jejich znění.
