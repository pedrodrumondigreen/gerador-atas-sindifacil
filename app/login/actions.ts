"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, sha256Hex } from "@/lib/auth";

export async function login(formData: FormData) {
  const password = formData.get("password");
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    throw new Error("APP_PASSWORD não configurada no servidor.");
  }
  if (typeof password !== "string" || password !== expected) {
    redirect("/login?error=1");
  }

  const token = await sha256Hex(expected);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect("/login");
}
