import type { NextRequest } from "next/server";

export const AUTH_COOKIE_NAME = "auth";

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const password = process.env.APP_PASSWORD;
  if (!password) return false;
  const expected = await sha256Hex(password);
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  return token === expected;
}
