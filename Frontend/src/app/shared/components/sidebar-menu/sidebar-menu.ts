import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NavItem } from '../../../core/models/nav-item';

function collectPaths(item: NavItem): string[] {
  const paths: string[] = [];
  if (item.path) paths.push(item.path);
  if (item.children) {
    for (const c of item.children) {
      paths.push(...collectPaths(c));
    }
  }
  return paths;
}

function currentPath(url: string): string {
  return url.split('?')[0] ?? url;
}

function urlMatchesPath(url: string, path: string): boolean {
  return url === path || url.startsWith(`${path}/`);
}

@Component({
  selector: 'app-sidebar-menu',
  imports: [RouterLink, RouterLinkActive, SidebarMenu],
  templateUrl: './sidebar-menu.html',
})
export class SidebarMenu {
  private readonly router = inject(Router);

  readonly items = input.required<NavItem[]>();
  /** When true, only icons show (reference: collapsed rail). */
  readonly collapsed = input(false);

  private readonly expandedIds = signal<ReadonlySet<string>>(new Set());

  protected toggle(id: string): void {
    this.expandedIds.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected isOpen(id: string): boolean {
    return this.expandedIds().has(id);
  }

  protected hasActiveDescendant(item: NavItem): boolean {
    const paths = collectPaths(item);
    const url = currentPath(this.router.url);
    return paths.some((p) => urlMatchesPath(url, p));
  }

  protected showsNest(item: NavItem): boolean {
    if (this.collapsed()) return false;
    return this.isOpen(item.id) || this.hasActiveDescendant(item);
  }

  protected isChevronOpen(item: NavItem): boolean {
    return this.isOpen(item.id) || this.hasActiveDescendant(item);
  }

  protected firstNavPath(item: NavItem): string | null {
    if (!item.children?.length) return null;
    for (const c of item.children) {
      if (c.path) return c.path;
      const nested = this.firstNavPath(c);
      if (nested) return nested;
    }
    return null;
  }
}
