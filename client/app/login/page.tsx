"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    location: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    alert("Signup successful with credentials!");
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0d1b2a]/60"
      style={{ backgroundImage: "url('/bg.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundBlendMode: "overlay" }}
    >
      <div className="relative z-10 w-full max-w-[400px] bg-white rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8">
        
        {/* Back Link & Logo */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="flex items-center gap-1 text-slate-400 hover:text-[#3a7bd5] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            <span className="font-bold text-[10px] uppercase tracking-wider">Back</span>
          </Link>
          <img src="/logo.png" alt="FreshWay Logo" className="h-6 opacity-80" />
        </div>

        <div className="text-center mb-5">
          <h2 className="text-2xl font-extrabold text-[#1a2a3a]">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-sm text-[#3a4a5a] mt-1">
            {isSignUp ? "Join FreshWay as a buyer or seller" : "Sign in to continue"}
          </p>
        </div>

        {/* Google Btn — redirects to select-role for new users */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/select-role" })}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all mb-5 group shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="font-bold text-slate-700 text-sm">Continue with Google</span>
        </button>

        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute w-full border-t border-slate-100"></div>
          <span className="bg-white px-2 text-[10px] uppercase text-slate-400 relative z-10 font-bold tracking-widest">or email</span>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp && (
            <>
              <input
                type="text"
                name="fullName"
                required
                placeholder="Full Name"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/20 focus:border-[#3a7bd5] text-sm text-slate-800"
              />
              <input
                type="text"
                name="location"
                placeholder="Location (e.g. Mangalore)"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/20 focus:border-[#3a7bd5] text-sm text-slate-800"
              />
            </>
          )}

          <input
            type="email"
            name="email"
            required
            placeholder="Email address"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/20 focus:border-[#3a7bd5] text-sm text-slate-800"
          />

          <input
            type="password"
            name="password"
            required
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/20 focus:border-[#3a7bd5] text-sm text-slate-800"
          />

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-[#1a2a3a] to-[#3a7bd5] text-white font-bold rounded-lg shadow-md hover:shadow-lg hover:-translate-y-px transition-all mt-2"
          >
            {isSignUp ? "Sign Up" : "Log In"}
          </button>
        </form>

        <div className="mt-5 text-center text-xs font-medium border-t border-slate-50 pt-4">
          <span className="text-slate-500">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
          </span>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-1.5 font-bold text-[#3a7bd5] hover:underline"
          >
            {isSignUp ? "Log In" : "Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
