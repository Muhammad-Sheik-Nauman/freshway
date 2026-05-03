import React from "react";
import Navbar from "@/components/Navbar";

const steps = [
  {
    number: "01",
    title: "Create an Account",
    desc: "Sign up and choose your role. Buyers can browse listings and make purchases, while Sellers can post their catches and manage inventory.",
    icon: "👤",
    color: "from-[#3a7bd5] to-[#00d2ff]",
    tip: "You can set up your profile with your location to see the most relevant deals near you.",
  },
  {
    number: "02",
    title: "List or Browse Seafood",
    desc: "Sellers list their catches with photos and details. Buyers can browse the real-time marketplace, filtering by fish type, price, and location.",
    icon: "🛒",
    color: "from-purple-500 to-pink-500",
    tip: "Our marketplace updates in real-time, so you always see the latest catches.",
  },
  {
    number: "03",
    title: "AI Freshness Verification",
    desc: "When listing a catch, sellers upload a photo of the fish eye. Our MobileNetV2 AI instantly analyzes it and attaches a verified freshness score to the listing.",
    icon: "🧠",
    color: "from-[#11998e] to-[#38ef7d]",
    tip: "Buyers can trust the AI score to ensure they are getting exactly what they pay for.",
  },
  {
    number: "04",
    title: "Secure Deals & Leave Reviews",
    desc: "Use our integrated chat to negotiate. Once a deal is complete, buyers can leave a star rating and review to build the seller's reputation in the community.",
    icon: "🤝",
    color: "from-orange-400 to-red-500",
    tip: "Higher rated sellers get more visibility on the marketplace homepage.",
  },
];

const techStack = [
  { name: "Next.js 15", role: "Frontend & API Routes", icon: "⚛️" },
  { name: "MongoDB", role: "Database & Marketplace", icon: "🍃" },
  { name: "MobileNetV2", role: "Core AI Model", icon: "🤖" },
  { name: "TensorFlow", role: "Model Inference", icon: "⚡" },
  { name: "NextAuth", role: "Authentication", icon: "🔐" },
  { name: "Flask", role: "AI Backend", icon: "🐍" },
];

export default function HowItWorksPage() {
  return (
    <main
      className="relative min-h-screen w-full flex flex-col font-sans"
      style={{ backgroundImage: "url('/bg.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
    >
      <div className="absolute inset-0 bg-white/78 z-0" />
      <Navbar />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12 mt-[60px] sm:mt-[72px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          <a href="/" className="text-[#3a7bd5] hover:underline font-medium">Home</a>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          <span className="text-[#9ca3af] font-medium">How It Works</span>
        </div>

        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block bg-[#3a7bd5]/10 text-[#3a7bd5] text-sm font-semibold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wide">
            The Process
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1a2a3a] mb-4">How It Works</h1>
          <p className="text-[#3a4a5a] text-lg max-w-xl mx-auto">
            From signing up to closing your first deal — see how FreshWay connects the seafood community.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mb-14">
          {/* Vertical connector line */}
          <div className="absolute left-8 top-10 bottom-10 w-0.5 bg-gradient-to-b from-[#3a7bd5] via-purple-400 via-[#11998e] to-orange-400 hidden sm:block" />

          <div className="space-y-8">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex gap-4 sm:gap-6 items-start">
                {/* Number circle */}
                <div className={`relative flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${step.color} text-white font-bold text-base sm:text-lg flex items-center justify-center shadow-lg z-10`}>
                  {step.icon}
                  <span className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br ${step.color} text-white text-xs font-bold flex items-center justify-center shadow border-2 border-white`}>
                    {idx + 1}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white/90 backdrop-blur rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md border border-white/50">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-[#9ca3af] tracking-widest">{step.number}</span>
                    <h2 className="text-lg font-bold text-[#1a2a3a]">{step.title}</h2>
                  </div>
                  <p className="text-sm text-[#3a4a5a] leading-relaxed mb-3">{step.desc}</p>
                  <div className="flex items-start gap-2 bg-blue-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
                    <span className="text-base">💡</span>
                    <p className="text-xs text-[#3a7bd5] font-medium leading-relaxed">{step.tip}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Freshness Classes */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-[#1a2a3a] mb-6 text-center">Freshness Classes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Highly Fresh", icon: "🟢", color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", desc: "Fish is very fresh, caught within 24–48 hours. Suitable for premium markets and export." },
              { label: "Fresh", icon: "🔵", color: "bg-blue-50 border-blue-200", text: "text-blue-700", desc: "Fish is acceptably fresh. Suitable for local market sale within the same day." },
              { label: "Not Fresh", icon: "🔴", color: "bg-red-50 border-red-200", text: "text-red-700", desc: "Fish is past its prime. Should not be sold for consumption. Consider disposal or non-food use." },
            ].map((c) => (
              <div key={c.label} className={`rounded-2xl border p-5 ${c.color}`}>
                <span className="text-3xl block mb-2">{c.icon}</span>
                <h3 className={`font-bold mb-1 ${c.text}`}>{c.label}</h3>
                <p className="text-xs text-[#3a4a5a] leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div>
          <h2 className="text-2xl font-bold text-[#1a2a3a] mb-6 text-center">Technology Stack</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {techStack.map((tech) => (
              <div key={tech.name} className="bg-white/90 backdrop-blur rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-md border border-white/50 flex items-center gap-2 sm:gap-3">
                <span className="text-xl sm:text-2xl">{tech.icon}</span>
                <div>
                  <p className="font-bold text-[#1a2a3a] text-xs sm:text-sm">{tech.name}</p>
                  <p className="text-[10px] sm:text-xs text-[#3a4a5a]">{tech.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
