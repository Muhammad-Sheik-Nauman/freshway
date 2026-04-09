import React from "react";
import Navbar from "@/components/Navbar";

const team = [
  {
    name: "Nauman Sheikh",
    role: "AI & Backend Engineer",
    avatar: "NS",
    color: "from-[#3a7bd5] to-[#00d2ff]",
    bio: "Built the MobileNetV2-based fish freshness classification model and Flask API.",
  },
  {
    name: "Project Lead",
    role: "Frontend & UX",
    avatar: "PL",
    color: "from-[#11998e] to-[#38ef7d]",
    bio: "Designed the Next.js frontend, dashboard, and supply chain management views.",
  },
  {
    name: "Supply Chain Head",
    role: "Domain Expert",
    avatar: "SC",
    color: "from-purple-500 to-pink-500",
    bio: "Provided domain knowledge on Mangalore's fish supply chain and market routes.",
  },
];

const values = [
  { icon: "🧠", title: "AI-Driven", desc: "We use deep learning to accurately classify fish freshness, eliminating guesswork from quality control." },
  { icon: "🌊", title: "Sustainable", desc: "By reducing fish waste through better freshness detection, we contribute to a more sustainable seafood industry." },
  { icon: "⚡", title: "Real-Time", desc: "Instant analysis results in seconds, empowering buyers and sellers to make fast, confident decisions." },
  { icon: "🤝", title: "Trustworthy", desc: "Built on transparency — every prediction comes with confidence scores so you always know how certain we are." },
];

export default function AboutPage() {
  return (
    <main
      className="relative min-h-screen w-full flex flex-col font-sans"
      style={{ backgroundImage: "url('/bg.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
    >
      <div className="absolute inset-0 bg-white/78 z-0" />
      <Navbar />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-8 py-12 mt-[72px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          <a href="/" className="text-[#3a7bd5] hover:underline font-medium">Home</a>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          <span className="text-[#9ca3af] font-medium">About</span>
        </div>

        {/* Hero */}
        <div className="text-center mb-16">
          <span className="inline-block bg-[#3a7bd5]/10 text-[#3a7bd5] text-sm font-semibold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wide">
            About FreshWay
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#1a2a3a] mb-4 leading-tight">
            Smarter Fish. <br className="sm:hidden" /> Fresher Markets.
          </h1>
          <p className="text-[#3a4a5a] text-lg max-w-2xl mx-auto leading-relaxed">
            FreshWay is an AI-powered fish freshness detection and supply chain management platform built to modernize Mangalore's seafood industry — from the boat to the buyer.
          </p>
        </div>

        {/* Mission Card */}
        <div className="bg-gradient-to-br from-[#1a2a3a] to-[#3a7bd5] text-white rounded-3xl p-8 sm:p-12 mb-12 shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-3">Our Mission</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Eliminating fish waste through intelligent quality control.</h2>
          <p className="text-white/80 text-base leading-relaxed max-w-3xl">
            Every year, thousands of kilograms of fish are discarded or sold below value due to a lack of reliable freshness assessment tools. FreshWay bridges this gap by putting the power of AI directly into the hands of fish market workers, supply chain managers, and quality inspectors — no laboratory required.
          </p>
        </div>

        {/* Values */}
        <div className="mb-14">
          <h2 className="text-2xl font-bold text-[#1a2a3a] mb-6 text-center">What We Stand For</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {values.map((v) => (
              <div key={v.title} className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-md border border-white/50 flex gap-4">
                <span className="text-3xl">{v.icon}</span>
                <div>
                  <h3 className="font-bold text-[#1a2a3a] mb-1">{v.title}</h3>
                  <p className="text-sm text-[#3a4a5a] leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-[#1a2a3a] mb-6 text-center">The Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {team.map((member) => (
              <div key={member.name} className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-md border border-white/50 text-center">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${member.color} text-white font-bold text-lg flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  {member.avatar}
                </div>
                <h3 className="font-bold text-[#1a2a3a]">{member.name}</h3>
                <p className="text-xs text-[#3a7bd5] font-semibold mb-2">{member.role}</p>
                <p className="text-sm text-[#3a4a5a] leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-md border border-white/50 p-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: "95%+", label: "Model Accuracy" },
            { value: "3s", label: "Avg Analysis Time" },
            { value: "3", label: "Freshness Classes" },
            { value: "100%", label: "Open Source" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-[#3a7bd5]">{s.value}</p>
              <p className="text-xs text-[#3a4a5a] font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
