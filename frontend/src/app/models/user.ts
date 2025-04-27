export interface Programme {
  id: string;
  abbreviation: string;
  fullName: string;
  discipline: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  programme: Programme | string; // Can be a Programme object or a string ID
  registrationNo: string;
  status: 'active' | 'suspended';
  password?: string; // Optional for signup only, not stored in frontend after auth
}
