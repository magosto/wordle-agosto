import { Component, HostListener, OnInit } from '@angular/core';
import { LetterState } from '../models';
import { GameService } from '../services/game.service';

const KEYBOARD_ROWS: readonly string[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

type TileState = LetterState | 'filled' | 'empty';

interface Tile {
  letter: string;
  state: TileState;
}

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
})
export class GameComponent implements OnInit {
  readonly wordLength = 5;
  readonly maxGuesses = 6;
  readonly keyboardRows = KEYBOARD_ROWS;
  readonly rowIndexes = Array.from({ length: this.maxGuesses }, (_, i) => i);

  constructor(public game: GameService) {}

  ngOnInit(): void {
    this.game.init();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    const key = event.key;
    if (key === 'Enter') {
      this.game.handleKey('ENTER');
      event.preventDefault();
    } else if (key === 'Backspace') {
      this.game.handleKey('BACKSPACE');
      event.preventDefault();
    } else if (/^[a-zA-Z]$/.test(key)) {
      this.game.handleKey(key.toUpperCase());
    }
  }

  onKeyClick(key: string): void {
    this.game.handleKey(key);
  }

  rowTiles(rowIndex: number): Tile[] {
    const g = this.game;
    if (rowIndex < g.guesses.length) {
      const guess = g.guesses[rowIndex];
      const states = g.guessResults[rowIndex];
      return guess.split('').map((letter, i) => ({ letter, state: states[i] }));
    }
    if (rowIndex === g.guesses.length && g.status === 'playing') {
      const letters = g.currentGuess.split('');
      return Array.from({ length: this.wordLength }, (_, i) => {
        const letter = letters[i] ?? '';
        return { letter, state: letter ? 'filled' : 'empty' };
      });
    }
    return Array.from({ length: this.wordLength }, () => ({ letter: '', state: 'empty' as const }));
  }

  keyState(key: string): LetterState | '' {
    if (key === 'ENTER' || key === 'BACKSPACE') {
      return '';
    }
    return this.game.letterStates.get(key) ?? '';
  }
}
