/**
 * Právní texty (CZ/SK/LT) pro zásady ochrany osobních údajů, cookies a obchodní podmínky.
 * Provozovatel: Zinzinogroup z.s., IČO 08720746, Jaurisova 515/4, Michle, 140 00 Praha 4.
 */

export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDoc = { title: string; description: string; updated: string; sections: LegalSection[] };
import { privacyLt, cookiesLt, termsLt } from './legalLt';

const OPERATOR_CS =
  'Zinzinogroup z.s., IČO 08720746, se sídlem Jaurisova 515/4, Michle, 140 00 Praha 4, zastoupený předsedou Adamem Škodou, e-mail info@zinzinogroup.com.';
const OPERATOR_SK =
  'Zinzinogroup z.s., IČO 08720746, so sídlom Jaurisova 515/4, Michle, 140 00 Praha 4, Česká republika, zastúpený predsedom Adamom Škodom, e-mail info@zinzinogroup.com.';

const UPDATED = '21. 9. 2026';

export const privacyDoc: Record<'cs' | 'sk' | 'lt', LegalDoc> = {
  cs: {
    title: 'Zásady ochrany osobních údajů',
    description:
      'Jak ZGRP Academy zpracovává osobní údaje uživatelů podle nařízení GDPR – rozsah, účel, doba uchování a vaše práva.',
    updated: UPDATED,
    sections: [
      {
        heading: '1. Správce osobních údajů',
        paragraphs: [
          `Správcem osobních údajů je ${OPERATOR_CS}`,
          'Provozujeme vzdělávací platformu ZGRP Academy dostupnou na adrese zgrpacademy.lovable.app.',
        ],
      },
      {
        heading: '2. Jaké údaje zpracováváme',
        paragraphs: [
          'Registrační údaje: jméno a příjmení, e-mailová adresa, heslo (uložené pouze v zašifrované podobě).',
          'Údaje o učení: dokončené úrovně, výsledky testů, body, vydané certifikáty a nastavení účtu (jazyk, barevné schéma).',
          'Platební údaje: informace o zaplacení jednorázového registračního poplatku (částka, měna, datum, identifikátor platby). Číslo platební karty nikdy nevidíme ani neukládáme – platbu zpracovává společnost Stripe.',
          'Technické údaje: údaje nezbytné pro přihlášení a zabezpečení (relace, čas přístupu).',
        ],
      },
      {
        heading: '3. Účel a právní základ zpracování',
        paragraphs: [
          'Plnění smlouvy (čl. 6 odst. 1 písm. b GDPR): vedení uživatelského účtu, zpřístupnění obsahu, vystavení certifikátu, vyřízení platby.',
          'Plnění právní povinnosti (čl. 6 odst. 1 písm. c GDPR): účetní a daňové doklady.',
          'Oprávněný zájem (čl. 6 odst. 1 písm. f GDPR): zabezpečení platformy a prevence zneužití.',
          'Souhlas (čl. 6 odst. 1 písm. a GDPR): volitelné cookies pro měření návštěvnosti, pokud je udělíte.',
        ],
      },
      {
        heading: '4. Příjemci údajů',
        paragraphs: [
          'Supabase (databáze, přihlašování a hostování aplikace).',
          'Stripe Payments Europe, Ltd. (zpracování platby).',
          'Google (Search Console – statistiky vyhledávání; volitelně měření návštěvnosti, pouze s vaším souhlasem).',
          'Údaje nepředáváme dalším osobám k marketingovým účelům a neprodáváme je.',
        ],
      },
      {
        heading: '5. Doba uchování',
        paragraphs: [
          'Údaje o účtu uchováváme po dobu jeho existence. Po smazání účtu se data odstraní; položky v koši administrace se automaticky mažou do 7 dnů.',
          'Účetní doklady uchováváme po dobu stanovenou zákonem (zpravidla 10 let).',
        ],
      },
      {
        heading: '6. Vaše práva',
        paragraphs: [
          'Máte právo na přístup k údajům, jejich opravu, výmaz, omezení zpracování, přenositelnost, vznesení námitky a odvolání souhlasu.',
          'Svá práva uplatníte e-mailem na info@zinzinogroup.com. Účet a data můžete smazat také sami v Nastavení účtu.',
          'Máte právo podat stížnost u Úřadu pro ochranu osobních údajů (uoou.gov.cz), na Slovensku u Úradu na ochranu osobných údajov SR (dataprotection.gov.sk).',
        ],
      },
      {
        heading: '7. Zabezpečení',
        paragraphs: [
          'Data jsou uložena na zabezpečených serverech v EU, přenos probíhá šifrovaně (HTTPS). Přístup k datům mají pouze pověření správci platformy.',
        ],
      },
    ],
  },
  sk: {
    title: 'Zásady ochrany osobných údajov',
    description:
      'Ako ZGRP Academy spracúva osobné údaje používateľov podľa nariadenia GDPR – rozsah, účel, doba uchovávania a vaše práva.',
    updated: UPDATED,
    sections: [
      {
        heading: '1. Prevádzkovateľ osobných údajov',
        paragraphs: [
          `Prevádzkovateľom osobných údajov je ${OPERATOR_SK}`,
          'Prevádzkujeme vzdelávaciu platformu ZGRP Academy dostupnú na adrese zgrpacademy.lovable.app.',
        ],
      },
      {
        heading: '2. Aké údaje spracúvame',
        paragraphs: [
          'Registračné údaje: meno a priezvisko, e-mailová adresa, heslo (uložené len v zašifrovanej podobe).',
          'Údaje o učení: dokončené úrovne, výsledky testov, body, vydané certifikáty a nastavenia účtu (jazyk, farebná schéma).',
          'Platobné údaje: informácie o zaplatení jednorazového registračného poplatku (suma, mena, dátum, identifikátor platby). Číslo platobnej karty nikdy nevidíme ani neukladáme – platbu spracúva spoločnosť Stripe.',
          'Technické údaje: údaje nevyhnutné na prihlásenie a zabezpečenie (relácia, čas prístupu).',
        ],
      },
      {
        heading: '3. Účel a právny základ spracúvania',
        paragraphs: [
          'Plnenie zmluvy (čl. 6 ods. 1 písm. b GDPR): vedenie používateľského účtu, sprístupnenie obsahu, vystavenie certifikátu, vybavenie platby.',
          'Plnenie právnej povinnosti (čl. 6 ods. 1 písm. c GDPR): účtovné a daňové doklady.',
          'Oprávnený záujem (čl. 6 ods. 1 písm. f GDPR): zabezpečenie platformy a prevencia zneužitia.',
          'Súhlas (čl. 6 ods. 1 písm. a GDPR): voliteľné cookies na meranie návštevnosti, ak ho udelíte.',
        ],
      },
      {
        heading: '4. Príjemcovia údajov',
        paragraphs: [
          'Supabase (databáza, prihlasovanie a hosting aplikácie).',
          'Stripe Payments Europe, Ltd. (spracovanie platby).',
          'Google (Search Console – štatistiky vyhľadávania; voliteľne meranie návštevnosti, len s vaším súhlasom).',
          'Údaje neodovzdávame ďalším osobám na marketingové účely a nepredávame ich.',
        ],
      },
      {
        heading: '5. Doba uchovávania',
        paragraphs: [
          'Údaje o účte uchovávame počas jeho existencie. Po zmazaní účtu sa dáta odstránia; položky v koši administrácie sa automaticky mažú do 7 dní.',
          'Účtovné doklady uchovávame po dobu stanovenú zákonom (spravidla 10 rokov).',
        ],
      },
      {
        heading: '6. Vaše práva',
        paragraphs: [
          'Máte právo na prístup k údajom, ich opravu, výmaz, obmedzenie spracúvania, prenosnosť, vznesenie námietky a odvolanie súhlasu.',
          'Svoje práva uplatníte e-mailom na info@zinzinogroup.com. Účet a dáta môžete zmazať aj sami v Nastaveniach účtu.',
          'Máte právo podať sťažnosť na Úrade na ochranu osobných údajov SR (dataprotection.gov.sk), prípadne na Úřadu pro ochranu osobních údajů ČR (uoou.gov.cz).',
        ],
      },
      {
        heading: '7. Zabezpečenie',
        paragraphs: [
          'Dáta sú uložené na zabezpečených serveroch v EÚ, prenos prebieha šifrovane (HTTPS). Prístup k dátam majú len poverení správcovia platformy.',
        ],
      },
    ],
  },
  lt: privacyLt,
};

