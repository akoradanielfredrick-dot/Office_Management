export type UserRole = 'SUPER_ADMIN' | 'DIRECTOR' | 'OPERATIONS' | 'ACCOUNTS' | 'SALES';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
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
  status: 'CONFIRMED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  start_date?: string;
  end_date?: string;
  total_cost: number;
  created_at: string;
}

export interface Quotation {
  id: string;
  reference_no: string;
  client: Client;
  status: 'DRAFT' | 'SENT' | 'EXPIRED' | 'CONVERTED';
  total_amount: number;
  currency: string;
  valid_until?: string;
  created_at: string;
}
