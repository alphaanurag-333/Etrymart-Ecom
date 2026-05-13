import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-users',
  template: `
    <div class="page-header">
      <h1 class="heading-2">Users</h1>
      <p class="text-muted text-sm">Hook this table to your admin user API.</p>
    </div>
    <div class="card p-4 table-placeholder">User management grid goes here.</div>
  `,
})
export class AdminUsersPage {}
