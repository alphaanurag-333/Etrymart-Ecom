import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-settings',
  template: `
    <div class="page-header">
      <h1 class="heading-2">Settings</h1>
      <p class="text-muted text-sm">Central place for platform configuration.</p>
    </div>
    <div class="card p-4">Feature flags, integrations, and billing settings.</div>
  `,
})
export class AdminSettingsPage {}