export const cookiesDoc: Record<'cs' | 'sk' | 'lt', LegalDoc> = {
  cs: {
    title: 'Zásady používání cookies',
    description: 'Jaké cookies a místní úložiště ZGRP Academy používá a jak svůj souhlas kdykoli změníte.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Co jsou cookies',
        paragraphs: [
          'Cookies a místní úložiště (localStorage) jsou malé soubory, které si stránka ukládá ve vašem prohlížeči. Bez některých z nich by aplikace nefungovala.',
        ],
      },
      {
        heading: 'Nezbytné cookies (vždy aktivní)',
        paragraphs: [
          'Přihlášení a udržení relace (Supabase Auth).',
          'Zabezpečení platby a ochrana proti podvodům (Stripe).',
          'Volba „Zůstat přihlášen“ a funkce aplikace na ploše (PWA).',
          'Právním základem je nezbytnost pro poskytnutí služby, kterou jste si vyžádali – souhlas se nevyžaduje.',
        ],
      },
      {
        heading: 'Funkční úložiště',
        paragraphs: [
          'Jazyk aplikace, barevné schéma, zvuky a rozpracovaný postup v procvičování. Ukládá se pouze ve vašem prohlížeči.',
        ],
      },
      {
        heading: 'Analytické cookies (volitelné)',
        paragraphs: [
          'Slouží k anonymnímu měření návštěvnosti. Načtou se pouze tehdy, pokud udělíte souhlas v cookie liště.',
        ],
      },
      {
        heading: 'Marketingové cookies',
        paragraphs: ['Aktuálně žádné nepoužíváme. Pokud to změníme, vyžádáme si nejprve váš souhlas.'],
      },
      {
        heading: 'Jak souhlas změnit',
        paragraphs: [
          'Souhlas můžete kdykoli změnit odkazem „Nastavení cookies“ v patičce stránky nebo smazáním dat webu v prohlížeči.',
        ],
      },
    ],
  },
  sk: {
    title: 'Zásady používania cookies',
    description: 'Aké cookies a lokálne úložisko ZGRP Academy používa a ako svoj súhlas kedykoľvek zmeníte.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Čo sú cookies',
        paragraphs: [
          'Cookies a lokálne úložisko (localStorage) sú malé súbory, ktoré si stránka ukladá vo vašom prehliadači. Bez niektorých z nich by aplikácia nefungovala.',
        ],
      },
      {
        heading: 'Nevyhnutné cookies (vždy aktívne)',
        paragraphs: [
          'Prihlásenie a udržanie relácie (Supabase Auth).',
          'Zabezpečenie platby a ochrana proti podvodom (Stripe).',
          'Voľba „Zostať prihlásený“ a funkcie aplikácie na ploche (PWA).',
          'Právnym základom je nevyhnutnosť na poskytnutie služby, ktorú ste si vyžiadali – súhlas sa nevyžaduje.',
        ],
      },
      {
        heading: 'Funkčné úložisko',
        paragraphs: [
          'Jazyk aplikácie, farebná schéma, zvuky a rozpracovaný postup v precvičovaní. Ukladá sa len vo vašom prehliadači.',
        ],
      },
      {
        heading: 'Analytické cookies (voliteľné)',
        paragraphs: [
          'Slúžia na anonymné meranie návštevnosti. Načítajú sa len vtedy, ak udelíte súhlas v cookie lište.',
        ],
      },
      {
        heading: 'Marketingové cookies',
        paragraphs: ['Aktuálne žiadne nepoužívame. Ak to zmeníme, vyžiadame si najprv váš súhlas.'],
      },
      {
        heading: 'Ako súhlas zmeniť',
        paragraphs: [
          'Súhlas môžete kedykoľvek zmeniť odkazom „Nastavenia cookies“ v pätičke stránky alebo zmazaním dát webu v prehliadači.',
        ],
      },
    ],
  },
  lt: cookiesLt,
};

