## Cíl

Přidat třetí možnost **„Závěrečný test"** do dialogu **Přidat** v nastavení levelu — vedle Kvízu a Doplňování. Otázky vytvořené touto cestou budou patřit pouze do závěrečného testu (nezobrazí se v procvičovacích sekcích). Možnost stejně funguje i v AI importu, kde admin zvolí kolik vygenerovat kvízových a kolik doplňovacích otázek pro test.

## UX

**Tlačítko Přidat → výběr typu (3 dlaždice):**

```text
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ 🧠 Kvíz          │  │ ✏️ Doplňování    │  │ 🏁 Závěrečný test│
│ procvičování     │  │ procvičování     │  │ otázka jen do    │
│                  │  │                  │  │ testu levelu     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

Po kliknutí na „Závěrečný test" se objeví druhý krok — výběr formátu otázky (Kvíz / Doplňování). Pak se otevře již existující formulář, jen s příznakem, že otázka jde pouze do testu.

**AI generování** dostane přepínač **„Generovat otázky pro závěrečný test"**. Po zapnutí se místo jednoho „počet otázek" zobrazí dvě pole:
- Počet kvízových otázek
- Počet doplňovacích otázek

AI bude jako kontext znát i existující procvičovací otázky (aby je neopakovala) — to už dnes dělá.

**V seznamu otázek** dostanou test-only otázky badge **„Jen test"**, aby bylo na první pohled jasné, kam patří. Stávající přepínač „v testu" odstraním (databázové pole `in_level_test` zůstane pro případnou budoucnost).

## Technické změny

**Databáze** (migrace):
- Přidat sloupec `questions.in_practice boolean NOT NULL DEFAULT true`. Existující otázky tím zůstanou v procvičování.
- View `questions_safe` rozšířit o `in_practice`.

**Frontend** (`src/pages/AdminPanel.tsx`):
- 3. dlaždice + sub-step (`pick_test_format`) v `addStep` state.
- `qForm` rozšířit o `in_practice` boolean. `saveQuestion` ho posílá do `payload`.
- AI dialog: nový state `aiForTest`, `aiQuizCount`, `aiFillCount`; při zapnutém režimu se posílá jeden požadavek na typ s daným počtem a `in_practice:false` při uložení.
- Odstranit Switch `toggleInLevelTest` z řádku otázky; přidat Badge „Jen test" pro `q.in_practice === false`.

**Procvičovací moduly** (filtr `in_practice = true` při SELECTu z `questions_safe`):
- `src/pages/LevelDetail.tsx` — oba selecty.
- `src/pages/Dashboard.tsx`, `src/pages/Levels.tsx` — counts.
- `src/pages/Review.tsx` — výběr otázek k opakování.

**Závěrečný test levelu** (RPC `get_level_test` a `complete_level_v2`) zůstává beze změny — filtrují podle `in_level_test`, což je u nových test-only otázek `true` (default).

## Mimo rozsah

- Beze změn: skupinové testy, RPC, edge funkce (kromě případného drobného retušování AI promptu — ne v této vlně).
- Nemažu DB sloupec `in_level_test` (poznámka uložena do paměti pro případné znovuobnovení UI přepínače).
