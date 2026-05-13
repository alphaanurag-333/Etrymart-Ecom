import { NavItem } from '../models/nav-item';

export interface AdminNavGroup {
  title: string;
  items: NavItem[];
}

/**
 * E-commerce admin sidebar (structure aligned with legacy CoreUI `navItems`).
 * Icons use internal `data-icon` keys; see `styles.css` (`.side-nav__icon[...]`).
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: 'layout-dashboard' }],
  },
  {
    title: 'Order management',
    items: [{ id: 'orders', label: 'Orders', path: '/admin/orders', icon: 'shopping-cart' }],
  },
  {
    title: 'Transaction management',
    items: [
      { id: 'transactions', label: 'Transactions', path: '/admin/transactions', icon: 'credit-card' },
      {
        id: 'wallet-transactions',
        label: 'Wallet transactions',
        path: '/admin/wallet-transactions',
        icon: 'wallet',
      },
    ],
  },
  {
    title: 'Product management',
    items: [
      { id: 'categories', label: 'Categories', path: '/admin/categories', icon: 'folder' },
      { id: 'sub-categories', label: 'Subcategories', path: '/admin/sub-categories', icon: 'folder-tree' },
      { id: 'attribute-titles', label: 'Attribute titles', path: '/admin/attributes/titles', icon: 'sliders' },
      { id: 'attribute-values', label: 'Attribute values', path: '/admin/attributes/values', icon: 'list' },
      { id: 'products', label: 'Products', path: '/admin/products/list', icon: 'package' },
      { id: 'seller-products', label: 'Seller products', path: '/admin/seller-products', icon: 'store' },
    ],
  },
  {
    title: 'Advertisement management',
    items: [
      { id: 'banners', label: 'Banners', path: '/admin/banners', icon: 'image' },
      { id: 'tryon-banner', label: 'Try-on banners', path: '/admin/tryon-banner', icon: 'images' },
      {
        id: 'push-notifications',
        label: 'Push notifications',
        path: '/admin/push-notifications',
        icon: 'bell',
      },
      { id: 'coupons', label: 'Coupons', path: '/admin/coupons', icon: 'percent' },
    ],
  },
  {
    title: 'Subscription management',
    items: [
      { id: 'plans', label: 'Subscription plans', path: '/admin/plans', icon: 'list' },
      {
        id: 'subscription-transactions',
        label: 'Subscription transactions',
        path: '/admin/subscription-transactions',
        icon: 'receipt',
      },
    ],
  },
  {
    title: 'User management',
    items: [
      { id: 'users', label: 'Users', path: '/admin/users', icon: 'users' },
      { id: 'history', label: 'User history', path: '/admin/history', icon: 'history' },
      { id: 'return-requests', label: 'Return requests', path: '/admin/return-requests', icon: 'undo' },
      { id: 'reviews', label: 'Review', path: '/admin/reviews', icon: 'star' },
    ],
  },
  {
    title: 'Seller management',
    items: [
      { id: 'sellers', label: 'Sellers', path: '/admin/sellers', icon: 'user-tie' },
      {
        id: 'withdrawal-request',
        label: 'Withdrawal requests',
        path: '/admin/withdrawal-request',
        icon: 'banknote',
      },
      {
        id: 'bussiness-categories',
        label: 'Business categories',
        path: '/admin/bussiness-categories',
        icon: 'layers',
      },
    ],
  },
  {
    title: 'System settings',
    items: [
      { id: 'business-setup', label: 'Business setup', path: '/admin/business-setup', icon: 'briefcase' },
      { id: 'static-pages', label: 'Static pages', path: '/admin/static-pages', icon: 'file-text' },
      {
        id: 'app-config',
        label: 'Application settings',
        path: '/admin/app-config',
        icon: 'settings',
      },
    ],
  },
];
