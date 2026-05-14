## Současný stav

- `LevelTest` dostává jen otázky typu `quiz` (filtr v `LevelDetail.tsx`).
- RPC `complete_level` skóruje pouze otázky, kde `correct_answer IS NOT NULL` → kartičky a doplňování v testu nejsou.
- Sloupce `option_1..4` u kartiček a doplňování jsou nevyužité (`null`).

## Cíl

Závěrečný test pokryje **všechny** otázky levelu (quiz + kartičky + doplňování), ale prezentuje je **jednotně jako kvíz** se 4 možnostmi a 1 správnou. Stejné otázky zůstávají i v procvičování ve své původní formě (front/back u kartiček, ___ u doplňování).

## Návrh řešení

### 1. Databáze — uložení distraktorů

Přidat do tabulky `questions` 3 nové nullable sloupce:

- `wrong_option_1 text`
- `wrong_option_2 text`
- `wrong_option_3 text`

Použijí se jen pro typy `flashcard` a `fill_blank` jako 3 nesprávné odpovědi v testu. Správná odpověď zůstává v `back_text`. U typu `quiz` se nepoužívají (ten už má `option_1..4` + `correct_answer`).

### 2. Nové RPC pro test

**`get_level_test(p_level_id)`** — vrátí otázky levelu připravené pro kvízový režim:

- Pro `quiz`: id, question_text, 4 možnosti v pořadí option_1..4 (volitelně zamíchané).
- Pro `flashcard`: id, question_text (= přední strana), 4 možnosti = `back_text` + 3× `wrong_option_*`, zamíchané.
- Pro `fill_blank`: id, question_text (s `___`), 4 možnosti = `back_text` + 3× `wrong_option_*`, zamíchané.
- Vrátí mapování `option_index → text`, ale **nikdy** neodhalí, který index je správný.
- Otázky kartiček/doplňování **bez vyplněných distraktorů** se přeskočí (a do logu/varování pro admina).

**`complete_level_v2(p_level_id, p_answers)`** — `p_answers` ve tvaru `[{question_id, answer_text}]`. Server porovná `answer_text` s kanonickou správnou odpovědí (pro quiz `option_X` podle `correct_answer`, jinak `back_text`), spočítá skóre, zapíše do `user_progress` stejně jako stávající `complete_level`. Stávající `complete_level` zůstane pro zpětnou kompatibilitu.

### 3. Admin panel — ruční vytváření otázek

V dialogu pro vytvoření/editaci otázky typu `flashcard` a `fill_blank` přidat 3 textová pole:

- „Špatná možnost 1 / 2 / 3 (pro závěrečný test)"

Validace: při uložení upozornit, pokud nejsou vyplněné — otázka pak nebude součástí závěrečného testu (uloží se ale normálně pro procvičování).

### 4. Admin panel — AI generování

Rozšířit prompt v edge funkci `generate-questions`, aby u `flashcard` a `fill_blank` AI vracela i pole `wrong_option_1/2/3` — 3 věrohodné nesprávné odpovědi tematicky blízké správné odpovědi. Klient je při ukládání vloží do nových sloupců.

### 5. Frontend — `LevelTest` + `LevelDetail`

- `LevelDetail.tsx`: přestat předávat jen `quizQuestions`. Místo toho v záložce „Test" zavolat `get_level_test(level.id)` a předat výsledek do `LevelTest`.
- `LevelTest.tsx`: pracovat s novým tvarem (id + 4 řetězcové možnosti místo `option_1..4` polí); odesílat odpovědi jako `answer_text` do `complete_level_v2`. Zobrazení a logika kvízu zůstávají stejné.
- Po dokončení testu zachovat současnou logiku přidávání chybných otázek do `review_items` (porovnání podle vrácené správnosti per-otázka — server může vrátit pole `{question_id, correct}`).

### 6. Migrace dat

Žádná hromadná migrace existujících kartiček/doplňování — admin je doplní postupně. V seznamu otázek v admin panelu přidat malý odznáček „⚠ Chybí distraktory pro test" u kartiček/doplňování bez vyplněných `wrong_option_*`.

## Technický souhrn

**Soubory:**

- `supabase/migrations/<new>.sql` — `ALTER TABLE questions ADD COLUMN wrong_option_1/2/3 text`; `CREATE FUNCTION get_level_test(uuid)`; `CREATE FUNCTION complete_level_v2(uuid, jsonb)`.
- `supabase/functions/generate-questions/index.ts` — rozšířit JSON schéma promptu o `wrong_option_1/2/3` pro flashcard/fill_blank.
- `src/pages/AdminPanel.tsx` — formulář otázky: 3 pole pro distraktory (zobrazená jen pro flashcard/fill_blank); ukládání `wrong_option_*`; ve výstupu AI generace přijetí těchto polí; odznáček u otázek bez distraktorů.
- `src/components/LevelTest.tsx` — přepsat na unifikovaný tvar `{id, question_text, options: string[]}`, použít `complete_level_v2`.
- `src/pages/LevelDetail.tsx` — fetch přes `get_level_test`, předat do `LevelTest` (místo `quizQuestions`).

**Zpětná kompatibilita:** `complete_level` zůstává; staré kartičky/doplňování bez distraktorů se v testu jen vynechají, dokud je admin nedoplní.
