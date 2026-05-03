"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";

// ── Types ────────────────────────────────────────────────
interface Buyer {
  _id: string;
  name: string;
  email: string;
  image?: string;
  displayName?: string;
  phone?: string;
  location?: string;
  businessName?: string;
  businessType?: string;
  bio?: string;
  profileComplete?: boolean;
}

// ── Main Component ───────────────────────────────────────
export default function SupplyChainPage() {
  const [search, setSearch] = useState("");
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuyers();
  }, []);

  const fetchBuyers = async () => {
    try {
      const res = await fetch("/api/buyers");
      if (res.ok) {
        const data = await res.json();
        setBuyers(data);
      }
    } catch (err) {
      console.error("Error fetching buyers:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = buyers.filter((b) => {
    const q = search.toLowerCase();
    return (
      (b.displayName || b.name || "").toLowerCase().includes(q) ||
      (b.businessName || "").toLowerCase().includes(q) ||
      (b.location || "").toLowerCase().includes(q)
    );
  });

  const gradients = [
    "from-[#3a7bd5] to-[#00d2ff]",
    "from-[#11998e] to-[#38ef7d]",
    "from-purple-500 to-pink-500",
    "from-orange-400 to-red-500",
    "from-cyan-500 to-teal-400",
  ];

  return (
    <main
      className="relative min-h-screen w-full flex flex-col font-sans"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-white/78 z-0" />
      <Navbar />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10 mt-[60px] sm:mt-[72px]">
        {/* ── Page Header ─────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <a href="/dashboard" className="text-sm text-[#11998e] hover:underline font-medium">Dashboard</a>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            <span className="text-sm text-[#9ca3af] font-medium">Market Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1a2a3a] mb-2">Buyer Network</h1>
          <p className="text-[#3a4a5a] text-base">Browse and connect with registered buyers in the market.</p>
        </div>

        {/* ── Search Row ────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              id="buyer-search"
              type="text"
              placeholder="Search buyers by name, company, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/90 backdrop-blur text-sm text-[#1a2a3a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#11998e]/40 shadow-sm"
            />
          </div>
          <button onClick={fetchBuyers} className="px-5 py-3 rounded-xl border border-slate-200 bg-white/90 text-sm font-semibold text-[#11998e] hover:bg-[#11998e]/5 shadow-sm transition-all flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Refresh
          </button>
        </div>

        {/* ── Buyers Grid ─────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-[#11998e]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              <p className="text-sm text-[#3a4a5a] font-medium">Loading buyers...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
            <p className="text-5xl mb-4">👥</p>
            <h3 className="text-xl font-bold text-[#1a2a3a] mb-2">No Buyers Found</h3>
            <p className="text-sm text-[#3a4a5a] max-w-md mx-auto">
              There are currently no buyers matching your search, or no buyers have registered yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((buyer) => {
              const initials = (buyer.displayName || buyer.name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
              const gradient = gradients[Math.abs((buyer._id || "").charCodeAt(0)) % gradients.length];

              return (
                <div key={buyer._id} className="group bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200 p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />

                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0`}>
                      {buyer.image ? <img src={buyer.image} alt="" className="w-full h-full rounded-xl object-cover" referrerPolicy="no-referrer" /> : initials}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h2 className="font-bold text-[#1a2a3a] text-base truncate">{buyer.displayName || buyer.name}</h2>
                      <p className="text-sm text-[#3a4a5a] truncate">{buyer.businessName || "Registered Buyer"}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-3 mb-4 text-sm text-[#3a4a5a]">
                    {buyer.location && (
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#11998e" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        <span className="font-medium truncate">{buyer.location}</span>
                      </div>
                    )}
                    {buyer.businessType && (
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#11998e" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
                        <span className="font-medium truncate">{buyer.businessType}</span>
                      </div>
                    )}
                    {buyer.phone && (
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#11998e" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        <span className="font-medium truncate">{buyer.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  {buyer.bio && (
                    <p className="text-xs text-[#5a6a7a] bg-slate-50/50 p-3 rounded-lg border border-slate-100 italic">
                      "{buyer.bio}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
