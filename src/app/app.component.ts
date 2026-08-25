import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { Theme, ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'Wordle Agosto';
  settingsOpen = false;

  constructor(public theme: ThemeService, private elementRef: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.theme.init();
  }

  toggleSettings(): void {
    this.settingsOpen = !this.settingsOpen;
  }

  selectTheme(value: Theme): void {
    this.theme.setTheme(value);
    this.settingsOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.settingsOpen && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.settingsOpen = false;
    }
  }
}
