"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";

// ── Types ────────────────────────────────────────────────
interface Seller {
  id: string;
  name: string;
  company: string;
  location: string;
  distance: number; // km
  phone: string;
  email: string;
  avatar: string; // initials
  avatarColor: string;
  contracted: boolean;
  contractStatus: "Active" | "Pending" | "Expired";
  fishTypes: string[];
  pricePerKg: number;
  minOrderKg: number;
  contractStart: string;
  contractEnd: string;
  rating: number;
  totalDeliveries: number;
  lastDelivery: string;
}

// ── Mock Data ────────────────────────────────────────────
const sellers: Seller[] = [
  {
    id: "S001",
    name: "Rajesh Kumar",
    company: "Kerala Fish Co.",
    location: "Kochi, Kerala",
    distance: 12,
    phone: "+91 98765 43210",
    email: "rajesh@keralafish.com",
    avatar: "RK",
    avatarColor: "from-[#3a7bd5] to-[#00d2ff]",
    contracted: true,
    contractStatus: "Active",
    fishTypes: ["Tuna", "Mackerel", "Pomfret"],
    pricePerKg: 320,
    minOrderKg: 50,
    contractStart: "2025-01-01",
    contractEnd: "2025-12-31",
    rating: 4.8,
    totalDeliveries: 142,
    lastDelivery: "2026-04-06",
  },
  {
    id: "S002",
    name: "Anitha Nair",
    company: "Coastal Fresh Traders",
    location: "Trivandrum, Kerala",
    distance: 34,
    phone: "+91 91234 56789",
    email: "anitha@coastalfresh.in",
    avatar: "AN",
    avatarColor: "from-[#11998e] to-[#38ef7d]",
    contracted: true,
    contractStatus: "Active",
    fishTypes: ["Sardine", "Squid", "Prawn"],
    pricePerKg: 280,
    minOrderKg: 30,
    contractStart: "2025-03-15",
    contractEnd: "2026-03-14",
    rating: 4.6,
    totalDeliveries: 98,
    lastDelivery: "2026-04-05",
  },
  {
    id: "S003",
    name: "Mohammed Faisal",
    company: "Arabian Sea Exports",
    location: "Kozhikode, Kerala",
    distance: 87,
    phone: "+91 94456 78901",
    email: "faisal@arabianseaexports.com",
    avatar: "MF",
    avatarColor: "from-purple-500 to-pink-500",
    contracted: true,
    contractStatus: "Pending",
    fishTypes: ["Kingfish", "Shark", "Barracuda"],
    pricePerKg: 480,
    minOrderKg: 100,
    contractStart: "2026-05-01",
    contractEnd: "2027-04-30",
    rating: 4.3,
    totalDeliveries: 0,
    lastDelivery: "—",
  },
  {
    id: "S004",
    name: "Suresh Pillai",
    company: "Bay of Bengal Fisheries",
    location: "Kannur, Kerala",
    distance: 123,
    phone: "+91 87654 32109",
    email: "suresh@bobfisheries.com",
    avatar: "SP",
    avatarColor: "from-orange-400 to-red-500",
    contracted: true,
    contractStatus: "Expired",
    fishTypes: ["Red Snapper", "Cuttlefish", "Lobster"],
    pricePerKg: 650,
    minOrderKg: 20,
    contractStart: "2024-01-01",
    contractEnd: "2024-12-31",
    rating: 4.9,
    totalDeliveries: 220,
    lastDelivery: "2024-12-28",
  },
  {
    id: "S005",
    name: "Leela Menon",
    company: "FreshCatch Distributors",
    location: "Alappuzha, Kerala",
    distance: 58,
    phone: "+91 99887 72234",
    email: "leela@freshcatch.in",
    avatar: "LM",
    avatarColor: "from-cyan-500 to-teal-400",
    contracted: true,
    contractStatus: "Active",
    fishTypes: ["Pearl Spot", "Tilapia", "Catfish"],
    pricePerKg: 220,
    minOrderKg: 25,
    contractStart: "2025-06-01",
    contractEnd: "2026-05-31",
    rating: 4.5,
    totalDeliveries: 76,
    lastDelivery: "2026-04-07",
  },
];

