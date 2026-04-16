"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SelectRolePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [selected, setSelected] = useState<"buyer" | "seller" | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // If user already has a role, redirect them to appropriate dashboard
  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch("/api/user/role");
        if (res.ok) {
          const data = await res.json();
          if (data.role === "buyer") {
            router.replace("/buyer/dashboard");
            return;
          } else if (data.role === "seller") {
            router.replace("/dashboard");
            return;
          }
        }
      } catch (err) {
        console.error("Error checking role:", err);
      }
      setChecking(false);
    };
    checkRole();
  }, [router]);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selected }),
      });

      if (res.ok) {
        // Update the session so middleware/pages pick up the new role
        await update({ role: selected });

        if (selected === "seller") {
          router.push("/seller/setup");
        } else {
          router.push("/buyer/setup");
        }
      }
    } catch (err) {
      console.error("Error setting role:", err);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-4"
        style={{
          backgroundImage: "url('/bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundBlendMode: "overlay",
          backgroundColor: "rgba(13, 27, 42, 0.65)",
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-white/80 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundBlendMode: "overlay",
        backgroundColor: "rgba(13, 27, 42, 0.65)",
      }}
    >
      <div className="relative z-10 w-full max-w-[560px]">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="FreshWay Logo" className="h-14 opacity-90" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10">
          {/* Welcome */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#3a7bd5] to-[#00d2ff] flex items-center justify-center shadow-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a2a3a] mb-2">
              Welcome, {session?.user?.name?.split(" ")[0] || "there"}! 👋
            </h1>
            <p className="text-[#3a4a5a] text-sm sm:text-base">
              How would you like to use FreshWay?
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {/* Buyer Card */}
            <button
              onClick={() => setSelected("buyer")}
              className={`group relative flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                selected === "buyer"
                  ? "border-[#3a7bd5] bg-[#3a7bd5]/5 shadow-lg shadow-[#3a7bd5]/10 -translate-y-1"
                  : "border-slate-200 bg-white hover:border-[#3a7bd5]/40 hover:shadow-md hover:-translate-y-0.5"
              }`}
            >
              {selected === "buyer" && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 rounded-full bg-[#3a7bd5] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                </div>
              )}
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
                selected === "buyer"
                  ? "bg-gradient-to-br from-[#3a7bd5] to-[#00d2ff] shadow-lg"
                  : "bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-[#3a7bd5] group-hover:to-[#00d2ff]"
              }`}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={selected === "buyer" ? "white" : "#64748b"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-white transition-colors">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
              </div>
              <h3 className="font-bold text-lg text-[#1a2a3a] mb-1">I'm a Buyer</h3>
              <p className="text-xs text-[#3a4a5a] leading-relaxed">
                Browse sellers, negotiate deals, and purchase fresh fish directly
              </p>
            </button>

            {/* Seller Card */}
            <button
              onClick={() => setSelected("seller")}
              className={`group relative flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                selected === "seller"
                  ? "border-[#11998e] bg-[#11998e]/5 shadow-lg shadow-[#11998e]/10 -translate-y-1"
                  : "border-slate-200 bg-white hover:border-[#11998e]/40 hover:shadow-md hover:-translate-y-0.5"
              }`}
            >
              {selected === "seller" && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 rounded-full bg-[#11998e] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                </div>
              )}
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
                selected === "seller"
                  ? "bg-gradient-to-br from-[#11998e] to-[#38ef7d] shadow-lg"
                  : "bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-[#11998e] group-hover:to-[#38ef7d]"
              }`}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={selected === "seller" ? "white" : "#64748b"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-white transition-colors">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <h3 className="font-bold text-lg text-[#1a2a3a] mb-1">I'm a Seller</h3>
              <p className="text-xs text-[#3a4a5a] leading-relaxed">
                Check freshness with AI, manage supply chain, and sell to buyers
              </p>
            </button>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!selected || loading}
            className={`w-full py-3.5 rounded-xl font-bold text-white text-base transition-all duration-300 ${
              selected
                ? selected === "buyer"
                  ? "bg-gradient-to-r from-[#1a2a3a] to-[#3a7bd5] shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  : "bg-gradient-to-r from-[#11998e] to-[#38ef7d] shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Setting up...
              </span>
            ) : (
              `Continue as ${selected === "buyer" ? "Buyer" : selected === "seller" ? "Seller" : "..."}`
            )}
          </button>

          <p className="text-center text-xs text-[#9ca3af] mt-4">
            You can change this later from your profile settings
          </p>
        </div>
      </div>
    </div>
  );
}
