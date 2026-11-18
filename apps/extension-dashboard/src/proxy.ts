import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isHomeRoute = pathname === "/";

  // En "/" el proxy decide si mandar al panel; ahí se confirma la sesión con
  // Supabase Auth, igual que hace /dashboard, para que nunca discrepen.
  const { response, user } = await updateSession(request, {
    verifyWithAuth: isHomeRoute,
  });

  if (!user && isDashboardRoute) {
    const redirectUrl = new URL("/", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isHomeRoute) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
