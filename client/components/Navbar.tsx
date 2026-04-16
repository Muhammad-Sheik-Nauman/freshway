"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut, signIn } from "next-auth/react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/contact", label: "Contact" },
];

const Navbar = () => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      // @ts-ignore
      const role = session.user.role;
      if (role) {
        setUserRole(role);
      } else {
        // Fallback: fetch from API
        fetch("/api/user/role")
          .then((r) => r.json())
          .then((data) => setUserRole(data.role))
          .catch(() => {});
      }
    }
  }, [session]);

  const dashboardHref = userRole === "buyer" ? "/buyer/dashboard" : "/dashboard";
  const dashboardLabel = userRole === "buyer" ? "Buyer Dashboard" : "Dashboard";

  return (
    <nav className="w-full bg-white/90 fixed top-0 left-0 right-0 z-50 shadow-md border-b border-slate-200 backdrop-blur-md">
      <div className="flex justify-between items-center px-4 md:px-[8vw]">
        {/* Logo + Desktop Links */}
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/">
            <img src="/logo.png" alt="FreshWay Logo" className="h-14 md:h-18 mr-4 md:mr-6" />
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hidden sm:inline font-semibold text-sm transition-colors pb-1 ${
                pathname === link.href
                  ? "text-[#3a7bd5] border-b-2 border-[#3a7bd5]"
                  : "text-[#1a2a3a] hover:text-[#3a7bd5] border-b-2 border-transparent"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              {/* Dashboard link */}
              <Link
                href={dashboardHref}
                className={`hidden md:flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
                  pathname.includes("dashboard") || pathname.includes("/buyer")
                    ? "bg-[#3a7bd5]/10 text-[#3a7bd5]"
                    : "text-[#3a4a5a] hover:bg-slate-100"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
                {dashboardLabel}
              </Link>

              {/* User pill */}
              <div className="flex items-center gap-3 bg-slate-50/50 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all rounded-full py-1.5 pl-4 pr-1.5 cursor-default">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-700 leading-tight capitalize max-w-[150px] truncate">
                    {session.user?.name?.toLowerCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    {userRole && (
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${
                        userRole === "buyer" ? "text-[#3a7bd5]" : "text-[#11998e]"
                      }`}>
                        {userRole}
                      </span>
                    )}
                    <button 
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="text-[10px] font-extrabold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm ring-2 ring-[#3a7bd5]/20 overflow-hidden shrink-0 bg-slate-100">
                  <img 
                    src={session.user?.image || `https://ui-avatars.com/api/?name=${session.user?.name}&background=3a7bd5&color=fff&rounded=true`} 
                    alt={session.user?.name || "User"} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => signIn(undefined, { callbackUrl: "/select-role" })}
              className="bg-[#3a7bd5] text-white border-none rounded-md py-2 px-5 md:px-7 font-semibold text-base cursor-pointer shadow-sm hover:bg-[#255bb5] transition ml-4 md:ml-8"
            >
              Sign In
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 rounded-lg hover:bg-slate-100 transition"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2a3a" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden px-4 pb-4 pt-2 border-t border-slate-100 flex flex-col gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`font-semibold text-sm py-2 px-3 rounded-lg transition-colors ${
                pathname === link.href
                  ? "bg-[#3a7bd5]/10 text-[#3a7bd5]"
                  : "text-[#1a2a3a] hover:bg-slate-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {session && (
            <>
              <Link
                href={dashboardHref}
                onClick={() => setMenuOpen(false)}
                className="font-semibold text-sm py-2 px-3 rounded-lg text-[#3a7bd5] hover:bg-[#3a7bd5]/10"
              >
                {dashboardLabel}
              </Link>
              <button 
                onClick={() => signOut()}
                className="font-semibold text-sm py-2 px-3 rounded-lg text-red-500 hover:bg-red-50 text-left"
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;