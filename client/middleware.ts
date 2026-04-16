import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // If user has no role set, redirect to role selection
    // (except if they're already on the select-role page)
    if (!token?.role && !path.startsWith("/select-role")) {
      return NextResponse.redirect(new URL("/select-role", req.url));
    }

    // If buyer tries to access seller pages, redirect to buyer dashboard
    if (token?.role === "buyer" && (path === "/dashboard" || path.startsWith("/capture-img") || path.startsWith("/supply-chain"))) {
      return NextResponse.redirect(new URL("/buyer/dashboard", req.url));
    }

    // If seller tries to access buyer pages, redirect to seller dashboard
    if (token?.role === "seller" && path.startsWith("/buyer")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/capture-img/:path*",
    "/supply-chain/:path*",
    "/select-role/:path*",
    "/buyer/:path*",
    "/seller/:path*",
  ],
};
