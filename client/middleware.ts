import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Add any other routes you want to protect here
  matcher: [
    "/dashboard/:path*",
    "/capture-img/:path*",
    "/supply-chain/:path*"
  ],
};
