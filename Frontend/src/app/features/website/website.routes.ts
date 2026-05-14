import { Routes } from '@angular/router';
import { userSessionGuard } from '../../core/guards/user-session.guard';

export const WEBSITE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
    title: 'Home · EtryMart',
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about').then((m) => m.AboutPage),
    title: 'About · EtryMart',
    data: { breadcrumb: 'About' },
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact').then((m) => m.ContactPage),
    title: 'Contact · EtryMart',
    data: { breadcrumb: 'Contact' },
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./pages/auth/login/login').then((m) => m.WebsiteLoginPage),
    title: 'Sign in · EtryMart',
    data: { breadcrumb: 'Sign in' },
  },
  {
    path: 'auth/account',
    pathMatch: 'full',
    redirectTo: 'auth/profile',
  },
  {
    path: 'auth/profile',
    canActivate: [userSessionGuard],
    loadComponent: () => import('./pages/auth/profile/profile').then((m) => m.WebsiteProfilePage),
    title: 'Profile · EtryMart',
    data: { breadcrumb: 'Profile' },
  },
];
