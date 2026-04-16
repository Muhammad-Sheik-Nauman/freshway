"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const businessTypes = [
  "Restaurant / Hotel",
  "Retail Fish Shop",
  "Wholesale Distributor",
  "Supermarket / Chain",
  "Catering Service",
  "Export Business",
  "Individual Buyer",
  "Other",
];

export default function BuyerSetupPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    displayName: session?.user?.name || "",
    phone: "",
    location: "",
    businessName: "",
    businessType: "",
    bio: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        await update({ profileComplete: true });
        router.push("/buyer/dashboard");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = form.displayName && form.phone && form.location;
  const isStep2Valid = form.businessType;

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
      <div className="relative z-10 w-full max-w-[520px]">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="FreshWay" className="h-14 opacity-90" />
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10">
          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                  step >= s
                    ? "bg-gradient-to-br from-[#3a7bd5] to-[#00d2ff] text-white shadow-md"
                    : "bg-slate-100 text-slate-400"
                }`}>
                  {step > s ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                    step > s ? "bg-gradient-to-r from-[#3a7bd5] to-[#00d2ff]" : "bg-slate-100"
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-5" style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-extrabold text-[#1a2a3a] mb-1">Personal Details</h2>
                <p className="text-sm text-[#3a4a5a]">Tell us about yourself</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Full Name *</label>
                <input
                  type="text"
                  name="displayName"
                  value={form.displayName}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30 focus:border-[#3a7bd5] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30 focus:border-[#3a7bd5] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Location *</label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Mangalore, Karnataka"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30 focus:border-[#3a7bd5] transition-all"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                className={`w-full py-3.5 rounded-xl font-bold text-white text-base transition-all ${
                  isStep1Valid
                    ? "bg-gradient-to-r from-[#1a2a3a] to-[#3a7bd5] shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                Next Step →
              </button>
            </div>
          )}

          {/* Step 2: Business Info */}
          {step === 2 && (
            <div className="space-y-5" style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-extrabold text-[#1a2a3a] mb-1">Business Details</h2>
                <p className="text-sm text-[#3a4a5a]">Help sellers understand your needs</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Business Name</label>
                <input
                  type="text"
                  name="businessName"
                  value={form.businessName}
                  onChange={handleChange}
                  placeholder="Your business or company name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30 focus:border-[#3a7bd5] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Business Type *</label>
                <select
                  name="businessType"
                  value={form.businessType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] bg-white focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30 focus:border-[#3a7bd5] transition-all"
                >
                  <option value="">Select your business type</option>
                  {businessTypes.map((bt) => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Bio / About</label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Brief description about your business and fish requirements..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30 focus:border-[#3a7bd5] transition-all resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[#1a2a3a] text-base border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!isStep2Valid}
                  className={`flex-1 py-3.5 rounded-xl font-bold text-white text-base transition-all ${
                    isStep2Valid
                      ? "bg-gradient-to-r from-[#1a2a3a] to-[#3a7bd5] shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-5" style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#11998e] to-[#38ef7d] flex items-center justify-center shadow-lg">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h2 className="text-2xl font-extrabold text-[#1a2a3a] mb-1">Review Your Profile</h2>
                <p className="text-sm text-[#3a4a5a]">Make sure everything looks good</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                {[
                  { label: "Name", value: form.displayName },
                  { label: "Phone", value: form.phone },
                  { label: "Location", value: form.location },
                  { label: "Business", value: form.businessName || "—" },
                  { label: "Type", value: form.businessType },
                  { label: "Bio", value: form.bio || "—" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-start gap-4">
                    <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider shrink-0">{item.label}</span>
                    <span className="text-sm text-[#1a2a3a] font-medium text-right">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[#1a2a3a] text-base border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  ← Edit
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3.5 rounded-xl font-bold text-white text-base bg-gradient-to-r from-[#11998e] to-[#38ef7d] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Saving...
                    </span>
                  ) : (
                    "Complete Setup ✓"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
