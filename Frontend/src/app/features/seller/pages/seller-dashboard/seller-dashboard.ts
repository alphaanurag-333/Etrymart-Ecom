import { Component } from '@angular/core';

@Component({
  selector: 'app-seller-dashboard',
  template: `
    <div class="page-header">
      <div class="page-header__lead">
        <h1 class="heading-2">Seller overview</h1>
        <p class="text-muted text-sm page-header__sub">Tune these KPIs against your fulfillment data.</p>
      </div>
    </div>

    <div class="container-fluid px-0">
      <div class="row g-3">
        @for (card of cards; track card.title) {
          <div class="col-12 col-sm-6 col-xl-3">
            <article class="card stat-card h-100 shadow-sm border-0 p-3">
              <div class="stat-card__title">{{ card.title }}</div>
              <div class="stat-card__value">{{ card.value }}</div>
              <span class="stat-card__accent" [class]="card.tone"></span>
            </article>
          </div>
        }
      </div>
    </div>
  `,
})
export class SellerDashboardPage {
  protected readonly cards = [
    { title: 'Open orders', value: '128', tone: 'tone-yellow' },
    { title: 'GMV (30d)', value: '₹12.4L', tone: 'tone-orange' },
    { title: 'Fulfillment SLA', value: '98%', tone: 'tone-green' },
    { title: 'Active SKUs', value: '364', tone: 'tone-yellow' },
  ];
}
