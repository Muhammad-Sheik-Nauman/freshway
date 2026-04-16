"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const fishOptions = [
  "Tuna", "Mackerel", "Pomfret", "Sardine", "Squid", "Prawn",
  "Kingfish", "Shark", "Barracuda", "Red Snapper", "Cuttlefish",
  "Lobster", "Pearl Spot", "Tilapia", "Catfish", "Seer Fish",
  "Anchovy", "Crab", "Mussels", "Clams",
];

export default function SellerSetupPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({
    displayName: session?.user?.name || "",
    phone: "",
    location: "",
    businessName: "",
    businessType: "",
    bio: "",
  });
  const [selectedFish, setSelectedFish] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });

  useEffect(() => {
    // Check if seller already completed profile
    const check = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.profileComplete) {
            router.replace("/dashboard");
            return;
          }
          if (data.name || data.displayName) {
            setForm(prev => ({
              ...prev,
              displayName: data.displayName || data.name || prev.displayName,
            }));
          }
        }
      } catch (err) {
        console.error(err);
      }
      setChecking(false);
    };
    check();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleFish = (fish: string) => {
    setSelectedFish(prev =>
      prev.includes(fish) ? prev.filter(f => f !== fish) : [...prev, fish]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Save profile
      await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fishTypes: selectedFish,
          priceRange: `₹${priceRange.min} - ₹${priceRange.max}/kg`,
        }),
      });

      // Also save fish types and price to user record
      await fetch("/api/user/seller-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fishTypes: selectedFish,
          priceRange: `₹${priceRange.min} - ₹${priceRange.max}/kg`,
          minPrice: Number(priceRange.min),
          maxPrice: Number(priceRange.max),
        }),
      });

      await update({ profileComplete: true });
      router.push("/dashboard");
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const isValid = form.displayName && form.phone && form.location && form.businessName && selectedFish.length > 0;

  if (checking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center"
        style={{ backgroundImage: "url('/bg.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundBlendMode: "overlay", backgroundColor: "rgba(13,27,42,0.65)" }}>
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <p className="text-white/80 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ backgroundImage: "url('/bg.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundBlendMode: "overlay", backgroundColor: "rgba(13,27,42,0.65)" }}>
      <div className="relative z-10 w-full max-w-[560px]">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="FreshWay" className="h-14 opacity-90" />
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#11998e] to-[#38ef7d] flex items-center justify-center shadow-lg">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-[#1a2a3a] mb-1">Set Up Your Seller Profile</h2>
            <p className="text-sm text-[#3a4a5a]">This info will be visible to buyers in the marketplace</p>
          </div>

          <div className="space-y-4">
            {/* Name & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1">Full Name *</label>
                <input type="text" name="displayName" value={form.displayName} onChange={handleChange} placeholder="Your name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30 focus:border-[#11998e] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1">Phone *</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30 focus:border-[#11998e] transition-all" />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1">Location *</label>
              <input type="text" name="location" value={form.location} onChange={handleChange} placeholder="e.g. Kochi, Kerala"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30 focus:border-[#11998e] transition-all" />
            </div>

            {/* Business Name & Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1">Business Name *</label>
                <input type="text" name="businessName" value={form.businessName} onChange={handleChange} placeholder="Your fish business"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30 focus:border-[#11998e] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1">Business Type</label>
                <select name="businessType" value={form.businessType} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] bg-white focus:outline-none focus:ring-2 focus:ring-[#11998e]/30 focus:border-[#11998e] transition-all">
                  <option value="">Select</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Retail">Retail</option>
                  <option value="Fisherman">Fisherman</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Exporter">Exporter</option>
                  <option value="Fish Farm">Fish Farm</option>
                </select>
              </div>
            </div>

            {/* Fish Types */}
            <div>
              <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-2">Fish Types You Sell * <span className="text-[#9ca3af] normal-case">(select all that apply)</span></label>
              <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1">
                {fishOptions.map(fish => (
                  <button key={fish} type="button" onClick={() => toggleFish(fish)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                      selectedFish.includes(fish)
                        ? "bg-gradient-to-r from-[#11998e] to-[#38ef7d] text-white border-transparent shadow-sm"
                        : "bg-white text-[#3a4a5a] border-slate-200 hover:border-[#11998e]"
                    }`}>
                    🐟 {fish}
                  </button>
                ))}
              </div>
              {selectedFish.length > 0 && (
                <p className="text-xs text-[#11998e] font-medium mt-1">{selectedFish.length} selected</p>
              )}
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1">Price Range (₹/kg)</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={priceRange.min} onChange={e => setPriceRange(prev => ({ ...prev, min: e.target.value }))} placeholder="Min (e.g. 200)"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30 focus:border-[#11998e] transition-all" />
                <input type="number" value={priceRange.max} onChange={e => setPriceRange(prev => ({ ...prev, max: e.target.value }))} placeholder="Max (e.g. 500)"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30 focus:border-[#11998e] transition-all" />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1">About Your Business</label>
              <textarea name="bio" value={form.bio} onChange={handleChange} rows={2} placeholder="Describe your business, catch quality, experience..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30 focus:border-[#11998e] transition-all resize-none" />
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={!isValid || loading}
              className={`w-full py-3.5 rounded-xl font-bold text-white text-base transition-all ${
                isValid ? "bg-gradient-to-r from-[#11998e] to-[#38ef7d] shadow-lg hover:shadow-xl hover:-translate-y-0.5" : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Saving...
                </span>
              ) : "Complete Profile & Go to Dashboard ✓"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
