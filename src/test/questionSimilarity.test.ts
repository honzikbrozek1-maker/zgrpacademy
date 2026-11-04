import { describe, it, expect } from 'vitest';
import { findSimilarQuestions, flagBatchDuplicates } from '@/lib/questionSimilarity';

const practiceFill = (question_text: string, id?: string) => ({ id, type: 'fill_blank', question_text, in_practice: true });

describe('duplicate question detection', () => {
  it('flags an identical fill-in question in the same exercise', () => {
    const existing = [practiceFill('Mastná kyselina DHA je klíčovým stavebním prvkem, který převažuje v mozku, spermatu a _______.', 'a')];
    const hits = findSimilarQuestions(practiceFill('Mastná kyselina DHA je klíčovým stavebním prvkem, který převažuje v mozku, spermatu a _______.'), existing);
    expect(hits).toHaveLength(1);
  });

  it('flags a reworded copy of the same fill-in question', () => {
    const existing = [practiceFill('Dospívající mládež ve věku 12–18 let by měla podle návodu denně užívat _______ tablety.', 'a')];
    expect(findSimilarQuestions(practiceFill('Dospívající mládež ve věku 12–18 let by měla denně užívat _______ tablety.'), existing)).toHaveLength(1);
  });

  it('does not flag a different question in the same level', () => {
    const existing = [practiceFill('Pro normální růst a vývoj kostí u dětí obsahuje Multify nezbytný vitamín _______.', 'a')];
    expect(findSimilarQuestions(practiceFill('Jód obsažený v tomto dětském multivitamínu přispívá k podpoře normálního _______ dětí.'), existing)).toHaveLength(0);
  });

  it('allows the same topic in a practice quiz and a practice fill-in', () => {
    const existing = [{ id: 'a', type: 'quiz', question_text: 'Jaká je doporučená denní dávka ZinoShine+ pro dospělé starší 18 let?', in_practice: true }];
    expect(findSimilarQuestions({ type: 'fill_blank', question_text: 'Jaká je doporučená denní dávka ZinoShine+ pro dospělé starší 18 let _______?', in_practice: true }, existing)).toHaveLength(0);
  });

  it('allows a test question that rephrases a practice question', () => {
    const existing = [practiceFill('Dospívající mládež ve věku 12–18 let by měla denně užívat _______ tablety.', 'a')];
    expect(findSimilarQuestions({ type: 'fill_blank', question_text: 'Dospívající mládež ve věku 12–18 let by měla podle návodu denně užívat _______ tablety.', in_practice: false }, existing)).toHaveLength(0);
  });

  it('flags a quiz and a fill-in that repeat each other inside the same test', () => {
    const existing = [{ id: 'a', type: 'quiz', question_text: 'Jaká je doporučená denní dávka ZinoShine+ pro dospělé starší 18 let?', in_practice: false }];
    expect(findSimilarQuestions({ type: 'fill_blank', question_text: 'Doporučená denní dávka ZinoShine+ pro dospělé starší 18 let je _______ tablety.', in_practice: false }, existing)).toHaveLength(1);
  });

  it('ignores the question being edited', () => {
    const existing = [practiceFill('Šafrán je nejdražší koření na světě, jeho tržní cena je vyšší než cena _______.', 'a')];
    expect(findSimilarQuestions(practiceFill('Šafrán je nejdražší koření na světě, jeho tržní cena je vyšší než cena _______.', 'a'), existing)).toHaveLength(0);
  });

  it('flags duplicates inside a newly generated batch', () => {
    const batch = [
      practiceFill('Šafrán je nejdražší koření na světě a jeho tržní cena je vyšší než cena _______.'),
      practiceFill('Šafrán je nejdražší koření na světě, jehož tržní cena je vyšší než cena _______.'),
      practiceFill('Náš nervový systém se skládá z centrálního a _______ nervového systému.'),
    ];
    expect([...flagBatchDuplicates(batch, [])]).toEqual([1]);
  });
});
