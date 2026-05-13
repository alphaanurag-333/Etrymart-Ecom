import { NavItem } from '../models/nav-item';

export const ADMIN_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: 'layout-dashboard' },
  {
    id: 'ecom',
    label: 'Ecom Management',
    icon: 'shopping-bag',
    children: [
      { id: 'ecom-vendors', label: 'Vendors', path: '/admin/ecom/vendors', icon: 'store' },
      { id: 'ecom-orders', label: 'Orders', path: '/admin/ecom/orders', icon: 'shopping-cart' },
    ],
  },
  {
    id: 'venue',
    label: 'Venue Management',
    icon: 'map-pin',
    children: [
      { id: 'venue-vendors', label: 'Venue vendors', path: '/admin/venue/vendors', icon: 'building' },
      { id: 'venue-bookings', label: 'Bookings', path: '/admin/venue/bookings', icon: 'calendar' },
    ],
  },
  { id: 'users', label: 'Users', path: '/admin/users', icon: 'users' },
  { id: 'settings', label: 'Settings', path: '/admin/settings', icon: 'settings' },
];
