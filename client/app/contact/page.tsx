"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder — wire up to a real backend or email service later
    setSubmitted(true);
  };

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
          <span className="text-[#9ca3af] font-medium">Contact</span>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block bg-[#3a7bd5]/10 text-[#3a7bd5] text-sm font-semibold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wide">
            Get In Touch
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#1a2a3a] mb-3">Contact Us</h1>
          <p className="text-[#3a4a5a] text-lg max-w-xl mx-auto">
            Have questions, feedback, or want to partner with FreshWay? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Contact Details Column ── */}
          <div className="lg:col-span-2 space-y-5">
            {[
              {
                icon: "📧",
                label: "Email",
                value: "hello@freshway.in",
                sub: "We reply within 24 hours",
                color: "bg-blue-50",
              },
              {
                icon: "📞",
                label: "Phone",
                value: "+91 98765 00000",
                sub: "Mon–Sat, 9 AM – 6 PM IST",
                color: "bg-emerald-50",
              },
              {
                icon: "📍",
                label: "Location",
                value: "Kochi, Mangalore, India",
                sub: "Mangalore Fish Technology Hub",
                color: "bg-purple-50",
              },
              {
                icon: "🐙",
                label: "GitHub",
                value: "github.com/freshway",
                sub: "Open source project",
                color: "bg-amber-50",
              },
            ].map((info) => (
              <div key={info.label} className={`${info.color} rounded-2xl p-5 border border-white/60 shadow-sm flex items-start gap-4`}>
                <span className="text-2xl">{info.icon}</span>
                <div>
                  <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider mb-0.5">{info.label}</p>
                  <p className="font-semibold text-[#1a2a3a] text-sm">{info.value}</p>
                  <p className="text-xs text-[#3a4a5a] mt-0.5">{info.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Contact Form Column ── */}
          <div className="lg:col-span-3 bg-white/90 backdrop-blur rounded-3xl shadow-xl border border-white/50 p-8">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl mb-5 shadow-inner">
                  ✅
                </div>
                <h2 className="text-2xl font-bold text-[#1a2a3a] mb-2">Message Sent!</h2>
                <p className="text-[#3a4a5a] max-w-xs">
                  Thanks for reaching out. We'll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  className="mt-6 px-6 py-2.5 bg-[#1a2a3a] text-white rounded-xl font-semibold text-sm hover:bg-[#0d1b2a] transition-colors"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-[#1a2a3a] mb-6">Send a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5" htmlFor="contact-name">
                        Your Name
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        required
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Rajesh Kumar"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/40 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5" htmlFor="contact-email">
                        Email Address
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder="rajesh@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/40 bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5" htmlFor="contact-subject">
                      Subject
                    </label>
                    <select
                      id="contact-subject"
                      name="subject"
                      required
                      value={form.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/40 bg-slate-50 cursor-pointer"
                    >
                      <option value="" disabled>Select a topic…</option>
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Technical Support">Technical Support</option>
                      <option value="Partnership">Partnership / Business</option>
                      <option value="Bug Report">Bug Report</option>
                      <option value="Feature Request">Feature Request</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5" htmlFor="contact-message">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Tell us what's on your mind…"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/40 bg-slate-50 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-[#3a7bd5] to-[#00d2ff] text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-base"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    Send Message
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