// ── Helpers ──────────────────────────────────────────────
const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  Active: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  Pending: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-400" },
  Expired: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-400" },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? "#f59e0b" : "none"}
          stroke="#f59e0b"
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span className="text-xs font-semibold text-[#3a4a5a] ml-1">{rating}</span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────
export default function SupplyChainPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Active" | "Pending" | "Expired">("All");
  const [selected, setSelected] = useState<Seller | null>(null);
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "price">("distance");

  const filtered = sellers
    .filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        s.company.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.fishTypes.some((f) => f.toLowerCase().includes(q));
      const matchesFilter = filter === "All" || s.contractStatus === filter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "distance") return a.distance - b.distance;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "price") return a.pricePerKg - b.pricePerKg;
      return 0;
    });

  const stats = {
    active: sellers.filter((s) => s.contractStatus === "Active").length,
    pending: sellers.filter((s) => s.contractStatus === "Pending").length,
    expired: sellers.filter((s) => s.contractStatus === "Expired").length,
    totalDeliveries: sellers.reduce((a, b) => a + b.totalDeliveries, 0),
  };

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

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-10 mt-[72px]">
        {/* ── Page Header ─────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <a href="/dashboard" className="text-sm text-[#3a7bd5] hover:underline font-medium">Dashboard</a>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            <span className="text-sm text-[#9ca3af] font-medium">Supply Chain</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1a2a3a] mb-2">Supply Chain</h1>
          <p className="text-[#3a4a5a] text-base">Manage your fish procurement contracts and seller relationships.</p>
        </div>

        {/* ── Stats Row ───────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Contracts", value: stats.active, color: "text-emerald-600", bg: "bg-emerald-50", icon: "✅" },
            { label: "Pending Contracts", value: stats.pending, color: "text-amber-600", bg: "bg-amber-50", icon: "⏳" },
            { label: "Expired Contracts", value: stats.expired, color: "text-red-500", bg: "bg-red-50", icon: "❌" },
            { label: "Total Deliveries", value: stats.totalDeliveries, color: "text-[#3a7bd5]", bg: "bg-blue-50", icon: "📦" },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-2xl p-5 border border-white/60 shadow-sm`}>
              <p className="text-2xl mb-1">{stat.icon}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-[#3a4a5a] font-medium mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Filters & Search Row ────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              id="supply-chain-search"
              type="text"
              placeholder="Search by seller, company, fish type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/90 backdrop-blur text-sm text-[#1a2a3a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/40 shadow-sm"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {(["All", "Active", "Pending", "Expired"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  filter === f
                    ? "bg-[#1a2a3a] text-white border-[#1a2a3a] shadow"
                    : "bg-white/80 text-[#3a4a5a] border-slate-200 hover:border-[#3a7bd5]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "distance" | "rating" | "price")}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white/90 text-sm text-[#1a2a3a] font-semibold focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/40 shadow-sm cursor-pointer"
          >
            <option value="distance">Sort: Nearest First</option>
            <option value="rating">Sort: Top Rated</option>
            <option value="price">Sort: Lowest Price</option>
          </select>
        </div>

        {/* ── Seller Cards ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.length === 0 ? (
            <div className="col-span-3 text-center py-20 text-[#9ca3af]">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-semibold">No sellers found</p>
              <p className="text-sm mt-1">Try adjusting your search or filter.</p>
            </div>
          ) : (
            filtered.map((seller) => {
              const st = statusStyles[seller.contractStatus];
              return (
                <div
                  key={seller.id}
                  onClick={() => setSelected(seller)}
                  className="group bg-white/90 backdrop-blur-xl rounded-2xl shadow-md border border-white/50 p-6 cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                >
                  {/* Top gradient stripe */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${seller.avatarColor}`} />

                  {/* Header row */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${seller.avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
                      {seller.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h2 className="font-bold text-[#1a2a3a] text-base truncate">{seller.name}</h2>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${st.bg} ${st.text} flex items-center gap-1.5 flex-shrink-0 ml-2`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                          {seller.contractStatus}
                        </span>
                      </div>
                      <p className="text-sm text-[#3a4a5a] truncate">{seller.company}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2.5 mb-4">
                    <div className="flex items-center gap-2 text-sm text-[#3a4a5a]">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      <span>{seller.location}</span>
                      <span className="ml-auto text-xs font-semibold bg-blue-50 text-[#3a7bd5] px-2 py-0.5 rounded-full">
                        📍 {seller.distance} km away
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-[#3a4a5a]">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#11998e" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                      <span>₹{seller.pricePerKg}/kg</span>
                      <span className="text-[#9ca3af]">·</span>
                      <span>Min {seller.minOrderKg} kg</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-[#3a4a5a]">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M4 10c0-4.4 3.6-8 8-8s8 3.6 8 8c0 5.4-8 13-8 13S4 15.4 4 10z"/></svg>
                      <StarRating rating={seller.rating} />
                      <span className="ml-auto text-xs text-[#9ca3af]">{seller.totalDeliveries} deliveries</span>
                    </div>

                    {/* Fish types */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {seller.fishTypes.map((f) => (
                        <span key={f} className="text-xs bg-slate-100 text-[#3a4a5a] px-2.5 py-1 rounded-full font-medium">
                          🐟 {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-[#9ca3af]">
                      Contract ends: <span className="font-semibold text-[#3a4a5a]">{seller.contractEnd}</span>
                    </span>
                    <span className="text-xs font-bold text-[#3a7bd5] group-hover:underline">View Details →</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Seller Detail Modal ───────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            style={{ animation: "slideUp 0.3s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className={`bg-gradient-to-r ${selected.avatarColor} p-6 text-white relative`}>
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold shadow">
                  {selected.avatar}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selected.name}</h2>
                  <p className="text-white/85 text-sm">{selected.company}</p>
                  <div className="mt-1">
                    <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-semibold">
                      #{selected.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Status & rating */}
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold px-3 py-1.5 rounded-full flex items-center gap-2 ${statusStyles[selected.contractStatus].bg} ${statusStyles[selected.contractStatus].text}`}>
                  <span className={`w-2 h-2 rounded-full ${statusStyles[selected.contractStatus].dot}`}></span>
                  {selected.contractStatus}
                </span>
                <StarRating rating={selected.rating} />
              </div>

              {/* Contact */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Contact Details</h3>
                <div className="flex items-center gap-3 text-sm text-[#1a2a3a]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.16 6.16l.77-.77a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  {selected.phone}
                </div>
                <div className="flex items-center gap-3 text-sm text-[#1a2a3a]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  {selected.email}
                </div>
                <div className="flex items-center gap-3 text-sm text-[#1a2a3a]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  {selected.location} — <strong>{selected.distance} km away</strong>
                </div>
              </div>

              {/* Contract */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Contract Info</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[#9ca3af]">Start Date</p>
                    <p className="font-semibold text-[#1a2a3a] text-sm">{selected.contractStart}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9ca3af]">End Date</p>
                    <p className="font-semibold text-[#1a2a3a] text-sm">{selected.contractEnd}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9ca3af]">Price / kg</p>
                    <p className="font-semibold text-[#1a2a3a] text-sm">₹{selected.pricePerKg}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9ca3af]">Min Order</p>
                    <p className="font-semibold text-[#1a2a3a] text-sm">{selected.minOrderKg} kg</p>
                  </div>
                </div>
              </div>

              {/* Fish types */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-3">Fish Types</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.fishTypes.map((f) => (
                    <span key={f} className="bg-white border border-slate-200 text-[#1a2a3a] text-sm px-3 py-1.5 rounded-full font-medium shadow-sm">
                      🐟 {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Delivery stats */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Delivery History</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[#9ca3af]">Total Deliveries</p>
                    <p className="font-bold text-[#1a2a3a] text-lg">{selected.totalDeliveries}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9ca3af]">Last Delivery</p>
                    <p className="font-semibold text-[#1a2a3a] text-sm">{selected.lastDelivery}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 pb-6 pt-2 flex gap-3">
              <button
                className="flex-1 py-3 bg-[#1a2a3a] text-white rounded-xl font-bold hover:bg-[#0d1b2a] transition-colors text-sm"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
              <button className={`flex-1 py-3 rounded-xl font-bold text-white text-sm bg-gradient-to-r ${selected.avatarColor} hover:opacity-90 transition-opacity`}>
                Contact Seller
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1);    }
        }
      `}</style>
    </main>
  );
}
