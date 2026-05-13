export interface NavItem {
  id: string;
  label: string;
  /** Lucide-style icon key resolved in sidebar-menu */
  icon?: string;
  /** Absolute application path */
  path?: string;
  children?: NavItem[];
}
