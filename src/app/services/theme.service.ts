import { Injectable } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'wordle-agosto:theme';

/**
 * Tracks light/dark preference and stamps it onto <html data-theme="...">.
 * index.html runs a tiny inline copy of this same lookup before Angular
 * boots so the correct theme paints immediately, without a flash.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme: Theme = 'light';

  init(): void {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'light' || current === 'dark') {
      this.theme = current;
      return;
    }
    this.theme = this.prefersDark() ? 'dark' : 'light';
    this.apply();
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    this.apply();
  }

  toggle(): void {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  private prefersDark(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private apply(): void {
    document.documentElement.setAttribute('data-theme', this.theme);
  }
}
