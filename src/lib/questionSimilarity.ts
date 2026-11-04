// Detects questions that ask the same thing in slightly different words.
// Used in the admin to warn before a duplicate lands in the same exercise or test.

export interface SimilarityCandidate {
  id?: string;
  type: string;
  question_text: string;
  in_practice?: boolean | null;
}

const WORD_MIN_LENGTH = 4;
export const SIMILARITY_THRESHOLD = 0.6;

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFC')
    .replace(/_+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ');

const words = (text: string) =>
  new Set(normalize(text).split(/\s+/).filter((w) => w.length >= WORD_MIN_LENGTH));

const compact = (text: string) => normalize(text).replace(/\s+/g, '');

/** Jaccard similarity of significant words (0–1). Identical texts return 1. */
export function questionSimilarity(a: string, b: string): number {
  if (!a.trim() || !b.trim()) return 0;
  if (compact(a) === compact(b)) return 1;
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  wa.forEach((w) => { if (wb.has(w)) inter++; });
  return inter / (wa.size + wb.size - inter);
}

/**
 * Two questions collide when a learner would see both in the same run:
 * - practice exercises are split by type (quiz vs fill-in), so only same-type practice questions collide;
 * - a level test contains every test-only question regardless of type;
 * - a group final test contains every question of the group (pass in_practice = null for both).
 */
export function inSamePool(a: SimilarityCandidate, b: SimilarityCandidate): boolean {
  const aTest = a.in_practice === false || a.in_practice == null;
  const bTest = b.in_practice === false || b.in_practice == null;
  if (aTest !== bTest) return false;
  if (aTest) return true;
  return a.type === b.type;
}

export function findSimilarQuestions<T extends SimilarityCandidate>(
  question: SimilarityCandidate,
  existing: T[],
  threshold = SIMILARITY_THRESHOLD,
): T[] {
  return existing.filter(
    (q) =>
      (!question.id || q.id !== question.id) &&
      inSamePool(question, q) &&
      questionSimilarity(question.question_text, q.question_text) >= threshold,
  );
}

/** For a batch of new questions, returns indexes that duplicate an existing question or an earlier item in the batch. */
export function flagBatchDuplicates(batch: SimilarityCandidate[], existing: SimilarityCandidate[]): Set<number> {
  const flagged = new Set<number>();
  const accepted: SimilarityCandidate[] = [...existing];
  batch.forEach((q, i) => {
    if (findSimilarQuestions(q, accepted).length > 0) flagged.add(i);
    else accepted.push(q);
  });
  return flagged;
}
