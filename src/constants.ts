import type { DeckKey, TaskTypeKey } from './types';

/** Every deck is an array of strings. Numbers are stored as their string representation. */
export const DECKS: Record<DeckKey, string[]> = {
  DAYS:   ['0.5', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '21', '?'],
  HOURS:  ['0.5', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '?'],
  TSHIRT: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '?'],
  STORY:  ['½', '1', '2', '3', '5', '8', '13', '21', '?'],
  POWERS: ['1', '2', '4', '8', '16', '32', '64', '?'],
};

export const DECK_LABELS: Record<DeckKey, string> = {
  DAYS:   'Days',
  HOURS:  'Hours',
  TSHIRT: 'T-Shirt Sizes',
  STORY:  'Story Points',
  POWERS: 'Powers of 2',
};

/** Decks that don't support numeric mean / std-dev calculation */
export const NON_NUMERIC_DECKS: DeckKey[] = ['TSHIRT'];

export const TASK_TYPES: Record<TaskTypeKey, string> = {
  DEV:  'Dev Only',
  QA:   'QA Only',
  BOTH: 'Dev + QA',
};

/**
 * Convert a vote string to a number for math operations.
 * Returns null for '?' (abstention) or unknown values.
 */
export function voteToNumber(vote: string | null): number | null {
  if (vote === null || vote === '?') return null;
  if (vote === '½') return 0.5;
  const n = parseFloat(vote);
  return isNaN(n) ? null : n;
}
