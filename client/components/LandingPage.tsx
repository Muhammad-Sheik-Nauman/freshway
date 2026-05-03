"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./Navbar";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";

// ── Animated counter hook ────────────────────────────────
function useCounter(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return { count, ref };
}

// ── Stat Item ────────────────────────────────────────────
function StatItem({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { count, ref } = useCounter(value);
  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl sm:text-4xl font-bold text-white">
        {count}{suffix}
      </p>
      <p className="text-white/70 text-sm mt-1 font-medium">{label}</p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────
const LandingPage = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const handleGetStarted = () => {
    if (session) {
      router.push("/dashboard");
    } else {
      signIn(undefined, { callbackUrl: "/dashboard" });
    }
  };

  const features = [
    {
      icon: "🏪",
      title: "Dynamic Marketplace",
      desc: "Browse a real-time marketplace of seafood listings. Connect with verified sellers directly and negotiate deals.",
      color: "from-[#3a7bd5] to-[#00d2ff]",
      bg: "bg-blue-50",
    },
    {
      icon: "🧠",
      title: "AI Quality Verification",
      desc: "Our MobileNetV2 deep learning model analyzes fish eye photos to instantly verify freshness before you buy.",
      color: "from-purple-500 to-pink-400",
      bg: "bg-purple-50",
    },
    {
      icon: "💬",
      title: "Real-time Messaging",
      desc: "Communicate securely with buyers and sellers. Negotiate prices and finalize deals without leaving the platform.",
      color: "from-[#11998e] to-[#38ef7d]",
      bg: "bg-emerald-50",
    },
    {
      icon: "⭐",
      title: "Transparent Reviews",
      desc: "Build trust with a comprehensive rating system. Read reviews from previous buyers to make informed decisions.",
      color: "from-orange-400 to-red-400",
      bg: "bg-orange-50",
    },
  ];

  const steps = [
    { num: "01", title: "Create Your Profile", desc: "Sign up and choose your role as a Buyer or Seller in our marketplace.", icon: "👤" },
    { num: "02", title: "List or Discover", desc: "Sellers list catches with AI freshness proof. Buyers browse the market.", icon: "🛒" },
    { num: "03", title: "Connect & Transact", desc: "Chat, finalize deals, and leave transparent reviews to build trust.", icon: "🤝" },
  ];

  return (
    <div className="relative w-full flex flex-col font-sans overflow-x-hidden">

      {/* ── HERO SECTION ─────────────────────────────────── */}
      <div
        className="relative min-h-screen flex flex-col pt-[60px] sm:pt-[72px]"
        style={{ backgroundImage: "url('/bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/70 to-white/90 z-0" />
        <Navbar />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-10 sm:py-20">
          <div className="flex items-center gap-2 bg-[#3a7bd5]/10 border border-[#3a7bd5]/20 text-[#3a7bd5] text-xs sm:text-sm font-semibold px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
            The Premier AI-Powered Seafood Marketplace
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#1a2a3a] mb-4 leading-tight max-w-3xl">
            Buy & Sell Seafood with
            <span className="block bg-gradient-to-r from-[#3a7bd5] to-[#00d2ff] bg-clip-text text-transparent">
              AI Freshness & Total Confidence
            </span>
          </h1>

          <p className="text-[#3a4a5a] text-sm sm:text-base md:text-lg lg:text-xl max-w-2xl mx-auto mb-6 sm:mb-10 leading-relaxed px-2">
            FreshWay connects buyers and sellers in a transparent marketplace. We use AI to instantly verify fish freshness, ensuring you get the highest quality seafood every time.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-14 w-full max-w-md sm:max-w-none px-2">
            <button
              onClick={handleGetStarted}
              className="group flex items-center justify-center gap-2 bg-gradient-to-r from-[#3a7bd5] to-[#00d2ff] text-white font-bold px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl shadow-lg hover:shadow-[#3a7bd5]/40 hover:scale-105 transition-all text-sm sm:text-base"
            >
              Get Started Free
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <Link
              href="/how-it-works"
              className="flex items-center justify-center gap-2 bg-white/90 text-[#1a2a3a] font-semibold px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl border border-slate-200 shadow-sm hover:bg-white hover:border-[#3a7bd5] transition-all text-sm sm:text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
              </svg>
              See How It Works
            </Link>
          </div>

          {/* Floating demo card */}
          <div className="w-full max-w-[320px] sm:max-w-sm mx-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 p-4 sm:p-5 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3a7bd5] to-[#00d2ff] flex items-center justify-center shadow">
                <span className="text-lg">🐟</span>
              </div>
              <div>
                <p className="font-bold text-[#1a2a3a] text-sm">Freshness Analysis</p>
                <p className="text-xs text-[#9ca3af]">Just now</p>
              </div>
              <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                Highly Fresh
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Highly Fresh", pct: 91, color: "from-emerald-400 to-green-500" },
                { label: "Fresh", pct: 7, color: "from-blue-400 to-cyan-400" },
                { label: "Not Fresh", pct: 2, color: "from-red-400 to-orange-400" },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#3a4a5a] font-medium">{bar.label}</span>
                    <span className="font-bold text-[#1a2a3a]">{bar.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${bar.color}`}
                      style={{ width: `${bar.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-[#9ca3af]">Market Route</span>
              <span className="text-xs font-bold text-[#3a7bd5] bg-blue-50 px-2.5 py-1 rounded-full">
                🏪 Premium Export Market
              </span>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="relative z-10 flex justify-center pb-6 animate-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#1a2a3a] to-[#3a7bd5] py-10 sm:py-14 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
          <StatItem value={500} suffix="+" label="Active Buyers & Sellers" />
          <StatItem value={95} suffix="%" label="AI Accuracy" />
          <StatItem value={100} suffix="K+" label="Deals Closed" />
          <StatItem value={4.9} suffix="/5" label="Average Rating" />
        </div>
      </div>

      {/* ── FEATURES SECTION ──────────────────────────────── */}
      <div className="bg-white py-12 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#3a7bd5]/10 text-[#3a7bd5] text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
              Features
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1a2a3a] mb-3">Everything You Need</h2>
            <p className="text-[#3a4a5a] max-w-lg mx-auto">
              From discovering top-quality seafood to managing deals and ensuring freshness — FreshWay has you covered.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((f) => (
              <div key={f.title} className={`${f.bg} rounded-2xl p-6 border border-white/80 shadow-sm hover:shadow-md transition-shadow group`}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-xl shadow-md mb-4 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-[#1a2a3a] text-lg mb-2">{f.title}</h3>
                <p className="text-[#3a4a5a] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS SECTION ──────────────────────────── */}
      <div
        className="relative py-12 sm:py-20 px-4"
        style={{ backgroundImage: "url('/bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-white/88" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#3a7bd5]/10 text-[#3a7bd5] text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
              The Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2a3a]">Three Simple Steps</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
            {/* Connector line (desktop) */}
            <div className="hidden sm:block absolute top-10 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-[#3a7bd5] to-[#11998e] z-0" />
            {steps.map((step, i) => (
              <div key={step.num} className="relative z-10 bg-white/95 backdrop-blur rounded-2xl p-6 shadow-md border border-white/60 text-center hover:-translate-y-1 transition-transform">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3a7bd5] to-[#00d2ff] flex flex-col items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-2xl">{step.icon}</span>
                </div>
                <span className="text-xs font-bold text-[#9ca3af] tracking-widest">{step.num}</span>
                <h3 className="font-bold text-[#1a2a3a] text-base mt-1 mb-2">{step.title}</h3>
                <p className="text-xs text-[#3a4a5a] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 text-[#3a7bd5] font-semibold text-sm hover:underline"
            >
              Read the full explanation
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Link>
          </div>
        </div>
      </div>

      {/* ── DASHBOARD PREVIEW SECTION ─────────────────────── */}
      <div className="bg-white py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block bg-[#3a7bd5]/10 text-[#3a7bd5] text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
              Roles
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2a3a]">Built for Everyone</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="rounded-2xl border p-8 bg-blue-50 border-blue-100 relative overflow-hidden">
              <span className="text-4xl sm:text-5xl block mb-3 sm:mb-4">🛒</span>
              <h3 className="font-bold text-2xl mb-2 text-blue-900">For Buyers</h3>
              <p className="text-sm text-blue-800/80 mb-6 leading-relaxed">
                Browse a diverse marketplace of fresh catches. Filter by fish type, view AI-verified freshness scores, chat with sellers, and leave reviews after successful purchases.
              </p>
              <ul className="space-y-2 text-sm text-blue-900 font-medium">
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Real-time Marketplace</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> AI Quality Proofs</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Integrated Chat</li>
              </ul>
            </div>
            
            <div className="rounded-2xl border p-8 bg-emerald-50 border-emerald-100 relative overflow-hidden">
              <span className="text-4xl sm:text-5xl block mb-3 sm:mb-4">🎣</span>
              <h3 className="font-bold text-2xl mb-2 text-emerald-900">For Sellers</h3>
              <p className="text-sm text-emerald-800/80 mb-6 leading-relaxed">
                Reach a wider audience of trusted buyers. Create listings with photos, use our AI tool to prove freshness, manage incoming inquiries, and build your reputation.
              </p>
              <ul className="space-y-2 text-sm text-emerald-900 font-medium">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Easy Listing Management</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Deal Tracking</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Rating & Feedback System</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA SECTION ───────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#1a2a3a] to-[#3a7bd5] py-12 sm:py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="text-5xl block mb-6">🐠</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start?
          </h2>
          <p className="text-white/75 text-base sm:text-lg mb-8 leading-relaxed">
            Join the fastest-growing seafood marketplace. Connect with buyers and sellers, ensure quality, and grow your business with FreshWay.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-3 bg-white text-[#1a2a3a] font-bold px-10 py-4 rounded-xl shadow-xl hover:scale-105 hover:shadow-white/20 transition-all text-lg"
          >
            {session ? "Open Dashboard" : "Get Started Now"}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="bg-[#0d1b2a] text-white/60 py-6 sm:py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="FreshWay" className="h-8 opacity-80" />
            <span className="font-semibold text-white/80">FreshWay</span>
          </div>
          <div className="flex gap-4 sm:gap-6">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
          <p>© 2026 FreshWay. Built with ❤️ in Mangalore.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
