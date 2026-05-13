import { Routes } from '@angular/router';

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
    path: 'users',
    loadComponent: () => import('./pages/admin-users/admin-users').then((m) => m.AdminUsersPage),
    title: 'Users · Admin',
    data: { breadcrumb: 'Users' },
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
];
