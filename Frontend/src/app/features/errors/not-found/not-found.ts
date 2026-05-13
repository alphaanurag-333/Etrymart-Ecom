import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  styleUrls: ['./not-found.css'],
  template: `
    <div class="not-found" [class.not-found--embedded]="embedded()">
      <div class="not-found__inner">
        <p class="not-found__code">404</p>
        <h1 class="not-found__title">Page not found</h1>
        <p class="not-found__text">
          The page you are looking for does not exist or may have been moved.
        </p>
        <div class="not-found__actions">
          @if (embedded()) {
            @if (sellerShell()) {
              <a routerLink="/seller/dashboard" class="btn btn-dark">Seller dashboard</a>
            } @else {
              <a routerLink="/admin/dashboard" class="btn btn-dark">Admin dashboard</a>
            }
            <a routerLink="/" class="btn btn-outline-secondary">Storefront</a>
          } @else {
            <a routerLink="/" class="btn btn-dark">Go home</a>
            <a routerLink="/admin/login" class="btn btn-outline-secondary">Admin sign in</a>
          }
        </div>
      </div>
    </div>
  `,
})
export class NotFoundPage {
  private readonly router = inject(Router);

  /** True when shown inside admin (or seller) shell via child `**` route. */
  protected readonly embedded = () =>
    this.router.url.startsWith('/admin') || this.router.url.startsWith('/seller');

  protected readonly sellerShell = () => this.router.url.startsWith('/seller');
}
