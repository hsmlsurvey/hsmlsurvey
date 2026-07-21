export type Role = 'admin' | 'moderator' | 'user';
export type UserStatus = 'active' | 'inactive';

export type TableKey =
  | 'zone_numbers'
  | 'zone_types'
  | 'circles'
  | 'mozas'
  | 'app_users'
  | 'report_circle_moza'
  | 'report_category'
  | 'report_variety'
  | 'report_grower';

export type Action = 'view' | 'insert' | 'update' | 'delete';

export type Permissions = Partial<Record<TableKey, Partial<Record<Action, boolean>>>>;

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  is_active: boolean;
  permissions: Permissions;
  created_at: string;
  updated_at: string;
}

export interface ZoneNumber {
  id: string;
  zone_number: string;
  created_at?: string;
  updated_at?: string;
}

export interface ZoneType {
  id: string;
  zone_type: string;
  created_at?: string;
  updated_at?: string;
}

export interface Circle {
  id: string;
  zone_number_id: string | null;
  zone_type_id: string | null;
  circle_name: string;
  zone_numbers?: ZoneNumber | null;
  zone_types?: ZoneType | null;
  created_at?: string;
  updated_at?: string;
}

export interface Moza {
  id: string;
  circle_id: string;
  moza_name: string;
  circles?: Circle | null;
  created_at?: string;
  updated_at?: string;
}

export interface Grower {
  id: string;
  passbook_number: string;
  grower_name: string;
  father_name: string | null;
  cnic: string | null;
  cell: string | null;
  bank_title: string | null;
  bank_account: string | null;
  transport_type: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PassbookEntry {
  id: string;
  grower_id: string;
  zone_number_id: string | null;
  zone_type_id: string | null;
  circle_id: string | null;
  moza_id: string | null;
  survey: string | null;
  variety_mondha: number;
  variety_sanma: number;
  non_variety_mondha: number;
  non_variety_sanma: number;
  total_acre: number;
  created_at?: string;
  updated_at?: string;
}

export const ALL_TABLES: TableKey[] = [
  'zone_numbers',
  'zone_types',
  'circles',
  'mozas',
  'app_users',
  'report_circle_moza',
  'report_category',
  'report_variety',
  'report_grower',
];

export const ALL_ACTIONS: Action[] = ['view', 'insert', 'update', 'delete'];

export const TABLE_LABELS: Record<TableKey, string> = {
  zone_numbers: 'Zone Numbers',
  zone_types: 'Zone Types',
  circles: 'Circles',
  mozas: 'Mozas',
  app_users: 'User Management',
  report_circle_moza: 'Circle / Moza Wise Report',
  report_category: 'Category Wise Report',
  report_variety: 'Variety Wise Report',
  report_grower: 'Grower Wise Report',
};

export function fullPermissions(): Permissions {
  const p: Permissions = {};
  ALL_TABLES.forEach((t) => {
    p[t] = {};
    ALL_ACTIONS.forEach((a) => {
      p[t]![a] = true;
    });
  });
  return p;
}

export function emptyPermissions(): Permissions {
  const p: Permissions = {};
  ALL_TABLES.forEach((t) => {
    p[t] = {};
    ALL_ACTIONS.forEach((a) => {
      p[t]![a] = false;
    });
  });
  return p;
}

export function hasPermission(
  user: AppUser | null,
  table: TableKey,
  action: Action
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.status !== 'active' || !user.is_active) return false;
  return user.permissions?.[table]?.[action] === true;
}
