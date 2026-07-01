import { NextRequest, NextResponse } from "next/server";

// Route prefixes that require an authenticated session.
// Excludes routes with their own auth/redirect UX (e.g. /invite/[token]) and
// routes that are intentionally public (/, /login, /profile/*, /report/*).
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/team",
  "/settings",
  "/billing",
  "/integrations",
  "/audit",
  "/ai-review",
  "/autodocs",
  "/invites",
  "/mode-select",
  "/onboarding",
  "/personal",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !req.cookies.get("flowops_token")) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/team/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/integrations/:path*",
    "/audit/:path*",
    "/ai-review/:path*",
    "/autodocs/:path*",
    "/invites/:path*",
    "/mode-select/:path*",
    "/onboarding/:path*",
    "/personal/:path*",
  ],
};
