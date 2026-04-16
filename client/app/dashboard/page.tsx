"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";

interface Conversation {
  partnerEmail: string;
  partnerName: string;
  partnerImage?: string;
  partnerBusiness?: string;
  partnerRole?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  _id: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  content: string;
  createdAt: string;
}

interface Deal {
  _id: string;
  buyerEmail: string;
  buyerName: string;
  sellerEmail: string;
  sellerName: string;
  fishType: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  deliveryDate: string;
  deliveryLocation: string;
  notes: string;
  status: string;
  createdAt: string;
}

type Tab = "tools" | "messages" | "deals";

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
    title: "Market Network",
    description: "Browse and connect with registered buyers and track market demand.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
    gradient: "from-[#11998e] to-[#38ef7d]",
    shadowColor: "shadow-[#11998e]/30",
    href: "/supply-chain",
    badge: "Live",
  },
];

const dealStatusStyle: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-400" },
  accepted: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-400" },
  completed: { bg: "bg-blue-100", text: "text-blue-600", dot: "bg-blue-500" },
  cancelled: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" },
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("tools");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const convPollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchConversations();
    fetchDeals();

    // Real-time polling for conversations every 3s
    convPollingRef.current = setInterval(() => {
      fetchConversations();
      fetchDeals();
    }, 3000);

    return () => {
      if (convPollingRef.current) clearInterval(convPollingRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) setConversations(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchDeals = async () => {
    try {
      const res = await fetch("/api/deals");
      if (res.ok) setDeals(await res.json());
    } catch (err) { console.error(err); }
  };

  const openChat = async (email: string) => {
    setActiveChat(email);
    if (pollingRef.current) clearInterval(pollingRef.current);
    await fetchChatMessages(email);
    pollingRef.current = setInterval(() => fetchChatMessages(email), 2000);
  };

  const fetchChatMessages = async (email: string) => {
    try {
      const res = await fetch(`/api/messages?with=${email}`);
      if (res.ok) setChatMessages(await res.json());
    } catch (err) { console.error(err); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    const content = newMessage;
    setNewMessage("");

    // Optimistic update
    setChatMessages(prev => [...prev, {
      _id: "temp-" + Date.now(),
      senderEmail: session?.user?.email || "",
      senderName: session?.user?.name || "",
      recipientEmail: activeChat,
      content,
      createdAt: new Date().toISOString(),
    }]);

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: activeChat, content }),
      });
      fetchChatMessages(activeChat);
      fetchConversations();
    } catch (err) { console.error(err); }
  };

  const updateDealStatus = async (dealId: string, status: string) => {
    try {
      await fetch("/api/deals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, status }),
      });
      fetchDeals();
    } catch (err) { console.error(err); }
  };

  const totalUnread = conversations.reduce((a, c) => a + c.unreadCount, 0);
  const pendingDeals = deals.filter(d => d.status === "pending").length;

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
      <div className="absolute top-0 left-0 w-full h-full bg-white/75 z-0" />
      <Navbar />

      <div className="relative z-10 w-full max-w-6xl px-4 sm:px-8 py-10 mt-[72px]">
        {/* Header */}
        <div className="mb-6">
          <span className="inline-block bg-[#11998e]/10 text-[#11998e] text-xs font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wider">
            Seller Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1a2a3a]">
            Welcome, {session?.user?.name?.split(" ")[0] || "Seller"} 👋
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-white/80 backdrop-blur rounded-2xl p-1.5 shadow-sm border border-slate-200/80 mb-6 overflow-x-auto">
          {([
            { id: "tools" as Tab, label: "My Tools", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
            { id: "messages" as Tab, label: "Messages", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
            { id: "deals" as Tab, label: "Buyer Requests", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[#11998e] to-[#38ef7d] text-white shadow-md"
                  : "text-[#3a4a5a] hover:bg-slate-100"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "messages" && totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">{totalUnread}</span>
              )}
              {tab.id === "deals" && pendingDeals > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{pendingDeals}</span>
              )}
            </button>
          ))}
        </div>

        {/* ══ TAB: TOOLS ══ */}
        {activeTab === "tools" && (
          <div style={{ animation: "fadeIn 0.3s ease-out" }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {dashboardItems.map((item) => (
                <button
                  key={item.id}
                  id={item.id}
                  onClick={() => router.push(item.href)}
                  className={`group relative flex flex-col items-start text-left bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl ${item.shadowColor} p-8 border border-white/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer overflow-hidden`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient} rounded-t-2xl`} />
                  <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-6 text-white bg-gradient-to-r ${item.gradient}`}>{item.badge}</span>
                  <div className={`flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>{item.icon}</div>
                  <h2 className="text-xl font-bold text-[#1a2a3a] mb-2">{item.title}</h2>
                  <p className="text-sm text-[#3a4a5a] leading-relaxed">{item.description}</p>
                  <div className={`mt-6 flex items-center gap-2 font-semibold text-sm bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent group-hover:gap-3 transition-all duration-300`}>
                    Get Started
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#ag)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <defs><linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#3a7bd5" /><stop offset="100%" stopColor="#00d2ff" /></linearGradient></defs>
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            {/* Status bar */}
            <div className="mt-12 flex flex-col sm:flex-row gap-4 sm:gap-10 items-center justify-center text-sm text-[#3a4a5a]">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> AI Model Online</div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#3a7bd5] inline-block"></span> Real-time Analysis</div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> {totalUnread > 0 ? `${totalUnread} unread messages` : "No new messages"}</div>
            </div>
          </div>
        )}

        {/* ══ TAB: MESSAGES ══ */}
        {activeTab === "messages" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[500px]" style={{ animation: "fadeIn 0.3s ease-out" }}>
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-md border border-white/50 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-[#1a2a3a] text-sm">Buyer Messages</h3>
                <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live
                </span>
              </div>
              <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-[#9ca3af]">
                    <p className="text-3xl mb-2">💬</p>
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs mt-1">Buyers will message you here</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button key={conv.partnerEmail} onClick={() => openChat(conv.partnerEmail)}
                      className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${activeChat === conv.partnerEmail ? "bg-[#11998e]/5 border-l-4 border-[#11998e]" : ""}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#11998e] to-[#38ef7d] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {conv.partnerName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-[#1a2a3a] truncate">{conv.partnerName}</span>
                            {conv.unreadCount > 0 && (
                              <span className="w-5 h-5 bg-[#11998e] text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 animate-pulse">{conv.unreadCount}</span>
                            )}
                          </div>
                          <p className="text-xs text-[#9ca3af] truncate">{conv.lastMessage}</p>
                          {conv.partnerRole && <p className="text-[10px] text-[#11998e] font-medium capitalize">{conv.partnerRole}</p>}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="md:col-span-2 bg-white/90 backdrop-blur rounded-2xl shadow-md border border-white/50 flex flex-col overflow-hidden">
              {activeChat ? (
                <>
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#11998e] to-[#38ef7d] flex items-center justify-center text-white text-xs font-bold">
                        {(conversations.find(c => c.partnerEmail === activeChat)?.partnerName || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#1a2a3a]">{conversations.find(c => c.partnerEmail === activeChat)?.partnerName || activeChat}</p>
                        <p className="text-xs text-[#9ca3af]">{conversations.find(c => c.partnerEmail === activeChat)?.partnerBusiness || "Buyer"}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Real-time
                    </span>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[380px] min-h-[200px]">
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-12 text-[#9ca3af]"><p className="text-3xl mb-2">👋</p><p className="text-sm">Start the conversation!</p></div>
                    ) : (
                      chatMessages.map((msg, idx) => {
                        const isMine = msg.senderEmail === session?.user?.email;
                        return (
                          <div key={msg._id || idx} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                              isMine ? "bg-gradient-to-r from-[#11998e] to-[#38ef7d] text-white rounded-tr-md" : "bg-slate-100 text-[#1a2a3a] rounded-tl-md"
                            }`}>
                              {msg.content}
                              <div className={`text-[10px] mt-1 ${isMine ? "text-white/60" : "text-[#9ca3af]"}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="p-4 border-t border-slate-100 flex gap-2">
                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30" />
                    <button onClick={sendMessage} disabled={!newMessage.trim()}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#11998e] to-[#38ef7d] text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#9ca3af]">
                  <div className="text-center">
                    <p className="text-5xl mb-3">💬</p>
                    <p className="font-semibold text-[#1a2a3a]">Select a conversation</p>
                    <p className="text-sm mt-1">Buyer messages will appear here</p>
                    <p className="text-xs mt-3 text-emerald-500 font-medium flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Messages update in real-time
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: DEALS ══ */}
        {activeTab === "deals" && (
          <div style={{ animation: "fadeIn 0.3s ease-out" }}>
            {deals.length === 0 ? (
              <div className="bg-white/90 backdrop-blur rounded-2xl shadow-md border border-white/50 p-16 text-center">
                <p className="text-5xl mb-4">📋</p>
                <h3 className="text-xl font-bold text-[#1a2a3a] mb-2">No deal requests yet</h3>
                <p className="text-sm text-[#3a4a5a]">Buyer deal requests will appear here once they contact you.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deals.map((deal) => {
                  const st = dealStatusStyle[deal.status] || dealStatusStyle.pending;
                  const isBuyerDeal = deal.buyerEmail !== session?.user?.email;
                  return (
                    <div key={deal._id} className="bg-white/90 backdrop-blur rounded-2xl shadow-md border border-white/50 p-6 hover:shadow-lg transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#11998e] to-[#38ef7d] flex items-center justify-center text-white shadow-md shrink-0">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          </div>
                          <div>
                            <h3 className="font-bold text-[#1a2a3a]">{deal.fishType} — {deal.quantity} {deal.unit}</h3>
                            <p className="text-sm text-[#3a4a5a]">Buyer: <span className="font-semibold">{deal.buyerName}</span></p>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-[#3a4a5a]">
                              <span>💰 ₹{deal.pricePerUnit}/{deal.unit}</span>
                              <span>📦 Total: ₹{deal.totalPrice}</span>
                              {deal.deliveryDate && <span>📅 {deal.deliveryDate}</span>}
                              {deal.deliveryLocation && <span>📍 {deal.deliveryLocation}</span>}
                            </div>
                            {deal.notes && <p className="text-xs text-[#9ca3af] mt-1 italic">"{deal.notes}"</p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${st.bg} ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                            {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                          </span>
                          {deal.status === "pending" && isBuyerDeal && (
                            <>
                              <button onClick={() => updateDealStatus(deal._id, "accepted")}
                                className="text-xs font-bold text-white bg-gradient-to-r from-[#11998e] to-[#38ef7d] px-4 py-1.5 rounded-full hover:opacity-90 transition-all">
                                ✓ Accept
                              </button>
                              <button onClick={() => updateDealStatus(deal._id, "rejected")}
                                className="text-xs font-semibold text-red-500 px-3 py-1.5 rounded-full border border-red-200 hover:bg-red-50 transition-all">
                                ✕ Reject
                              </button>
                            </>
                          )}
                          {deal.status === "accepted" && isBuyerDeal && (
                            <button onClick={() => updateDealStatus(deal._id, "completed")}
                              className="text-xs font-bold text-white bg-gradient-to-r from-[#3a7bd5] to-[#00d2ff] px-4 py-1.5 rounded-full hover:opacity-90 transition-all">
                              ✓ Mark Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </main>
  );
}
