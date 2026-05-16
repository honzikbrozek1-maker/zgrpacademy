# Plán změn

## 1. Oprava prokliku z Dashboardu na level
Dashboard teď naviguje na `${basePath}/level/${level.order_index}`, ale prvotní render LevelDetail občas přesměruje na `/levels` (při loadu před tím, než zná UUID). Sjednotím to — Dashboard bude navigovat přímo na `${basePath}/level/${level.id}` (UUID), stejně jako stránka Levely. Tím odpadne dvojkrokové přesměrování.

## 2. Logo Spolku v rovnováze do diplomů
- Nahraju `user-uploads://logo_spolek_v_rovnováze.png` do `src/assets/logo-spolek.png`.
- V `src/components/DiplomaCertificate.tsx` přidám logo do hlavičky diplomu (vlevo nahoře, vedle / nad názvem).

## 3. Skupinové odemykání + závěrečný test skupiny + diplom

### Datový model (migrace)
- Sloupec `level_groups.order_index` už existuje → použiju pro pořadí skupin v rámci kategorie.
- Přidám sloupec `level_groups.final_test_passing_score INT DEFAULT 70`.
- Otázky pro závěrečný test skupiny: rozšířím tabulku `questions` o nullable `group_id UUID` (otázka patří buď k levelu, nebo ke skupině). Přidám CHECK, že je vyplněn právě jeden z `level_id` / `group_id`.
- Nová tabulka `user_group_progress (user_id, group_id, passed bool, test_score int, completed_at)` s RLS (vlastník vidí svoje, admin vidí vše; zápis přes RPC).

### Nové/upravené RPC
- `get_group_test(p_group_id)` — vrátí otázky se zamíchanými možnostmi (po vzoru `get_level_test`), kontrola: všechny levely skupiny musí mít passed závěrečný test.
- `complete_group_test_v2(p_group_id, p_answers)` — vyhodnotí, zapíše do `user_group_progress`, vrátí `{passed, score}`.
- `issue_diploma_if_eligible` — upravím: vyžaduje, aby existoval záznam v `user_group_progress` s `passed = true` (místo dosavadní průměrné známky z levelů).
- `is_group_unlocked(p_user_id, p_group_id)` — pomocná SQL funkce: skupina s nejnižším `order_index` je vždy odemčená; další odemčená až po `user_group_progress.passed = true` pro skupinu s předchozím `order_index`.
- Doplním view nebo selectovatelná data, aby frontend mohl snadno zjistit stav skupin.

### Frontend
- `Levels.tsx` a `Dashboard.tsx`:
  - Načtu skupiny s `order_index` + stav `user_group_progress`.
  - Levely se zobrazí seskupené po `level_groups`. Skupina je odemčená podle pravidla výše; uvnitř skupiny jsou všechny levely odemčené najednou (zámek se odebírá z jednotlivých levelů, řídí se jen na úrovni skupiny).
  - Pod každou skupinou nové dlaždice: „Závěrečný test skupiny" (dostupný až jsou všechny levely passed) a „Diplom" (dostupný až je závěrečný test skupiny passed).
- Nová stránka/komponenta `GroupFinalTest` (analogická `LevelTest`) volaná z `/products/group/:groupId/test` (a backoffice ekvivalent).
- `Diplomas.tsx` — diplom se zobrazí jen pro skupiny s passed závěrečným testem (logika už řízená přes `issue_diploma_if_eligible`).

## 4. Závěrečný test levelu dostupný kdykoli
- V `LevelDetail.tsx` odstraním podmínku, která test podmiňuje dokončením všech modulů. Test bude vždy přístupný (záložka / tlačítko viditelné od začátku).

## 5. Odstranění kartiček (s možností vrátit)
- V UI:
  - `LevelDetail.tsx` — odstraním záložku „Kartičky" a related state. `FlashcardModule.tsx` ponechám v repozitáři (nebudu mazat, jen přestanu importovat).
  - `LevelTest` a `complete_level_v2` / `get_level_test` — necháme jak jsou (umí kartičky, pokud někdy budou). Test ale automaticky kartičky přeskočí, pokud nebudou.
  - Admin panel — v UI pro tvorbu otázek odstraním možnost vybrat typ „flashcard". Existující flashcard otázky v DB zachovám.
- V `generate-questions` edge funkci — vyřadím `flashcard` z dovolených typů (server-side guard), prompt přizpůsobím.
- V `levelProgress.ts` — vyřadím `flashcards` ze `MODULE_KEYS` (zůstanou jen `quiz`, `fillin`). Mapování ponechám pro budoucí navrácení (zakomentované).

## 6. AI import pro doplňování
- Edge funkce `generate-questions` už dnes typ `fill_blank` plně podporuje (instrukce pro mezeru `______`, čtyři možnosti, `correct_answer`, `back_text` se správným slovem). Otestuju a pokud něco chybí, doladím prompt.
- V admin UI zajistím, že checkbox „Doplňování" se posílá jako `fill_blank` (ověřím; pokud ne, opravím).

## Technické detaily

```
Tabulky:
  level_groups: + final_test_passing_score INT DEFAULT 70
  questions: + group_id UUID NULL, CHECK ((level_id IS NULL) <> (group_id IS NULL))
  user_group_progress (nová): id, user_id, group_id, passed, test_score, completed_at

RPC:
  get_group_test(p_group_id) -> jsonb
  complete_group_test_v2(p_group_id, p_answers) -> jsonb
  is_group_unlocked(p_user_id, p_group_id) -> bool
  issue_diploma_if_eligible -> upravit (vyžadovat passed group test)

Routes:
  /products/group/:groupId/test  (+ backoffice ekvivalent)

Smazat z UI (ne z repa):
  FlashcardModule import a záložka v LevelDetail
  typ "flashcard" v admin form a v generate-questions edge fn
```

## Pořadí provedení
1. Migrace DB (schema + RPC).
2. Frontend skupin (Dashboard, Levels), nová stránka group test.
3. Diplom + logo.
4. Odstranění kartiček a oprava závěr. testu levelu (vždy dostupný).
5. Oprava navigace z Dashboardu.
6. Úprava edge funkce (typ flashcard pryč).
