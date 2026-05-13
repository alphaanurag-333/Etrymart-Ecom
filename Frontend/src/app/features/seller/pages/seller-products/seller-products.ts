import { Component } from '@angular/core';

@Component({
  selector: 'app-seller-products',
  template: `
    <div class="page-header">
      <h1 class="heading-2">Products</h1>
      <p class="text-muted text-sm">Wire this view to your catalog service.</p>
    </div>
    <div class="card p-4 table-placeholder">Product grid placeholder</div>
  `,
})
export class SellerProductsPage {}
