import { LetterState } from './models';

/**
 * Standard two-pass Wordle scoring: exact matches are claimed first so that
 * duplicate letters in the guess don't "steal" a present/yellow hint from a
 * letter the answer only contains once.
 */
export function evaluateGuess(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = new Array(guess.length).fill('absent');
  const answerLetters = answer.split('');
  const claimed: boolean[] = new Array(answerLetters.length).fill(false);

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answerLetters[i]) {
      result[i] = 'correct';
      claimed[i] = true;
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'correct') {
      continue;
    }
    const matchIndex = answerLetters.findIndex((letter, j) => letter === guess[i] && !claimed[j]);
    if (matchIndex !== -1) {
      result[i] = 'present';
      claimed[matchIndex] = true;
    }
  }

  return result;
}
