
Cíl: opravit procvičování tak, aby se zvládnuté položky už nevracely a chybně zodpovězené doplňování se vždy ukládalo do opakování.

Co jsem našel:
- V `Review.tsx` je chyba v přepínání režimů: pro `fillin` se teď bere celé `items` místo jen `fillBlankItems`, takže se procvičování může chovat zmateně.
- Ve `Review.tsx` se při označení jako „umím“ mění jen `confidence` a požadavek na backend se neposílá `await` + bez ošetření chyby. To může vysvětlovat stav „teď to zmizelo, ale po návratu je to zase zpět“.
- `QuizModule.tsx` ani `FillInBlankModule.tsx` při pozdější správné odpovědi nemažou starý záznam z `review_items`, takže už jednou chybně zodpovězená otázka může zůstat viset.
- V původní migraci je `review_items.source` vytvořené jen pro hodnoty `flashcard` a `failed_quiz`. Současný kód ale pro doplňování zapisuje `fill_blank`, takže je velmi pravděpodobné, že se tyto záznamy do databáze vůbec neuloží.

Plán úpravy:
1. Opravit logiku procvičování v `Review.tsx`
- správně mapovat `mode === 'fillin'` na `fillBlankItems`
- sjednotit práci s položkami tak, aby „umím“ položku rovnou odstranilo z `review_items` místo pouhé změny confidence
- všechny změny do backendu dělat `await` a po dokončení znovu synchronizovat lokální stav

2. Opravit ukládání chyb z doplňování
- přidat databázovou migraci pro `review_items`, aby `source` podporovalo i `fill_blank`
- v `FillInBlankModule.tsx` ponechat ukládání chybné odpovědi do `review_items`, ale doplnit kontrolu výsledku a okamžitý refresh

3. Opravit mazání zvládnutých otázek i mimo stránku procvičování
- v `QuizModule.tsx` a `FillInBlankModule.tsx` při správné odpovědi smazat případný existující `review_items` záznam pro danou otázku
- tím se zajistí, že když už člověk otázku zvládne, nebude se mu dál vracet do opakování

4. Zajistit okamžitou aktualizaci UI
- po insert/update/delete v procvičování znovu načíst review data
- navázat to i na počty v levelu/dashboardu, aby nebylo nutné odcházet a vracet se

5. Ověření po úpravě
- chybně odpovědět doplňování → položka se hned objeví v procvičování
- v procvičování ji odpovědět správně → zmizí a po návratu už se neobjeví
- zopakovat totéž pro kvíz i kartičky
- ověřit, že režim doplňování v procvičování ukazuje opravdu jen doplňovací otázky

Technické poznámky:
- Dotčené soubory: `src/pages/Review.tsx`, `src/components/FillInBlankModule.tsx`, `src/components/QuizModule.tsx`, případně části s refreshi počtů
- Bude velmi pravděpodobně potřeba i jedna malá databázová migrace pro `review_items`
