import { fetchApi } from "../api";

export interface DevLoginResponse {
  accessToken: string;
  refreshToken: string;
  person: {
    id: string;
    name: string;
    username: string;
  };
}

export type AuthResponse = DevLoginResponse;

export interface CurrentPerson {
  id: string;
  name: string;
  username: string;
  phoneNumber?: string | null;
  email?: string | null;
  isVerified: boolean;
}

export async function devLogin(username: string): Promise<DevLoginResponse> {
  return fetchApi<DevLoginResponse>("/auth/dev-login", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function login(phoneNumber: string, password: string): Promise<AuthResponse> {
  return fetchApi<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phoneNumber, password }),
  });
}

export function sendOtp(phoneNumber: string): Promise<{ message: string }> {
  return fetchApi<{ message: string }>("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
}

export function verifyOtp(phoneNumber: string, code: string): Promise<AuthResponse> {
  return fetchApi<AuthResponse>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber, code }),
  });
}

export function register(data: {
  name: string;
  phoneNumber: string;
  password: string;
  entityId?: string;
  branchOrFamily?: string;
  recommenderName?: string;
  notes?: string;
}): Promise<AuthResponse> {
  return fetchApi<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateMe(data: {
  name?: string;
  email?: string;
  username?: string;
}): Promise<CurrentPerson> {
  return fetchApi<CurrentPerson>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function logout(refreshToken: string) {
  return fetchApi<{ message: string }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function getMe(): Promise<CurrentPerson> {
  return fetchApi("/auth/me");
}
