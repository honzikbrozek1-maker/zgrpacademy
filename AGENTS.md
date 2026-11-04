# Project architecture rules

- Keep user-facing localization in the shared i18n layer and localized course content in language-suffixed database fields, so UI and authored content can fall back independently.
- Preserve Czech as the canonical authored course language; automated translations fill only empty localized fields so manual corrections are never overwritten.
- Duplicate-question checks use one shared similarity helper and compare only questions a learner sees in the same run (same-type practice module, whole level test, whole group test), because repeats across practice and tests are intended.
