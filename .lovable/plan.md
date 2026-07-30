## Jak mi umožnit klikací testování

Mohu aplikaci proklikat automatizovaným prohlížečem, ale potřebuji přihlášenou relaci. Ta se mi předává jen tehdy, když jste **přihlášený v Lovable náhledu** (okno Preview vpravo). Teď je stav relace „odhlášen“, proto jsem minule testoval jen databázi.

### Co uděláte vy (30 sekund)
1. V náhledu (Preview) se přihlaste účtem, pod kterým chcete testovat – ideálně **zaplaceným ne-adminem** (např. „Zkouška“), protože to je běžný uživatel. Když chci ověřit i admin sekci, přihlaste se na admina.
2. Zůstaňte přihlášený a napište mi zprávu (např. „jsem přihlášený, testuj“). Relace se mi předá až s tou další zprávou.

Pozn.: Pokud chcete testovat ostrou doménu zgrpacademy.lovable.app, přihlášení se mi tam nepředává – tam testuji jen náhled, který běží nad stejnou databází.

### Co pak proklikám já
- Přihlášení → výběr sekce → Dashboard (načtení bodů, levelů)
- Level: karta Kvíz a Doplňování – že se opravdu zobrazí otázky, přeskakování, posuvník, uložení pozice a návrat na rozdělanou otázku
- Závěrečný test levelu: odeslání, barevné vyhodnocení, zápis skóre
- Závěrečný test skupiny: odemčení, kontrola odpovědí po testu
- Certifikát: náhled + tisk/PDF
- Procvičování (Review), Účet, faktury
- Mobilní rozlišení (393×706) – spodní navigace, tap-targety, scrollování
- Konzole a síťové požadavky: hlídám chyby, 401/403, prázdné odpovědi

### Výstup
Sepíšu nález bod po bodu se snímky obrazovky a rovnou navrhnu (nebo po vašem odsouhlasení opravím) vše, co nebude fungovat.

### Technická poznámka
Testování probíhá headless prohlížečem proti běžícímu náhledu na stejné databázi. Nic v datech nemažu; pokud test zapíše postup (např. dokončený test u účtu „Zkouška“), po dokončení ho můžu vrátit resetem postupu daného účtu.
