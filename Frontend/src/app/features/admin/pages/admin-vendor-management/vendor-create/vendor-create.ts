import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminVendorFormComponent } from '../vendor-form/vendor-form';

@Component({
  selector: 'app-admin-vendor-create',
  imports: [CommonModule, RouterLink, AdminVendorFormComponent],
  template: `
    <div class="page-header d-flex flex-wrap justify-content-between align-items-start gap-2">
      <div class="page-header__lead">
        <h1 class="heading-2">Add vendor</h1>
        <p class="text-muted text-sm page-header__sub">Create a seller account for the marketplace.</p>
      </div>
      <a routerLink="/admin/vendors/list" class="btn-admin-outline">Back to list</a>
    </div>
    <div class="card shadow-sm border-0">
      <div class="card-body p-3">
        <app-admin-vendor-form />
      </div>
    </div>
  `,
  styleUrls: ['../../../admin.css'],
})
export class AdminVendorCreatePage {}
