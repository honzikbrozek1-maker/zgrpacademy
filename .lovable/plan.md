## Co je špatně

V sekci **Uživatelé** se vedle každého uživatele zobrazuje tlačítko „Admin" — vypadá to jako odznak/role, ale ve skutečnosti je to akční tlačítko „přidělit admina" (volá `toggleAdmin(userId, false)`, bez potvrzení a bez ohledu na aktuální roli). Marek tedy admin **není** — ověřeno v databázi (má pouze roli `user`). Šlo jen o matoucí UI.

## Co upravím

V `src/pages/AdminPanel.tsx`, ve funkci `renderUserCard`:

1. **Role badge** – u každého uživatele přidám jasný štítek:
   - `Admin` (variant `default`, ikona Shield) pro adminy
   - `Uživatel` (variant `secondary`) pro běžné uživatele
   - rozpoznání podle `adminList` (už se načítá přes RPC `list_admins`)

2. **Akční tlačítko podle role:**
   - Pokud uživatel **není admin** → tlačítko „Přidělit admina" s `AlertDialog` potvrzením („Opravdu chcete uživateli X přidělit admin oprávnění?")
   - Pokud uživatel **je admin** → tlačítko „Odebrat admina" s `AlertDialog` potvrzením
   - U sebe sama tlačítko skryju (nelze si odebrat vlastní admin práva omylem)

3. Po úspěšné změně role zavolám refresh `adminList` (přes existující `fetchAdminList`), aby se UI hned aktualizovalo.

4. Vizuálně oddělím seznam (řádek: avatar + jméno + datum registrace + role badge | tlačítka role + smazat), aby na první pohled bylo vidět kdo je co.

Žádné změny v DB ani v RLS — jen frontend.

## Mimochodem

Marek admin opravdu není, takže odebírat nemusím nic. Pokud ho v UI po opravě uvidíš jako „Uživatel", je vše v pořádku.