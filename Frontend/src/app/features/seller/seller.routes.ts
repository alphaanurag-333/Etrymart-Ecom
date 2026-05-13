import { Routes } from '@angular/router';

export const SELLER_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/seller-dashboard/seller-dashboard').then((m) => m.SellerDashboardPage),
    title: 'Dashboard · Seller',
    data: { breadcrumb: 'Dashboard' },
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./pages/seller-products/seller-products').then((m) => m.SellerProductsPage),
    title: 'Products · Seller',
    data: { breadcrumb: 'Products' },
  },
  {
    path: 'orders',
    loadComponent: () => import('./pages/seller-orders/seller-orders').then((m) => m.SellerOrdersPage),
    title: 'Orders · Seller',
    data: { breadcrumb: 'Orders' },
  },
  {
    path: 'payouts',
    loadComponent: () =>
      import('./pages/seller-payouts/seller-payouts').then((m) => m.SellerPayoutsPage),
    title: 'Payouts · Seller',
    data: { breadcrumb: 'Payouts' },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/seller-settings/seller-settings').then((m) => m.SellerSettingsPage),
    title: 'Settings · Seller',
    data: { breadcrumb: 'Settings' },
  },
];
