import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  template: `
    <section class="container py-5">
      <div class="card shadow-sm border-0 rounded-4 p-4 p-lg-5 hero">
        <p class="text-sm text-muted text-uppercase tracking-wide mb-2">Public storefront</p>
        <h1 class="heading-1">Shop smarter with EtryMart</h1>
        <p class="text-muted mt-3 max-w-prose mb-0">
          Fast checkout, curated catalogs, and a unified experience across web, admin, and seller
          tools — all powered by this Angular 21 shell.
        </p>
        <div class="d-flex flex-wrap gap-3 mt-4">
          <a class="btn btn-primary fw-semibold px-4" routerLink="/auth/login">Sign in</a>
          <a class="btn btn-warning fw-semibold px-4" routerLink="/contact">Talk to us</a>
          <a class="btn btn-outline-secondary px-4" routerLink="/about">Learn more</a>
        </div>
      </div>

      <div class="row g-4 mt-2">
        <div class="col-12 col-md-6 col-lg-4">
          <article class="card shadow-sm border-0 h-100 p-4 rounded-4">
            <h2 class="heading-3">For shoppers</h2>
            <p class="text-muted text-sm mt-2 mb-0">Browse categories, track orders, and checkout securely.</p>
          </article>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <article class="card shadow-sm border-0 h-100 p-4 rounded-4">
            <h2 class="heading-3">For admins</h2>
            <p class="text-muted text-sm mt-2 mb-0">
              Operations, approvals, and analytics live under
              <a class="link" routerLink="/admin">/admin</a>.
            </p>
          </article>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <article class="card shadow-sm border-0 h-100 p-4 rounded-4">
            <h2 class="heading-3">For sellers</h2>
            <p class="text-muted text-sm mt-2 mb-0">
              Manage inventory and payouts via
              <a class="link" routerLink="/seller">/seller</a>.
            </p>
          </article>
        </div>
      </div>
    </section>
  `,
  imports: [RouterLink],
})
export class HomePage {}