export const termsDoc: Record<'cs' | 'sk' | 'lt', LegalDoc> = {
  cs: {
    title: 'Obchodní podmínky',
    description:
      'Obchodní podmínky vzdělávací platformy ZGRP Academy – registrace, jednorázový poplatek 150 Kč, reklamace a odstoupení od smlouvy.',
    updated: UPDATED,
    sections: [
      {
        heading: '1. Provozovatel',
        paragraphs: [`Provozovatelem platformy ZGRP Academy je ${OPERATOR_CS}`],
      },
      {
        heading: '2. Předmět služby',
        paragraphs: [
          'Platforma poskytuje online vzdělávací obsah pro partnery ZinzinoGroup – studijní materiály, procvičování, testy a certifikát o absolvování odborné zkoušky.',
          'Certifikát je dokladem o absolvování interního vzdělávání, nejde o veřejně uznávanou kvalifikaci.',
        ],
      },
      {
        heading: '3. Registrace a cena',
        paragraphs: [
          'Pro přístup k obsahu je nutná registrace a úhrada jednorázového registračního poplatku 150 Kč včetně DPH. Nejde o předplatné, žádné další ani opakované platby se neúčtují.',
          'Platba probíhá online přes zabezpečenou bránu Stripe. Doklad o platbě najdete v Nastavení účtu.',
        ],
      },
      {
        heading: '4. Přístup k obsahu',
        paragraphs: [
          'Přístup je osobní a nepřenosný. Obsah je chráněn autorským právem; jeho kopírování, sdílení nebo další šíření bez souhlasu provozovatele není dovoleno.',
          'Provozovatel může obsah průběžně doplňovat a upravovat.',
        ],
      },
      {
        heading: '5. Odstoupení od smlouvy',
        paragraphs: [
          'Jde o digitální obsah dodávaný okamžitě po zaplacení. Zaplacením a zpřístupněním obsahu spotřebitel výslovně souhlasí se zahájením plnění před uplynutím 14denní lhůty a bere na vědomí, že tím právo na odstoupení od smlouvy zaniká (§ 1837 občanského zákoníku).',
          'Pokud obsah nebyl zpřístupněn nebo služba nefunguje, napište na info@zinzinogroup.com – peníze vrátíme.',
        ],
      },
      {
        heading: '6. Reklamace a podpora',
        paragraphs: [
          'Reklamace a dotazy posílejte na info@zinzinogroup.com. Vyřídíme je nejpozději do 30 dnů.',
          'Spotřebitel má právo na mimosoudní řešení sporu u České obchodní inspekce (coi.cz), na Slovensku u Slovenskej obchodnej inšpekcie (soi.sk).',
        ],
      },
      {
        heading: '7. Zrušení účtu',
        paragraphs: [
          'Účet a svá data můžete kdykoli smazat v Nastavení účtu. Smazáním účtu zaniká přístup k zakoupenému obsahu bez nároku na vrácení poplatku.',
        ],
      },
    ],
  },
  sk: {
    title: 'Obchodné podmienky',
    description:
      'Obchodné podmienky vzdelávacej platformy ZGRP Academy – registrácia, jednorazový poplatok 150 Kč, reklamácie a odstúpenie od zmluvy.',
    updated: UPDATED,
    sections: [
      {
        heading: '1. Prevádzkovateľ',
        paragraphs: [`Prevádzkovateľom platformy ZGRP Academy je ${OPERATOR_SK}`],
      },
      {
        heading: '2. Predmet služby',
        paragraphs: [
          'Platforma poskytuje online vzdelávací obsah pre partnerov ZinzinoGroup – študijné materiály, precvičovanie, testy a certifikát o absolvovaní odbornej skúšky.',
          'Certifikát je dokladom o absolvovaní interného vzdelávania, nejde o verejne uznávanú kvalifikáciu.',
        ],
      },
      {
        heading: '3. Registrácia a cena',
        paragraphs: [
          'Na prístup k obsahu je potrebná registrácia a úhrada jednorazového registračného poplatku 150 Kč vrátane DPH. Nejde o predplatné, žiadne ďalšie ani opakované platby sa neúčtujú.',
          'Platba prebieha online cez zabezpečenú bránu Stripe. Doklad o platbe nájdete v Nastaveniach účtu.',
        ],
      },
      {
        heading: '4. Prístup k obsahu',
        paragraphs: [
          'Prístup je osobný a neprenosný. Obsah je chránený autorským právom; jeho kopírovanie, zdieľanie alebo ďalšie šírenie bez súhlasu prevádzkovateľa nie je dovolené.',
          'Prevádzkovateľ môže obsah priebežne dopĺňať a upravovať.',
        ],
      },
      {
        heading: '5. Odstúpenie od zmluvy',
        paragraphs: [
          'Ide o digitálny obsah dodávaný okamžite po zaplatení. Zaplatením a sprístupnením obsahu spotrebiteľ výslovne súhlasí so začatím plnenia pred uplynutím 14-dňovej lehoty a berie na vedomie, že tým právo na odstúpenie od zmluvy zaniká.',
          'Ak obsah nebol sprístupnený alebo služba nefunguje, napíšte na info@zinzinogroup.com – peniaze vrátime.',
        ],
      },
      {
        heading: '6. Reklamácie a podpora',
        paragraphs: [
          'Reklamácie a otázky posielajte na info@zinzinogroup.com. Vybavíme ich najneskôr do 30 dní.',
          'Spotrebiteľ má právo na mimosúdne riešenie sporu na Slovenskej obchodnej inšpekcii (soi.sk), prípadne na Českej obchodnej inšpekcii (coi.cz).',
        ],
      },
      {
        heading: '7. Zrušenie účtu',
        paragraphs: [
          'Účet a svoje dáta môžete kedykoľvek zmazať v Nastaveniach účtu. Zmazaním účtu zaniká prístup k zakúpenému obsahu bez nároku na vrátenie poplatku.',
        ],
      },
    ],
  },
  lt: termsLt,
};
