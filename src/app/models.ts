/** Result of comparing one guessed letter against the answer. */
export type LetterState = 'correct' | 'present' | 'absent';

/** Lifecycle of the round currently on screen. */
export type GameStatus = 'loading' | 'playing' | 'won' | 'lost';

/** Persisted, ever-growing player stats. */
export interface Stats {
  solvedCount: number;
  streak: number;
}
