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
  { icon: "🏪", title: "Direct Marketplace", desc: "We eliminate middlemen, connecting fishermen and sellers directly with buyers for better prices and fresher fish." },
  { icon: "🧠", title: "AI-Verified Quality", desc: "Every listing is backed by our deep learning freshness model, ensuring you know exactly what you're buying." },
  { icon: "⭐", title: "Community Trust", desc: "A robust review and rating system guarantees accountability. Good sellers are rewarded with higher visibility." },
  { icon: "🤝", title: "Seamless Deals", desc: "Integrated messaging and deal tracking make transactions smooth, transparent, and secure from start to finish." },
];

export default function AboutPage() {
  return (
    <main
      className="relative min-h-screen w-full flex flex-col font-sans"
      style={{ backgroundImage: "url('/bg.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
    >
      <div className="absolute inset-0 bg-white/78 z-0" />
      <Navbar />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 mt-[60px] sm:mt-[72px]">
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1a2a3a] mb-4 leading-tight">
            Smarter Fish. <br className="sm:hidden" /> Connected Markets.
          </h1>
          <p className="text-[#3a4a5a] text-lg max-w-2xl mx-auto leading-relaxed">
            FreshWay is an AI-powered seafood marketplace built to modernize Mangalore's seafood industry. We connect verified sellers with buyers directly, using deep learning to guarantee freshness at every step.
          </p>
        </div>

        <div className="bg-gradient-to-br from-[#1a2a3a] to-[#3a7bd5] text-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 mb-12 shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-3">Our Mission</p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4">Empowering a transparent and efficient seafood ecosystem.</h2>
          <p className="text-white/80 text-base leading-relaxed max-w-3xl">
            For too long, the seafood supply chain has been opaque, leading to unfair pricing and fish waste. FreshWay bridges this gap by providing a direct marketplace for buyers and sellers, powered by AI freshness detection and a trustworthy review system to ensure everyone gets a fair deal.
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
            { value: "500+", label: "Active Users" },
            { value: "95%+", label: "AI Accuracy" },
            { value: "100K+", label: "Deals Closed" },
            { value: "4.9/5", label: "Avg Rating" },
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
