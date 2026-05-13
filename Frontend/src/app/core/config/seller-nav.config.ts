import { NavItem } from '../models/nav-item';

export const SELLER_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/seller/dashboard', icon: 'layout-dashboard' },
  { id: 'products', label: 'Products', path: '/seller/products', icon: 'package' },
  { id: 'orders', label: 'Orders', path: '/seller/orders', icon: 'shopping-cart' },
  { id: 'payouts', label: 'Payouts', path: '/seller/payouts', icon: 'wallet' },
  { id: 'settings', label: 'Settings', path: '/seller/settings', icon: 'settings' },
];
