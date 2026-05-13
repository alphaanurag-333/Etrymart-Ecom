import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-admin-placeholder',
  imports: [RouterLink],
  template: `
    <div class="page-header">
      <div class="page-header__lead">
        <h1 class="heading-2">{{ heading() }}</h1>
        <p class="text-muted text-sm page-header__sub">This page is not wired yet.</p>
      </div>
      <a routerLink="/admin/dashboard" class="breadcrumb__link">Back to dashboard</a>
    </div>
  `,
})
export class AdminPlaceholderPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly heading = toSignal(
    this.route.data.pipe(map((d) => (d['breadcrumb'] as string) ?? 'Admin')),
    { initialValue: 'Admin' },
  );
}
