"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./Navbar";
import Link from "next/link";

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

  const features = [
    {
      icon: "📷",
      title: "Capture & Analyze",
      desc: "Take a photo of the fish eye with any camera. Our AI delivers results in under 3 seconds.",
      color: "from-[#3a7bd5] to-[#00d2ff]",
      bg: "bg-blue-50",
    },
    {
      icon: "🧠",
      title: "AI-Powered Detection",
      desc: "MobileNetV2 deep learning model trained on thousands of real fish samples with 95%+ accuracy.",
      color: "from-purple-500 to-pink-400",
      bg: "bg-purple-50",
    },
    {
      icon: "🚚",
      title: "Supply Chain Ready",
      desc: "Manage seller contracts, track distances, prices, and delivery history all in one place.",
      color: "from-[#11998e] to-[#38ef7d]",
      bg: "bg-emerald-50",
    },
    {
      icon: "📊",
      title: "Detailed Reports",
      desc: "Get confidence scores, market route recommendations, and per-class freshness breakdowns.",
      color: "from-orange-400 to-red-400",
      bg: "bg-orange-50",
    },
  ];

  const steps = [
    { num: "01", title: "Upload a Photo", desc: "Take or upload a close-up photo of the fish eye using your device.", icon: "📸" },
    { num: "02", title: "AI Analyzes It", desc: "Our MobileNetV2 model processes the image in seconds.", icon: "⚡" },
    { num: "03", title: "Get Your Result", desc: "Instantly see freshness status, confidence score & market route.", icon: "✅" },
  ];

  return (
    <div className="relative w-full flex flex-col font-sans overflow-x-hidden">

      {/* ── HERO SECTION ─────────────────────────────────── */}
      <div
        className="relative min-h-screen flex flex-col pt-[72px]"
        style={{ backgroundImage: "url('/bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/70 to-white/90 z-0" />
        <Navbar />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
          {/* Label pill */}
          <div className="flex items-center gap-2 bg-[#3a7bd5]/10 border border-[#3a7bd5]/20 text-[#3a7bd5] text-xs sm:text-sm font-semibold px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
            AI Model Live — Real-time Fish Freshness Detection
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#1a2a3a] mb-4 leading-tight max-w-3xl">
            Know If Your Fish Is
            <span className="block bg-gradient-to-r from-[#3a7bd5] to-[#00d2ff] bg-clip-text text-transparent">
              Fresh in Seconds
            </span>
          </h1>

          <p className="text-[#3a4a5a] text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            FreshWay uses deep learning to instantly assess fish freshness from a single photo — eliminating guesswork and reducing waste across Mangalore's seafood supply chain.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <button
              onClick={() => router.push("/dashboard")}
              className="group flex items-center justify-center gap-2 bg-gradient-to-r from-[#3a7bd5] to-[#00d2ff] text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-[#3a7bd5]/40 hover:scale-105 transition-all text-base"
            >
              Get Started Free
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <Link
              href="/how-it-works"
              className="flex items-center justify-center gap-2 bg-white/90 text-[#1a2a3a] font-semibold px-8 py-4 rounded-xl border border-slate-200 shadow-sm hover:bg-white hover:border-[#3a7bd5] transition-all text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
              </svg>
              See How It Works
            </Link>
          </div>

          {/* Floating demo card */}
          <div className="w-full max-w-sm mx-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 p-5 text-left">
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

      {/* ── STATS SECTION ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#1a2a3a] to-[#3a7bd5] py-14 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          <StatItem value={95} suffix="%" label="Model Accuracy" />
          <StatItem value={3} suffix="s" label="Avg. Analysis Time" />
          <StatItem value={3} suffix="" label="Freshness Classes" />
          <StatItem value={100} suffix="%" label="Open Source" />
        </div>
      </div>

      {/* ── FEATURES SECTION ──────────────────────────────── */}
      <div className="bg-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#3a7bd5]/10 text-[#3a7bd5] text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2a3a] mb-3">Everything You Need</h2>
            <p className="text-[#3a4a5a] max-w-lg mx-auto">
              From instant AI analysis to full supply chain management — FreshWay covers it all.
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
        className="relative py-20 px-4"
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

      {/* ── FRESHNESS CLASSES SECTION ─────────────────────── */}
      <div className="bg-white py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block bg-[#3a7bd5]/10 text-[#3a7bd5] text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
              Results
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2a3a]">What You'll Get</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: "🟢", label: "Highly Fresh", sub: "Caught within 24–48 hrs", market: "Premium Export Market", bg: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-50 border-emerald-100" },
              { icon: "🔵", label: "Fresh", sub: "Suitable for local market", market: "Local Fish Market", bg: "bg-blue-500", text: "text-blue-700", light: "bg-blue-50 border-blue-100" },
              { icon: "🔴", label: "Not Fresh", sub: "Not for consumption", market: "Discard / Non-food use", bg: "bg-red-500", text: "text-red-700", light: "bg-red-50 border-red-100" },
            ].map((c) => (
              <div key={c.label} className={`rounded-2xl border p-6 ${c.light} text-center`}>
                <span className="text-4xl block mb-3">{c.icon}</span>
                <h3 className={`font-bold text-lg mb-1 ${c.text}`}>{c.label}</h3>
                <p className="text-xs text-[#3a4a5a] mb-4">{c.sub}</p>
                <div className={`${c.text} text-xs font-semibold bg-white/80 rounded-xl px-3 py-2 border`}>
                  🏪 {c.market}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA SECTION ───────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#1a2a3a] to-[#3a7bd5] py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="text-5xl block mb-6">🐠</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Start?
          </h2>
          <p className="text-white/75 text-base sm:text-lg mb-8 leading-relaxed">
            Join the future of fish quality control. No subscription, no lab equipment — just your camera and FreshWay.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-3 bg-white text-[#1a2a3a] font-bold px-10 py-4 rounded-xl shadow-xl hover:scale-105 hover:shadow-white/20 transition-all text-lg"
          >
            Open Dashboard
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="bg-[#0d1b2a] text-white/60 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="FreshWay" className="h-8 opacity-80" />
            <span className="font-semibold text-white/80">FreshWay</span>
          </div>
          <div className="flex gap-6">
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
