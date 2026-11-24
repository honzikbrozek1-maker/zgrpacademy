# Project architecture rules

- Keep user-facing localization in the shared i18n layer and localized course content in language-suffixed database fields, so UI and authored content can fall back independently.
- Preserve Czech as the canonical authored course language; automated translations fill only empty localized fields so manual corrections are never overwritten.
- Duplicate-question checks use one shared similarity helper and compare only questions a learner sees in the same run (same-type practice module, whole level test, whole group test), because repeats across practice and tests are intended.
- Public role, payment, and level-unlock checks authorize the requested user as the caller, an administrator, or the trusted service role; role checks query the protected role table without recursion so existing row policies remain safe.
- Practice answer checks authorize the question's unlocked practice level before returning answers or awarding points; administrator requests validate targets through the existing administrator directory so scoped role checks do not break requests.
