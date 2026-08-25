import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

/** Loads the five-letter answer/guess bank from assets/words.txt (one word per line). */
@Injectable({ providedIn: 'root' })
export class WordsService {
  private words$?: Observable<string[]>;

  constructor(private http: HttpClient) {}

  getWords(): Observable<string[]> {
    if (!this.words$) {
      this.words$ = this.http.get('assets/words.txt', { responseType: 'text' }).pipe(
        map((text) =>
          text
            .split(/\r?\n/)
            .map((word) => word.trim().toUpperCase())
            .filter((word) => word.length === 5)
        ),
        shareReplay(1)
      );
    }
    return this.words$;
  }
}
