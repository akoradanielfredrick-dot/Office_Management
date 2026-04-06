import type { PortalModuleKey } from '../lib/portalAccess';

export type UserRole = 'SUPER_ADMIN' | 'DIRECTOR' | 'OPERATIONS' | 'ACCOUNTS' | 'SALES' | 'STAFF';
export type UserStatus = 'active' | 'blocked' | 'revoked';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  status: UserStatus;
  portal_permissions: string[];
  portal_modules: PortalModuleKey[];
  is_management: boolean;
}

export interface Client {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export interface Booking {
  id: string;
  reference_no: string;
  client: Client;
  product_name_snapshot?: string;
  product_category_snapshot?: string;
  status: 'CONFIRMED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  travel_date?: string;
  number_of_days?: number;
  start_date?: string;
  end_date?: string;
  subtotal?: number;
  discount?: number;
  extra_charges?: number;
  total_cost: number;
  paid_amount?: number;
  itinerary?: string;
  booking_validity?: string;
  deposit_terms?: string;
  payment_channels?: string;
  created_at: string;
}
