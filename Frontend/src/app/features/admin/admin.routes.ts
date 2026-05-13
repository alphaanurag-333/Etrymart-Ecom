import { Routes } from '@angular/router';

const loadPlaceholder = () =>
  import('./pages/admin-placeholder/admin-placeholder').then((m) => m.AdminPlaceholderPage);

export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardPage),
    title: 'Dashboard · Admin',
    data: { breadcrumb: 'Dashboard' },
  },
  {
    path: 'orders',
    loadComponent: () =>
      import('./pages/admin-ecom-orders/admin-ecom-orders').then((m) => m.AdminEcomOrdersPage),
    title: 'Orders · Admin',
    data: { breadcrumb: 'Orders' },
  },
  {
    path: 'transactions',
    loadComponent: loadPlaceholder,
    title: 'Transactions · Admin',
    data: { breadcrumb: 'Transactions' },
  },
  {
    path: 'wallet-transactions',
    loadComponent: loadPlaceholder,
    title: 'Wallet transactions · Admin',
    data: { breadcrumb: 'Wallet transactions' },
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./pages/product/category/category').then((m) => m.CategoryPage),
    title: 'Categories · Admin',
    data: { breadcrumb: 'Categories' },
  },
  {
    path: 'sub-categories',
    loadComponent: () =>
      import('./pages/product/subCategory/subcategory').then((m) => m.SubcategoryPage),
    title: 'Subcategories · Admin',
    data: { breadcrumb: 'Subcategories' },
  },
  {
    path: 'attributes',
    data: { breadcrumb: 'Attributes' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'titles' },
      {
        path: 'titles',
        loadComponent: () =>
          import('./pages/product/attribute-title/attribute-title').then((m) => m.AttributeTitlePage),
        title: 'Attribute titles · Admin',
        data: { breadcrumb: 'Attribute titles' },
      },
      {
        path: 'values',
        loadComponent: () =>
          import('./pages/product/attribute-value/attribute-value').then((m) => m.AttributeValuePage),
        title: 'Attribute values · Admin',
        data: { breadcrumb: 'Attribute values' },
      },
    ],
  },
  {
    path: 'products',
    data: { breadcrumb: 'Products' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'list' },
      {
        path: 'list',
        loadComponent: () =>
          import('./pages/product/product-list/product-list').then((m) => m.ProductListPage),
        title: 'Products · Admin',
        data: { breadcrumb: 'Products' },
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./pages/product/product-create/product-create').then((m) => m.ProductCreatePage),
        title: 'Add product · Admin',
        data: { breadcrumb: 'Add product' },
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./pages/product/product-edit/product-edit').then((m) => m.ProductEditPage),
        title: 'Edit product · Admin',
        data: { breadcrumb: 'Edit product' },
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./pages/product/product-view/product-view').then((m) => m.ProductViewPage),
        title: 'Product · Admin',
        data: { breadcrumb: 'Product' },
      },
    ],
  },
  {
    path: 'seller-products',
    loadComponent: loadPlaceholder,
    title: 'Seller products · Admin',
    data: { breadcrumb: 'Seller products' },
  },
  {
    path: 'banners',
    loadComponent: () =>
      import('./pages/admin-banner/admin-banner').then((m) => m.AdminBannerPage),
    title: 'Banners · Admin',
    data: { breadcrumb: 'Banners' },
  },
  {
    path: 'tryon-banner',
    loadComponent: () =>
      import('./pages/admin-tryonBanner/admin-tryonBanner').then((m) => m.AdminTryonBannerPage),
    title: 'Try-on banners · Admin',
    data: { breadcrumb: 'Try-on banners' },
  },
  {
    path: 'push-notifications',
    loadComponent: () =>
      import('./pages/admin-notification/admin-notification').then((m) => m.AdminNotificationPage),
    title: 'Push notifications · Admin',
    data: { breadcrumb: 'Push notifications' },
  },
  {
    path: 'coupons',
    loadComponent: () =>
      import('./pages/admin-coupons/admin-coupons').then((m) => m.AdminCouponsPage),
    title: 'Coupons · Admin',
    data: { breadcrumb: 'Coupons' },
  },
  {
    path: 'plans',
    loadComponent: loadPlaceholder,
    title: 'Subscription plans · Admin',
    data: { breadcrumb: 'Subscription plans' },
  },
  {
    path: 'subscription-transactions',
    loadComponent: loadPlaceholder,
    title: 'Subscription transactions · Admin',
    data: { breadcrumb: 'Subscription transactions' },
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/admin-users/admin-users').then((m) => m.AdminUsersPage),
    title: 'Users · Admin',
    data: { breadcrumb: 'Users' },
  },
  {
    path: 'history',
    loadComponent: loadPlaceholder,
    title: 'User history · Admin',
    data: { breadcrumb: 'User history' },
  },
  {
    path: 'return-requests',
    loadComponent: loadPlaceholder,
    title: 'Return requests · Admin',
    data: { breadcrumb: 'Return requests' },
  },
  {
    path: 'reviews',
    loadComponent: loadPlaceholder,
    title: 'Review · Admin',
    data: { breadcrumb: 'Review' },
  },
  {
    path: 'sellers',
    loadComponent: loadPlaceholder,
    title: 'Sellers · Admin',
    data: { breadcrumb: 'Sellers' },
  },
  {
    path: 'withdrawal-request',
    loadComponent: loadPlaceholder,
    title: 'Withdrawal requests · Admin',
    data: { breadcrumb: 'Withdrawal requests' },
  },
  {
    path: 'bussiness-categories',
    loadComponent: loadPlaceholder,
    title: 'Business categories · Admin',
    data: { breadcrumb: 'Business categories' },
  },
  {
    path: 'business-setup',
    loadComponent: loadPlaceholder,
    title: 'Business setup · Admin',
    data: { breadcrumb: 'Business setup' },
  },
  {
    path: 'static-pages',
    loadComponent: loadPlaceholder,
    title: 'Static pages · Admin',
    data: { breadcrumb: 'Static pages' },
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/admin-profile/admin-profile').then((m) => m.AdminProfilePage),
    title: 'Admin Profile · Admin',
    data: { breadcrumb: 'Admin Profile' },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/admin-settings/admin-settings').then((m) => m.AdminSettingsPage),
    title: 'Settings · Admin',
    data: { breadcrumb: 'Settings' },
  },
  {
    path: 'ecom',
    data: { breadcrumb: 'Ecom Management' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'vendors' },
      {
        path: 'vendors',
        loadComponent: () =>
          import('./pages/admin-ecom-vendors/admin-ecom-vendors').then((m) => m.AdminEcomVendorsPage),
        title: 'Ecom vendors · Admin',
        data: { breadcrumb: 'Vendors' },
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/admin-ecom-orders/admin-ecom-orders').then((m) => m.AdminEcomOrdersPage),
        title: 'Ecom orders · Admin',
        data: { breadcrumb: 'Orders' },
      },
    ],
  },
  {
    path: 'venue',
    data: { breadcrumb: 'Venue Management' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'vendors' },
      {
        path: 'vendors',
        loadComponent: () =>
          import('./pages/admin-venue-vendors/admin-venue-vendors').then(
            (m) => m.AdminVenueVendorsPage,
          ),
        title: 'Venue vendors · Admin',
        data: { breadcrumb: 'Venue vendors' },
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./pages/admin-venue-bookings/admin-venue-bookings').then(
            (m) => m.AdminVenueBookingsPage,
          ),
        title: 'Venue bookings · Admin',
        data: { breadcrumb: 'Bookings' },
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('../errors/not-found/not-found').then((m) => m.NotFoundPage),
    title: 'Page not found · Admin',
    data: { breadcrumb: 'Page not found' },
  },
];
