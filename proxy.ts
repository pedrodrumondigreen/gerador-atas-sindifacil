import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, sha256Hex } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return new NextResponse(
      "Auth não configurada: defina APP_PASSWORD no servidor.",
      { status: 500 },
    );
  }

  const expected = await sha256Hex(password);
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (token === expected) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!login|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image.jpg|assets/).*)",
  ],
};
