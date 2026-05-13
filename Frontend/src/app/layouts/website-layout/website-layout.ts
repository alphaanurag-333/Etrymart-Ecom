import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { WEBSITE_NAV } from '../../core/config/website-nav.config';
import { Breadcrumb } from '../../shared/components/breadcrumb/breadcrumb';

@Component({
  selector: 'app-website-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Breadcrumb],
  templateUrl: './website-layout.html',
  styleUrls: ['../../../styles-website.css'],
})
export class WebsiteLayout {
  protected readonly nav = WEBSITE_NAV;
  protected readonly year = new Date().getFullYear();
  protected readonly mobileOpen = signal(false);

  protected toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  protected closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
