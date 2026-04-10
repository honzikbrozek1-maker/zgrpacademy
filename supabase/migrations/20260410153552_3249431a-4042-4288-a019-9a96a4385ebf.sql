
-- Add category column to levels
ALTER TABLE public.levels ADD COLUMN category text NOT NULL DEFAULT 'products';

-- Move existing levels to backoffice
UPDATE public.levels SET category = 'backoffice';

-- Insert BalanceOil level for products
INSERT INTO public.levels (id, title, description, order_index, passing_score, category)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'BalanceOil',
  'Naučte se vše o produktu BalanceOil – omega-3 doplněk stravy od Zinzino.',
  1,
  70,
  'products'
);

-- Quiz questions about BalanceOil
INSERT INTO public.questions (level_id, type, question_text, option_1, option_2, option_3, option_4, correct_answer, order_index) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'quiz', 'Co je hlavní složkou BalanceOil?', 'Omega-3 mastné kyseliny z rybího oleje', 'Vitamín C', 'Železo', 'Vápník', 1, 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'quiz', 'Jaký typ olivového oleje se používá v BalanceOil?', 'Extra panenský olivový olej', 'Rafinovaný olivový olej', 'Kokosový olej', 'Slunečnicový olej', 1, 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'quiz', 'Jaký test Zinzino nabízí pro měření poměru omega-6/omega-3?', 'BalanceTest', 'OmegaCheck', 'BloodScan', 'FattyAcid Test', 1, 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'quiz', 'Kolik měsíců se doporučuje užívat BalanceOil pro dosažení optimálního poměru?', '4 měsíce (120 dní)', '1 měsíc', '2 týdny', '12 měsíců', 1, 4);

-- Flashcard questions
INSERT INTO public.questions (level_id, type, question_text, back_text, order_index) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'flashcard', 'Co je BalanceOil?', 'BalanceOil je prémiový doplněk stravy na bázi rybího oleje a extra panenského olivového oleje, obohacený o vitamín D3. Pomáhá optimalizovat poměr omega-6/omega-3 mastných kyselin v těle.', 5),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'flashcard', 'Jaký je ideální poměr omega-6/omega-3?', 'Ideální poměr je 3:1 nebo nižší. Většina lidí má poměr 12:1 až 25:1, což vede k chronickým zánětem. BalanceOil pomáhá dosáhnout optimálního poměru během 120 dní.', 6),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'flashcard', 'Co je BalanceTest?', 'BalanceTest je suchý krevní test, který měří 11 mastných kyselin v krvi a ukazuje poměr omega-6/omega-3. Výsledky jsou k dispozici do 10-20 dní.', 7);

-- Fill-in-the-blank questions
INSERT INTO public.questions (level_id, type, question_text, option_1, option_2, option_3, option_4, correct_answer, order_index) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'fill_blank', 'BalanceOil obsahuje omega-3 z ___ oleje a polyfenolyze z olivového oleje.', 'rybího', 'kokosového', 'palmového', 'slunečnicového', 1, 8),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'fill_blank', 'Pro dosažení optimálního poměru omega kyselin se doporučuje užívat BalanceOil minimálně ___ dní.', '120', '30', '60', '365', 1, 9),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'fill_blank', 'BalanceOil je obohacen o vitamín ___, který podporuje imunitní systém.', 'D3', 'C', 'B12', 'A', 1, 10);
