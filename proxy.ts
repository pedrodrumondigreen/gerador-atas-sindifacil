import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  if (!process.env.APP_PASSWORD) {
    return new NextResponse(
      "Auth não configurada: defina APP_PASSWORD no servidor.",
      { status: 500 },
    );
  }

  if (await isAuthenticated(request)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!login|api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image.jpg|assets/).*)",
  ],
};
