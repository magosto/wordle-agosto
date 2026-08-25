import { Injectable } from '@angular/core';
import { GameStatus, LetterState, Stats } from '../models';
import { evaluateGuess } from '../word-utils';
import { WordsService } from './words.service';

const STATS_KEY = 'wordle-agosto:stats';
const DAILY_KEY = 'wordle-agosto:daily';
const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

/** Anchor date for picking the daily word; arbitrary, just needs to stay fixed. */
const EPOCH = new Date(2024, 0, 1);

interface DailySave {
  date: string;
  answer: string;
  guesses: string[];
  status: GameStatus;
  revealed: boolean;
}

const LETTER_PRIORITY: Record<LetterState, number> = { correct: 3, present: 2, absent: 1 };

/**
 * Owns the whole game: loading the word bank, picking the word of the day,
 * scoring guesses, persisting today's board + lifetime stats to
 * localStorage, and the bonus "Play Again" replay loop once the daily word
 * is solved.
 */
@Injectable({ providedIn: 'root' })
export class GameService {
  words: string[] = [];
  answer = '';
  guesses: string[] = [];
  guessResults: LetterState[][] = [];
  currentGuess = '';
  status: GameStatus = 'loading';
  isBonusRound = false;
  revealed = false;
  message = '';
  stats: Stats = { solvedCount: 0, streak: 0 };
  letterStates = new Map<string, LetterState>();

  private messageTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private wordsService: WordsService) {}

  init(): void {
    this.loadStats();
    this.wordsService.getWords().subscribe((words) => {
      this.words = words;
      this.loadDailyRound();
    });
  }

  handleKey(key: string): void {
    if (this.status !== 'playing') {
      return;
    }
    if (key === 'ENTER') {
      this.submitGuess();
    } else if (key === 'BACKSPACE') {
      this.currentGuess = this.currentGuess.slice(0, -1);
    } else if (/^[A-Z]$/.test(key) && this.currentGuess.length < WORD_LENGTH) {
      this.currentGuess += key;
    }
  }

  submitGuess(): void {
    if (this.currentGuess.length < WORD_LENGTH) {
      this.showMessage('Not enough letters');
      return;
    }

    // Any five letters submits and locks in the row as a used turn, whether
    // or not it's a real word — we don't gate on dictionary membership.
    const guess = this.currentGuess;
    this.guesses.push(guess);
    this.applyGuess(guess);
    this.currentGuess = '';

    const won = guess === this.answer;
    const outOfGuesses = this.guesses.length >= MAX_GUESSES;

    if (won) {
      this.status = 'won';
      this.stats.solvedCount += 1;
      this.stats.streak += 1;
      this.saveStats();
    } else if (outOfGuesses) {
      this.status = 'lost';
    }
    this.saveDailyRound();
  }

  /**
   * Starts a bonus round with a new random word. Available after either a
   * win or a loss — this is a local practice copy, so nothing should force
   * the player to stop for the day; only the persisted stats (solved count,
   * streak) carry the "daily" game's sense of progress forward.
   */
  playAgain(): void {
    if (this.status !== 'won' && this.status !== 'lost') {
      return;
    }
    this.answer = this.pickRandomWord(this.answer);
    this.guesses = [];
    this.guessResults = [];
    this.currentGuess = '';
    this.letterStates.clear();
    this.status = 'playing';
    this.revealed = false;
    this.isBonusRound = true;
  }

  /** Reveals the answer after a loss and resets the win streak. */
  showWord(): void {
    if (this.status !== 'lost') {
      return;
    }
    this.revealed = true;
    this.stats.streak = 0;
    this.saveStats();
    this.saveDailyRound();
  }

  private pickRandomWord(exclude: string): string {
    if (this.words.length <= 1) {
      return this.words[0] ?? exclude;
    }
    let next = exclude;
    while (next === exclude) {
      next = this.words[Math.floor(Math.random() * this.words.length)];
    }
    return next;
  }

  private applyGuess(guess: string): void {
    const evaluation = evaluateGuess(guess, this.answer);
    this.guessResults.push(evaluation);
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const state = evaluation[i];
      const existing = this.letterStates.get(letter);
      if (!existing || LETTER_PRIORITY[state] > LETTER_PRIORITY[existing]) {
        this.letterStates.set(letter, state);
      }
    }
  }

  private showMessage(text: string): void {
    this.message = text;
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
    }
    this.messageTimer = setTimeout(() => {
      this.message = '';
    }, 1800);
  }

  private loadStats(): void {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<Stats>;
      this.stats = {
        solvedCount: parsed.solvedCount ?? 0,
        streak: parsed.streak ?? 0,
      };
    } catch {
      // Corrupt/foreign data in localStorage: fall back to the defaults already set.
    }
  }

  private saveStats(): void {
    localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));
  }

  private todayStr(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private dailyWordIndex(dateStr: string): number {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const daysSinceEpoch = Math.floor((date.getTime() - EPOCH.getTime()) / 86400000);
    return ((daysSinceEpoch % this.words.length) + this.words.length) % this.words.length;
  }

  private loadDailyRound(): void {
    const today = this.todayStr();
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as DailySave;
        if (saved.date === today && this.words.includes(saved.answer)) {
          this.answer = saved.answer;
          this.guesses = saved.guesses;
          this.status = saved.status;
          this.revealed = saved.revealed;
          this.isBonusRound = false;
          this.rebuildDerivedState();
          return;
        }
      } catch {
        // Corrupt/foreign data: fall through and start a fresh daily round.
      }
    }

    this.answer = this.words[this.dailyWordIndex(today)];
    this.guesses = [];
    this.guessResults = [];
    this.status = 'playing';
    this.revealed = false;
    this.isBonusRound = false;
    this.letterStates.clear();
    this.saveDailyRound();
  }

  private saveDailyRound(): void {
    if (this.isBonusRound) {
      return;
    }
    const save: DailySave = {
      date: this.todayStr(),
      answer: this.answer,
      guesses: this.guesses,
      status: this.status,
      revealed: this.revealed,
    };
    localStorage.setItem(DAILY_KEY, JSON.stringify(save));
  }

  private rebuildDerivedState(): void {
    this.guessResults = [];
    this.letterStates.clear();
    for (const guess of this.guesses) {
      this.applyGuess(guess);
    }
  }
}
