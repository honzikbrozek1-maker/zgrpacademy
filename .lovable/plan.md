## Výsledek testu (přihlášen jako Jan Brožek, mobil 393 px)

- Úvod, výběr sekce, Levely i Admin panel se načítají správně, spodní navigace funguje (Domů / Levely / Certifikáty / Admin / Účet).
- Admin → Obsah ukazuje všechny 4 levely, záložky Obsah / Skupiny / Uživatelé / Koš / Žádosti jsou dostupné (vodorovně posuvné).
- V konzoli nejsou žádné skutečné chyby – jen vývojová varování Reactu z knihoven, na provoz nemají vliv.
- Google přihlášení v Preview: potvrzuji, v editoru běží náhled v iframu s jinou doménou, na ostré verzi to funguje. Neřeším.

---

## Návrh: jak předepisovat certifikáty rozumněji

### Problém dneška
Celý text certifikátu je jedno velké volné pole. Komponenta ho pak musí „hádat“ regulárními výrazy: hledá frázi „SPECIALISTA ZDRAVOTNÍHO PROTOKOLU“, aby ji zvětšila, vyřezává řádek začínající „Vydává…“ dolů na patičku a hledá v textu jméno, aby ho zvýraznila. Když se text napíše jinak (jiný titul, jiná diakritika, jiný pořádek), grafika se rozpadne a admin netuší proč.

### Cíl
Admin vyplní pár jasných polí, rozvržení certifikátu je vždy stejné a předvídatelné.

### Navrhovaná struktura certifikátu (pevné rozvržení)

```text
            [logo spolku]
              CERTIFIKÁT
     ── nadpis (pevný, needituje se) ──

   uvozovací věta          "o absolvování kurzu zakončeného
                            odbornou zkouškou a získání titulu"

   TITUL (velký, hlavní)   SPECIALISTA ZDRAVOTNÍHO PROTOKOLU
   ───── ozdobná linka ─────

   pro                     Jan Brožek        (velké jméno)
   doplňující věta         (volitelná, kurzíva)

   Datum absolvování: 31. 7. 2026
   Platnost do: 31. 7. 2027

   [podpis 1]              [podpis 2 – obrázek]
   MUDr. Gabriela H.       Ing. Tomáš Brožek, MBA

            Vydává SPOLEK V ROVNOVÁZE Z.S.
```

### Co bude admin vyplňovat (nová pole místo jednoho textu)
1. **Uvozovací věta** – např. „o absolvování kurzu zakončeného odbornou zkouškou a získání titulu“
2. **Titul / hlavní nadpis** – např. „SPECIALISTA ZDRAVOTNÍHO PROTOKOLU“ (vždy se vysází velkým písmem, žádné hádání)
3. **Doplňující věta pod jménem** – volitelná (např. obor, rozsah kurzu, skóre)
4. **Vydavatel** – např. „SPOLEK V ROVNOVÁZE Z.S.“ (vždy dole)
5. **Podpisující osoba** (druhý podpis Ing. Tomáš Brožek zůstává pevný)
6. **Platnost (roky)** – 0 = bez omezení
7. **Podtitul** (ZGRP Academy) – zůstává

Jméno příjemce, datum a skóre se doplňují automaticky, nemusí se psát do textu.

### Proměnné
Zůstanou tlačítka pro `{user_name}`, `{group_title}`, `{score}`, `{date}`, `{valid_until}` – ale už jen jako doplněk ve větách, ne jako nutnost.

### Přednastavení
Nová skupina dostane rovnou vyplněné výchozí hodnoty podle vašeho zadání, takže „velké změny se dělat nebudou“ – admin jen případně změní titul nebo uvozovací větu.

### Zpětná kompatibilita
Existující skupiny mají text v jednom poli. Při přechodu ho jednorázově rozdělím do nových polí (uvozovací věta / titul / vydavatel) migrací, takže se nic vizuálně nezmění a nikdo nemusí nic přepisovat ručně.

### Živý náhled
Náhled v adminu zůstává (A4 1:1) a bude se překreslovat při psaní – tisk i PDF budou vypadat úplně stejně jako náhled.

---

## Technická poznámka
- Do `level_groups` přidám sloupce `diploma_intro_text`, `diploma_award_title`, `diploma_note_text`, `diploma_issuer` (s výchozími hodnotami) a migrací naplním z dnešního `diploma_body_text`; staré pole ponechám jako zálohu.
- `DiplomaCertificate.tsx` přejde na tato pole a zahodí regexy `HIGHLIGHT_RE` / `ISSUER_RE` / dělení podle jména – náhled i tiskové HTML budou sdílet stejné rozvržení.
- `AdminGroupsTab.tsx` dostane místo jednoho textarea sadu popsaných polí s náhledem.
- `list_my_diplomas` RPC rozšířím o nové sloupce.

Řekněte, jestli sedí rozvržení a názvy polí (nebo co změnit), a pustím se do toho.
