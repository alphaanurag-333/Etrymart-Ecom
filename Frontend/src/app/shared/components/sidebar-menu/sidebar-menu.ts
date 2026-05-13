import { Component, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavItem } from '../../../core/models/nav-item';

@Component({
  selector: 'app-sidebar-menu',
  imports: [RouterLink, RouterLinkActive, SidebarMenu],
  templateUrl: './sidebar-menu.html',
})
export class SidebarMenu {
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
}
