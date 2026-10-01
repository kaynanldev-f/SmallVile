'use server';

import { cookies } from 'next/headers';

export async function buildAuthHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get('auth_token')?.value;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}