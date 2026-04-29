export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  imageUrl?: string;
  role?: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}
