import { Routes } from '@angular/router';
import { adminAuthGuard } from '../core/guards/admin-auth.guard';
import { adminLoginGuard } from '../core/guards/admin-login.guard';
import { sellerAuthGuard } from '../core/guards/seller-auth.guard';
import { sellerLoginGuard } from '../core/guards/seller-login.guard';

export const routes: Routes = [
  {
    path: 'not-found',
    loadComponent: () =>
      import('../features/errors/not-found/not-found').then((m) => m.NotFoundPage),
    title: 'Page not found · EtryMart',
  },
  {
    path: '',
    loadComponent: () =>
      import('../layouts/website-layout/website-layout').then((m) => m.WebsiteLayout),
    loadChildren: () => import('../features/website/website.routes').then((m) => m.WEBSITE_ROUTES),
  },
  {
    path: 'admin',
    children: [
      {
        path: 'login',
        canActivate: [adminLoginGuard],
        loadComponent: () =>
          import('../features/admin/pages/auth/admin-login/admin-login').then(
            (m) => m.AdminLoginPage,
          ),
        title: 'Admin sign in',
      },
      {
        path: '',
        loadComponent: () =>
          import('../layouts/admin-layout/admin-layout').then((m) => m.AdminLayout),
        canActivate: [adminAuthGuard],
        loadChildren: () => import('../features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
    ],
  },
  {
    path: 'seller',
    children: [
      {
        path: 'login',
        canActivate: [sellerLoginGuard],
        loadComponent: () =>
          import('../features/seller/pages/seller-login/seller-login').then((m) => m.SellerLoginPage),
        title: 'Seller sign in',
      },
      {
        path: '',
        loadComponent: () =>
          import('../layouts/seller-layout/seller-layout').then((m) => m.SellerLayout),
        canActivate: [sellerAuthGuard],
        loadChildren: () => import('../features/seller/seller.routes').then((m) => m.SELLER_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '/not-found' },
];
