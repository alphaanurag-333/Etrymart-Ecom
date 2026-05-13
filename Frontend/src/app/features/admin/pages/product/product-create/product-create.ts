import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductFormComponent } from '../product-form/product-form';

@Component({
  selector: 'app-product-create',
  imports: [CommonModule, RouterLink, ProductFormComponent],
  template: `
    <div class="page-header d-flex flex-wrap justify-content-between align-items-start gap-2">
      <div class="page-header__lead">
        <h1 class="heading-2">Add product</h1>
        <p class="text-muted text-sm page-header__sub">Create a new catalog product.</p>
      </div>
      <a routerLink="/admin/products/list" class="btn-admin-outline">Back to list</a>
    </div>
    <div class="card shadow-sm border-0">
      <div class="card-body p-3">
        <app-product-form />
      </div>
    </div>
  `,
  styleUrls: ['../../../admin.css'],
})
export class ProductCreatePage {}
