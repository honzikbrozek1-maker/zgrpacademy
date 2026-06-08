## Cíl
Po dokončení závěrečného testu levelu zobrazit přehled odpovědí s barevným označením (zelená = správně, červená = špatně) a se správnou odpovědí u chybných otázek. Během testu samotného nic neprozrazovat — uživatel se učí až z výsledku.

## Co se změní

Soubor: `src/components/LevelTest.tsx`

### 1. Rozšířit ukládání výsledku
RPC `complete_level_v2` už dnes vrací `per_question: [{ question_id, correct }]`. Doplníme stav, který si zapamatuje:
- mapování `question_id → correct` (z RPC),
- správnou odpověď pro chybné otázky.

Správnou odpověď získáme tak, že pro každou chybně zodpovězenou otázku zavoláme existující RPC `check_quiz_answer` (vrací `correct_answer` jako index 1–4) — stejnou cestou jako `QuizModule`. U otázek typu `flashcard` / `fill_in` se `check_quiz_answer` použít nedá; tam zobrazíme jen označení „špatně“ bez prozrazení textu (aby si je uživatel musel dohledat ve studijním režimu — proto „ne až moc jednoduché“).

Alternativně (čistší): rozšířit RPC `complete_level_v2`, aby vracela i `correct_answer_text` pro každou otázku. To bych ale dělat nechtěl bez tvého svolení — vyžaduje migraci.

**Navrhuji první variantu** (žádná migrace, jen klient): u kvízových otázek dotáhneme správnou variantu přes `check_quiz_answer`, u kartiček/doplňování ukážeme jen „špatně / správně“ bez prozrazení textu.

### 2. Nová obrazovka „Přehled odpovědí“
Po dokončení testu (vedle dnešního skóre) přidat sbalitelnou sekci „Zobrazit přehled odpovědí“ (collapsible, defaultně rozbalená). Pro každou otázku:
- text otázky,
- ikona ✓ (success) nebo ✗ (destructive),
- tvoje odpověď (zeleně pokud správně, červeně pokud špatně),
- u kvízu navíc „Správná odpověď: …“ pokud byla otázka špatně,
- u flashcard/fill_in jen poznámka „Správnou odpověď najdeš v procvičování / opakování“.

Tlačítka „Zpět na levely“ a (pokud neprošel) „Zkusit znovu“ zůstávají.

### 3. Drobnost – „aby to nebylo až moc jednoduché“
- Během testu žádné průběžné zvýrazňování (zůstává jako dnes).
- Přehled se ukáže až po odeslání.
- U chybných otázek typu kvíz se ukáže správná varianta — to je didakticky to hlavní. U kartiček/doplňování záměrně neprozrazujeme, aby uživatel musel projít procvičováním (tyto otázky se navíc už automaticky přidávají do `review_items`, takže se vrátí v opakování).

## Co se NEmění
- Logika hodnocení a `passing_score`.
- Chování `QuizModule` (procvičování) — to už feedback dává hned.
- Backend / RLS / migrace.

## Technické detaily
- Přidat stav `reviewData: Array<{ question: TestItem; userAnswer: string; correct: boolean; correctAnswerText?: string }>`.
- Po `complete_level_v2` projít `per_question`; pro každou nesprávnou kvízovou otázku zavolat `supabase.rpc('check_quiz_answer', { p_question_id, p_answer: 1 })` jen pokud potřebujeme získat `correct_answer` index, a namapovat na text z `item.options[correct_answer-1]`. (Pozn.: `check_quiz_answer` vrací `correct_answer` vždy v poli odpovědí — ověřím, že vrací i když `correct=true`; pokud ne, zavoláme jen pro nesprávné.)
- Typ otázky odlišíme podle `item.type` (`quiz` | `flashcard` | `fill_in`).
- Použít existující design tokeny: `text-success`, `bg-success/10`, `text-destructive`, `bg-destructive/10`, ikony `CheckCircle` / `XCircle` z lucide-react.

Pokud ti přístup sedí, přepnu do build módu a implementuji.