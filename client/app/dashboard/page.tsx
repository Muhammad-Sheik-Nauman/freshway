"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

const dashboardItems = [
  {
    id: "check-freshness",
    title: "Check Freshness",
    description: "Capture or upload a fish eye photo to instantly assess freshness using AI.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
    gradient: "from-[#3a7bd5] to-[#00d2ff]",
    shadowColor: "shadow-[#3a7bd5]/30",
    href: "/capture-img",
    badge: "AI Powered",
  },
  {
    id: "supply-chain",
    title: "Supply Chain",
    description: "Track and manage the fish supply chain from source to market efficiently.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    gradient: "from-[#11998e] to-[#38ef7d]",
    shadowColor: "shadow-[#11998e]/30",
    href: "/supply-chain",
    badge: "Live",
  },
];

export default function DashboardPage() {
  const router = useRouter();

  return (
    <main
      className="relative min-h-screen w-full flex flex-col items-center justify-start font-sans"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-white/75 z-0" />

      <Navbar />

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl px-4 sm:px-8 py-12 flex flex-col items-center mt-[72px]">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block bg-[#3a7bd5]/10 text-[#3a7bd5] text-sm font-semibold px-4 py-1.5 rounded-full mb-4 tracking-wide uppercase">
            Dashboard
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1a2a3a] mb-3 leading-tight">
            What would you like to do?
          </h1>
          <p className="text-[#3a4a5a] text-base sm:text-lg max-w-lg mx-auto">
            Select an option below to get started with FreshWay.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
          {dashboardItems.map((item) => (
            <button
              key={item.id}
              id={item.id}
              onClick={() => {
                if (item.href !== "#") router.push(item.href);
              }}
              className={`group relative flex flex-col items-start text-left bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl ${item.shadowColor} p-8 border border-white/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer overflow-hidden`}
            >
              {/* Gradient top bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient} rounded-t-2xl`} />

              {/* Badge */}
              <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-6 text-white bg-gradient-to-r ${item.gradient}`}>
                {item.badge}
              </span>

              {/* Icon */}
              <div className={`flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {item.icon}
              </div>

              {/* Text */}
              <h2 className="text-xl font-bold text-[#1a2a3a] mb-2">{item.title}</h2>
              <p className="text-sm text-[#3a4a5a] leading-relaxed">{item.description}</p>

              {/* Arrow */}
              <div className={`mt-6 flex items-center gap-2 font-semibold text-sm bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent group-hover:gap-3 transition-all duration-300`}>
                {item.href === "#" ? "Stay Tuned" : "Get Started"}
                {item.href !== "#" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#arrowGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <defs>
                      <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3a7bd5" />
                        <stop offset="100%" stopColor="#00d2ff" />
                      </linearGradient>
                    </defs>
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Bottom info bar */}
        <div className="mt-16 flex flex-col sm:flex-row gap-4 sm:gap-10 items-center justify-center text-sm text-[#3a4a5a]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            AI Model Online
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3a7bd5] inline-block"></span>
            Real-time Analysis
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            Supply Chain — Live
          </div>
        </div>
      </div>
    </main>
  );
}
