import { ReviewQuality } from '@/types/database';

/**
 * SM-2 Spaced Repetition Algorithm
 * Based on SuperMemo 2 by Piotr Wozniak
 */

interface SM2Input {
  quality: ReviewQuality;
  repetitions: number;
  easeFactor: number;
  interval: number;
}

interface SM2Output {
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReview: Date;
}

export function calculateSM2(input: SM2Input): SM2Output {
  const { quality, repetitions, easeFactor, interval } = input;

  let newRepetitions: number;
  let newEaseFactor: number;
  let newInterval: number;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    // Incorrect response - reset
    newRepetitions = 0;
    newInterval = 1;
  }

  // Update ease factor
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Ease factor minimum is 1.3
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    repetitions: newRepetitions,
    easeFactor: Math.round(newEaseFactor * 100) / 100,
    interval: newInterval,
    nextReview,
  };
}

export function isDue(nextReview: string | Date): boolean {
  const reviewDate = new Date(nextReview);
  const now = new Date();
  return reviewDate <= now;
}

export function getDueCount(cards: { next_review: string }[]): number {
  return cards.filter(card => isDue(card.next_review)).length;
}
