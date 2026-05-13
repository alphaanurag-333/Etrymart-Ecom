import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  template: `
    <div class="page-header">
      <div class="page-header__lead">
        <h1 class="heading-2">Dashboard</h1>
        <p class="text-muted text-sm page-header__sub">Snapshot metrics mirror the reference admin experience.</p>
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

    <div class="container-fluid px-0 mt-4">
      <div class="row g-3">
        <div class="col-12 col-lg-7">
          <article class="card shadow-sm border-0 p-4 h-100">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <h2 class="heading-3">Monthly orders</h2>
                <p class="text-muted text-sm mb-0">Jan – Jun</p>
              </div>
              <span class="pill pill--warn">Live</span>
            </div>
            <div class="sparkline mt-4" aria-hidden="true"></div>
          </article>
        </div>
        <div class="col-12 col-lg-5">
          <article class="card shadow-sm border-0 p-4 h-100">
            <h2 class="heading-3">Category performance</h2>
            <div class="bars mt-4">
              @for (bar of bars; track bar.label) {
                <div>
                  <div class="bars__label">{{ bar.label }}</div>
                  <div class="bars__track">
                    <div class="bars__fill" [style.width.%]="bar.pct"></div>
                  </div>
                </div>
              }
            </div>
          </article>
        </div>
      </div>
    </div>
  `,
})
export class AdminDashboardPage {
  protected readonly cards = [
    { title: 'Total users', value: '12,543', tone: 'tone-yellow' },
    { title: 'Ecom vendors', value: '842', tone: 'tone-orange' },
    { title: 'Venue vendors', value: '326', tone: 'tone-green' },
    { title: 'Total orders', value: '48,921', tone: 'tone-yellow' },
    { title: 'Revenue', value: '₹2.4Cr', tone: 'tone-orange' },
    { title: 'Pending approvals', value: '37', tone: 'tone-green' },
    { title: 'Active vendors', value: '612', tone: 'tone-yellow' },
    { title: 'Venue bookings', value: '1,204', tone: 'tone-orange' },
  ];

  protected readonly bars = [
    { label: 'Electronics', pct: 86 },
    { label: 'Fashion', pct: 72 },
    { label: 'Food', pct: 64 },
    { label: 'Books', pct: 48 },
    { label: 'Home', pct: 58 },
  ];
}
