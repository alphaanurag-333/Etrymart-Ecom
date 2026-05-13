import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';

interface Crumb {
  label: string;
  url: string;
}

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  template: `
    @if (crumbs().length) {
      <nav class="breadcrumb" aria-label="Breadcrumb">
        @for (c of crumbs(); track $index; let last = $last) {
          @if (!last) {
            <a class="breadcrumb__link" [routerLink]="c.url">{{ c.label }}</a>
            <span class="breadcrumb__sep" aria-hidden="true">/</span>
          } @else {
            <span class="breadcrumb__current">{{ c.label }}</span>
          }
        }
      </nav>
    }
  `,
})
export class Breadcrumb {
  private readonly router = inject(Router);

  readonly crumbs = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.snapshotCrumbs()),
    ),
    { initialValue: [] as Crumb[] },
  );

  private snapshotCrumbs(): Crumb[] {
    const crumbs: Crumb[] = [];
    let route = this.router.routerState.snapshot.root;
    const segments: string[] = [];
    while (route.firstChild) {
      route = route.firstChild;
      const path = route.url.map((s) => s.path).filter(Boolean).join('/');
      if (path) segments.push(path);
      const label = route.data['breadcrumb'];
      if (typeof label === 'string') {
        const url = segments.length ? `/${segments.join('/')}` : '/';
        crumbs.push({ label, url });
      }
    }
    return crumbs;
  }
}
