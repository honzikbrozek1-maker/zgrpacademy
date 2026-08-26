// Shared helpers for fill-in-the-blank questions.
// A blank is any run of 3+ underscores; canonically stored as BLANK_TOKEN.
export const BLANK_TOKEN = '______';
export const BLANK_RE = /_{3,}/;

export const hasBlank = (text?: string | null) => !!text && BLANK_RE.test(text);

/** Replace any underscore run with the canonical token. */
export const normalizeBlank = (text?: string | null) =>
  (text || '').replace(/_{3,}/g, BLANK_TOKEN);

/** Split a sentence at its first blank. Returns null when there is no blank. */
export const splitBlank = (text?: string | null): { before: string; after: string } | null => {
  if (!text) return null;
  const m = text.match(BLANK_RE);
  if (!m || m.index === undefined) return null;
  return {
    before: text.slice(0, m.index),
    after: text.slice(m.index + m[0].length),
  };
};

/**
 * Pick the sentence that actually contains the blank.
 * AI-generated questions keep the blank in question_text and the full sentence in back_text.
 */
export const blankSentence = (question_text?: string | null, back_text?: string | null) => {
  if (hasBlank(back_text)) return back_text as string;
  if (hasBlank(question_text)) return question_text as string;
  return null;
};
