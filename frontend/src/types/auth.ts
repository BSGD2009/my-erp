export type Role = 'ADMIN' | 'CSR';

export interface AuthUser {
  id:    number;
  email: string;
  name:  string;
  role:  Role;
}
