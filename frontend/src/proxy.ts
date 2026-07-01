import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set([
  "/",
  "/join",
  "/login",
  "/platform/login",
  "/privacy",
  "/terms",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  // Invitation join links are public — any unauthenticated user can access them
  if (pathname.startsWith("/join/")) return NextResponse.next();

  if (pathname.startsWith("/platform")) {
    const platformAccessToken = request.cookies.get(
      "platformAccessToken",
    )?.value;
    if (!platformAccessToken) {
      return NextResponse.redirect(new URL("/platform/login", request.url));
    }
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("accessToken")?.value;
  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
