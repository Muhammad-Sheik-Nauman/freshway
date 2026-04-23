"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";

// ── Types ─────────────────────────────────────────────
interface SellerData {
  _id: string;
  name: string;
  email: string;
  image?: string;
  displayName?: string;
  phone?: string;
  location?: string;
  businessName?: string;
  businessType?: string;
  bio?: string;
  fishTypes?: string[];
  priceRange?: string;
  rating?: number;
  totalDeliveries?: number;
  profileComplete?: boolean;
}

interface FishListing {
  _id: string;
  sellerEmail: string;
  sellerName: string;
  sellerImage?: string;
  businessName: string;
  location: string;
  fishName: string;
  description: string;
  pricePerKg: number;
  availableQuantity: number;
  unit: string;
  freshness: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

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
  imageUrl?: string;
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

// ── Star Rating Component ─────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span className="text-xs font-semibold text-[#3a4a5a] ml-1">{rating}</span>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────
type Tab = "marketplace" | "messages" | "deals" | "profile";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "marketplace",
    label: "Marketplace",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "messages",
    label: "Messages",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "deals",
    label: "My Deals",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

// ═══════════════════════════════════════════════════════
// ── MAIN COMPONENT ────────────────────────────────────
// ═══════════════════════════════════════════════════════
export default function BuyerDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("marketplace");
  const [sellers, setSellers] = useState<SellerData[]>([]);
  const [sellersLoading, setSellersLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [profile, setProfile] = useState<any>(null);

  // Fish listings state
  const [fishListings, setFishListings] = useState<FishListing[]>([]);
  const [fishListingsLoading, setFishListingsLoading] = useState(true);

  // Marketplace state
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "price_low" | "price_high" | "name">("latest");
  const [selectedSeller, setSelectedSeller] = useState<SellerData | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);

  // Message state
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [messageImage, setMessageImage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const convPollingRef = useRef<NodeJS.Timeout | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 800;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        } else if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        callback(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Deal form state
  const [dealForm, setDealForm] = useState({
    fishType: "",
    quantity: "",
    pricePerUnit: "",
    deliveryLocation: "",
    notes: "",
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    phone: "",
    location: "",
    businessName: "",
    businessType: "",
    bio: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // ── Data fetching ───────────────────────────────────
  useEffect(() => {
    fetchSellers();
    fetchFishListings();
    fetchConversations();
    fetchDeals();
    fetchProfile();

    // Poll conversations every 3 seconds for real-time feel
    convPollingRef.current = setInterval(() => {
      fetchConversations();
      fetchFishListings();
    }, 3000);

    return () => {
      if (convPollingRef.current) clearInterval(convPollingRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const fetchSellers = async () => {
    try {
      const res = await fetch("/api/sellers");
      if (res.ok) {
        const data = await res.json();
        setSellers(data);
      }
    } catch (err) {
      console.error("Error fetching sellers:", err);
    } finally {
      setSellersLoading(false);
    }
  };

  const fetchFishListings = async () => {
    try {
      const res = await fetch("/api/fish-listings");
      if (res.ok) {
        const data = await res.json();
        setFishListings(data);
      }
    } catch (err) {
      console.error("Error fetching fish listings:", err);
    } finally {
      setFishListingsLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  };

  const fetchDeals = async () => {
    try {
      const res = await fetch("/api/deals");
      if (res.ok) {
        const data = await res.json();
        setDeals(data);
      }
    } catch (err) {
      console.error("Error fetching deals:", err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setProfileForm({
          displayName: data.displayName || data.name || "",
          phone: data.phone || "",
          location: data.location || "",
          businessName: data.businessName || "",
          businessType: data.businessType || "",
          bio: data.bio || "",
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  // ── Real-time chat polling ──────────────────────────
  const openChat = async (email: string) => {
    setActiveChat(email);

    // Stop old polling
    if (pollingRef.current) clearInterval(pollingRef.current);

    // Fetch immediately
    await fetchChatMessages(email);

    // Start polling every 2 seconds for real-time messages
    pollingRef.current = setInterval(() => fetchChatMessages(email), 2000);
  };

  const fetchChatMessages = async (email: string) => {
    try {
      const res = await fetch(`/api/messages?with=${email}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (err) {
      console.error("Error fetching chat:", err);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !messageImage) || !activeChat) return;
    const msgContent = newMessage;
    const imgUrl = messageImage;
    setNewMessage("");
    setMessageImage(null);

    // Optimistic update
    const optimistic: Message = {
      _id: "temp-" + Date.now(),
      senderEmail: session?.user?.email || "",
      senderName: session?.user?.name || "",
      recipientEmail: activeChat,
      content: msgContent,
      imageUrl: imgUrl || undefined,
      createdAt: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, optimistic]);

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: activeChat, content: msgContent, imageUrl: imgUrl }),
      });
      // Refresh from server
      fetchChatMessages(activeChat);
      fetchConversations();
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const deleteMessage = async (msgId: string) => {
    try {
      await fetch(`/api/messages?messageId=${msgId}`, { method: "DELETE" });
      if (activeChat) fetchChatMessages(activeChat);
    } catch (err) { console.error(err); }
  };

  const deleteConversation = async (email: string) => {
    if (!confirm("Are you sure you want to delete this conversation?")) return;
    try {
      await fetch(`/api/messages?partnerEmail=${email}`, { method: "DELETE" });
      setActiveChat(null);
      fetchConversations();
    } catch (err) { console.error(err); }
  };

  const startChatWithSeller = (email: string) => {
    setActiveChat(email);
    setActiveTab("messages");
    openChat(email);
  };

  const createDeal = async () => {
    if (!selectedSeller) return;
    try {
      await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerEmail: selectedSeller.email,
          sellerName: selectedSeller.displayName || selectedSeller.name,
          fishType: dealForm.fishType,
          quantity: Number(dealForm.quantity),
          pricePerUnit: Number(dealForm.pricePerUnit),
          deliveryLocation: dealForm.deliveryLocation,
          notes: dealForm.notes,
        }),
      });
      setShowDealModal(false);
      setDealForm({ fishType: "", quantity: "", pricePerUnit: "", deliveryLocation: "", notes: "" });
      fetchDeals();
      setActiveTab("deals");
    } catch (err) {
      console.error("Error creating deal:", err);
    }
  };

  const updateDealStatus = async (dealId: string, status: string) => {
    try {
      await fetch("/api/deals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, status }),
      });
      fetchDeals();
    } catch (err) {
      console.error("Error updating deal:", err);
    }
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      fetchProfile();
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setProfileSaving(false);
    }
  };

  // Filter & sort fish listings
  const filteredListings = fishListings
    .filter((l) => {
      const q = search.toLowerCase();
      const matchesSearch = (
        l.fishName.toLowerCase().includes(q) ||
        l.sellerName.toLowerCase().includes(q) ||
        (l.businessName || "").toLowerCase().includes(q) ||
        (l.location || "").toLowerCase().includes(q) ||
        (l.description || "").toLowerCase().includes(q) ||
        (l.availability || "").toLowerCase().includes(q)
      );

      let matchesAvail = true;
      if (availabilityFilter.trim() !== "") {
        matchesAvail = (l.availability || "").toLowerCase().includes(availabilityFilter.toLowerCase());
      }

      return matchesSearch && matchesAvail;
    })
    .sort((a, b) => {
      if (sortBy === "latest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "price_low") return (a.pricePerKg || 0) - (b.pricePerKg || 0);
      if (sortBy === "price_high") return (b.pricePerKg || 0) - (a.pricePerKg || 0);
      return a.fishName.localeCompare(b.fishName);
    });

  const dealStatusStyle: Record<string, { bg: string; text: string; dot: string }> = {
    pending: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-400" },
    accepted: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
    rejected: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-400" },
    completed: { bg: "bg-blue-100", text: "text-blue-600", dot: "bg-blue-500" },
    cancelled: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" },
  };

  const totalUnread = conversations.reduce((a, c) => a + c.unreadCount, 0);

  const gradients = [
    "from-[#3a7bd5] to-[#00d2ff]",
    "from-[#11998e] to-[#38ef7d]",
    "from-purple-500 to-pink-500",
    "from-orange-400 to-red-500",
    "from-cyan-500 to-teal-400",
    "from-indigo-500 to-purple-500",
  ];

  return (
    <main
      className="relative min-h-screen w-full flex flex-col font-sans"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-white/78 z-0" />
      <Navbar />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 mt-[72px]">
        {/* Header */}
        <div className="mb-6">
          <span className="inline-block bg-[#3a7bd5]/10 text-[#3a7bd5] text-xs font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wider">
            Buyer Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1a2a3a]">
            Welcome, {session?.user?.name?.split(" ")[0] || "Buyer"} 👋
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-white/80 backdrop-blur rounded-2xl p-1.5 shadow-sm border border-slate-200/80 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[#1a2a3a] to-[#3a7bd5] text-white shadow-md"
                  : "text-[#3a4a5a] hover:bg-slate-100"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "messages" && totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {totalUnread}
                </span>
              )}
              {tab.id === "deals" && deals.filter(d => d.status === "pending").length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {deals.filter(d => d.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB: MARKETPLACE                                */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === "marketplace" && (
          <div style={{ animation: "fadeIn 0.3s ease-out" }}>
            {/* Search & Sort */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  id="marketplace-search"
                  type="text"
                  placeholder="Search fish, availability, sellers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white/90 backdrop-blur text-sm text-[#1a2a3a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30 shadow-sm"
                />
              </div>
              <div className="relative w-full sm:w-48">
                <input
                  type="text"
                  list="filterAvailabilityOptions"
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  placeholder="Filter Availability..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/90 text-sm text-[#1a2a3a] font-medium focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30 shadow-sm"
                />
                <datalist id="filterAvailabilityOptions">
                  <option value="Available Today" />
                  <option value="Available Tomorrow" />
                  <option value="In 2 Days" />
                  <option value="In 3+ Days" />
                </datalist>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white/90 text-sm text-[#1a2a3a] font-semibold focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30 shadow-sm cursor-pointer"
              >
                <option value="latest">Sort: Latest</option>
                <option value="price_low">Sort: Price (Low → High)</option>
                <option value="price_high">Sort: Price (High → Low)</option>
                <option value="name">Sort: Fish Name (A-Z)</option>
              </select>
              <button onClick={() => { fetchFishListings(); fetchSellers(); }} className="px-4 py-3 rounded-xl border border-slate-200 bg-white/90 text-sm text-[#3a7bd5] font-semibold hover:bg-[#3a7bd5]/5 transition-all shadow-sm flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Refresh
              </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Fish Listed", value: fishListings.length, icon: "🐟", bg: "bg-blue-50", color: "text-[#3a7bd5]" },
                { label: "Active Deals", value: deals.filter(d => d.status === "pending" || d.status === "accepted").length, icon: "📋", bg: "bg-amber-50", color: "text-amber-600" },
                { label: "Sellers", value: sellers.length, icon: "🏪", bg: "bg-emerald-50", color: "text-emerald-600" },
                { label: "Completed", value: deals.filter(d => d.status === "completed").length, icon: "✅", bg: "bg-purple-50", color: "text-purple-600" },
              ].map((stat) => (
                <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 border border-white/60 shadow-sm`}>
                  <p className="text-xl mb-0.5">{stat.icon}</p>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-[#3a4a5a] font-semibold uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Fish Listing Cards */}
            {fishListingsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <svg className="animate-spin h-8 w-8 text-[#3a7bd5]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  <p className="text-sm text-[#3a4a5a] font-medium">Loading fish listings...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredListings.length === 0 ? (
                  <div className="col-span-3 text-center py-20 text-[#9ca3af]">
                    <p className="text-5xl mb-3">🐟</p>
                    <p className="font-bold text-lg text-[#1a2a3a] mb-1">No fish listings yet</p>
                    <p className="text-sm">Sellers will post their fish for sale here. Check back soon!</p>
                  </div>
                ) : (
                  filteredListings.map((listing, idx) => {
                    const gradient = gradients[idx % gradients.length];
                    const sellerInitials = (listing.sellerName || "?")
                      .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

                    // Freshness badge color
                    const freshnessStyle: Record<string, { bg: string; dot: string }> = {
                      "Fresh": { bg: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
                      "Day-old": { bg: "bg-amber-100 text-amber-700", dot: "bg-amber-400" },
                      "Frozen": { bg: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
                    };
                    const fStyle = freshnessStyle[listing.freshness] || freshnessStyle["Fresh"];

                    return (
                      <div key={listing._id} className="group bg-white/90 backdrop-blur-xl rounded-2xl shadow-md border border-white/50 overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative">
                        {/* Top gradient strip */}
                        <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

                        <div className="p-6">
                          {/* Freshness & time badge */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${fStyle.bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${fStyle.dot}`}></span>
                                {listing.freshness}
                              </span>
                              {listing.availability && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  ⏱ {listing.availability}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#9ca3af] font-medium">
                              {new Date(listing.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {/* ═══ FISH NAME ═══ HIGHLIGHTED */}
                          <h2 className="text-2xl font-extrabold mb-1">
                            <span className="inline-flex items-center gap-2">
                              <span className="text-2xl">🐟</span>
                              <span className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                                {listing.fishName}
                              </span>
                            </span>
                          </h2>

                          {/* Image preview */}
                          {listing.imageUrl && (
                            <div className="mb-3 rounded-xl overflow-hidden shadow-sm border border-slate-100 flex items-center justify-center bg-slate-50 relative aspect-video h-36 w-full">
                              <img src={listing.imageUrl} alt={listing.fishName} className="object-cover w-full h-full" />
                            </div>
                          )}

                          {/* Description */}
                          {listing.description && (
                            <p className="text-xs text-[#3a4a5a] leading-relaxed mb-3 line-clamp-2">{listing.description}</p>
                          )}

                          {/* Price & Quantity */}
                          <div className="flex flex-wrap gap-3 mb-4">
                            <span className="inline-flex items-center gap-1 text-sm font-bold text-[#1a2a3a] bg-slate-50 px-3 py-1.5 rounded-lg">
                              💰 ₹{listing.pricePerKg}/{listing.unit}
                            </span>
                            {listing.availableQuantity > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#3a4a5a] bg-slate-50 px-3 py-1.5 rounded-lg">
                                📦 {listing.availableQuantity} {listing.unit} available
                              </span>
                            )}
                          </div>

                          {/* ═══ SELLER / DEALER ═══ */}
                          <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-xl mb-4">
                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0`}>
                              {listing.sellerImage ? (
                                <img src={listing.sellerImage} alt="" className="w-full h-full rounded-lg object-cover" referrerPolicy="no-referrer" />
                              ) : sellerInitials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#1a2a3a] truncate">{listing.sellerName}</p>
                              <p className="text-[10px] text-[#3a4a5a] truncate">
                                {listing.businessName || "Fish Seller"}
                                {listing.location ? ` · ${listing.location}` : ""}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3a7bd5]/10 text-[#3a7bd5] shrink-0">Dealer</span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => startChatWithSeller(listing.sellerEmail)}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-[#3a7bd5] hover:bg-[#3a7bd5]/5 transition-all flex items-center justify-center gap-1.5"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                              Message
                            </button>
                            <button
                              onClick={() => {
                                // Find seller data to populate deal modal
                                const sellerData = sellers.find(s => s.email === listing.sellerEmail);
                                const fakeSellerForDeal: SellerData = sellerData || {
                                  _id: listing._id,
                                  name: listing.sellerName,
                                  email: listing.sellerEmail,
                                  displayName: listing.sellerName,
                                  businessName: listing.businessName,
                                  fishTypes: [listing.fishName],
                                };
                                setSelectedSeller(fakeSellerForDeal);
                                setDealForm(prev => ({ ...prev, fishType: listing.fishName, pricePerUnit: String(listing.pricePerKg) }));
                                setShowDealModal(true);
                              }}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${gradient} hover:opacity-90 transition-all flex items-center justify-center gap-1.5`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                              Make Deal
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB: MESSAGES (Real-time polling)               */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === "messages" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[500px]" style={{ animation: "fadeIn 0.3s ease-out" }}>
            {/* Conversation List */}
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-md border border-white/50 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-[#1a2a3a] text-sm">Conversations</h3>
                <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live
                </span>
              </div>
              <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-[#9ca3af]">
                    <p className="text-3xl mb-2">💬</p>
                    <p className="text-sm font-medium">No conversations yet</p>
                    <p className="text-xs mt-1">Message a seller to get started!</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.partnerEmail}
                      onClick={() => openChat(conv.partnerEmail)}
                      className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                        activeChat === conv.partnerEmail ? "bg-[#3a7bd5]/5 border-l-4 border-[#3a7bd5]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a7bd5] to-[#00d2ff] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {conv.partnerName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-[#1a2a3a] truncate">{conv.partnerName}</span>
                            {conv.unreadCount > 0 && (
                              <span className="w-5 h-5 bg-[#3a7bd5] text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 animate-pulse">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#9ca3af] truncate">{conv.lastMessage}</p>
                          {conv.partnerBusiness && (
                            <p className="text-[10px] text-[#3a7bd5] font-medium truncate">{conv.partnerBusiness}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Window */}
            <div className="md:col-span-2 bg-white/90 backdrop-blur rounded-2xl shadow-md border border-white/50 flex flex-col overflow-hidden">
              {activeChat ? (
                <>
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#11998e] to-[#38ef7d] flex items-center justify-center text-white text-xs font-bold shadow-md">
                        {(conversations.find(c => c.partnerEmail === activeChat)?.partnerName || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-[#1a2a3a]">{conversations.find(c => c.partnerEmail === activeChat)?.partnerName || activeChat}</p>
                        <p className="text-xs text-[#9ca3af]">{conversations.find(c => c.partnerEmail === activeChat)?.partnerBusiness || "Seller"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-50 px-2.5 py-1 rounded-full mr-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Real-time
                      </span>
                      <button onClick={() => deleteConversation(activeChat)} className="text-xs font-semibold px-2.5 py-1.5 rounded bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        🗑 Delete Chat
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[380px] min-h-[200px] scroll-smooth">
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-12 text-[#9ca3af]">
                        <p className="text-4xl mb-3">👋</p>
                        <p className="text-sm font-medium">Say hello!</p>
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => {
                        const isMine = msg.senderEmail === session?.user?.email;
                        return (
                          <div key={msg._id || idx} className={`flex flex-col group ${isMine ? "items-end" : "items-start"}`}>
                            <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm relative shadow-sm ${
                              isMine ? "bg-gradient-to-r from-[#3a7bd5] to-[#00d2ff] text-white rounded-br-sm" : "bg-white border border-slate-100 text-[#1a2a3a] rounded-bl-sm"
                            }`}>
                              {msg.imageUrl && (
                                <img src={msg.imageUrl} alt="attached" className="max-w-full rounded-xl mb-2 aspect-auto border border-white/20" />
                              )}
                              {msg.content}
                              <div className={`text-[10px] mt-1.5 ${isMine ? "text-white/70" : "text-[#9ca3af]"}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                              {isMine && !msg._id?.startsWith("temp-") && (
                                <button onClick={() => deleteMessage(msg._id)} className="absolute top-2 -left-8 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-100 text-red-500 rounded-full hover:bg-red-200">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>
                    {messageImage && (
                    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 relative">
                      <button onClick={() => setMessageImage(null)} className="absolute top-1 right-2 bg-red-500 text-white rounded-full p-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                      <img src={messageImage} alt="preview" className="h-16 w-auto rounded border border-slate-200" />
                    </div>
                  )}
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 items-center relative">
                    <label className="cursor-pointer text-[#9ca3af] hover:text-[#11998e] transition-colors p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setMessageImage)} />
                    </label>
                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type your message..."
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30 bg-white shadow-sm" />
                    <button onClick={sendMessage} disabled={!newMessage.trim() && !messageImage}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#3a7bd5] to-[#00d2ff] text-white font-bold text-sm hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:shadow-none">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#9ca3af]">
                  <div className="text-center">
                    <p className="text-5xl mb-3">💬</p>
                    <p className="font-semibold text-[#1a2a3a]">Select a conversation</p>
                    <p className="text-sm mt-1">Or message a seller from the marketplace</p>
                    <p className="text-xs mt-3 text-emerald-500 font-medium flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Messages update in real-time
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB: DEALS                                      */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === "deals" && (
          <div style={{ animation: "fadeIn 0.3s ease-out" }}>
            {deals.length === 0 ? (
              <div className="bg-white/90 backdrop-blur rounded-2xl shadow-md border border-white/50 p-16 text-center">
                <p className="text-5xl mb-4">📋</p>
                <h3 className="text-xl font-bold text-[#1a2a3a] mb-2">No deals yet</h3>
                <p className="text-sm text-[#3a4a5a] mb-6">Browse the marketplace and create your first deal with a seller!</p>
                <button onClick={() => setActiveTab("marketplace")} className="px-6 py-3 bg-gradient-to-r from-[#1a2a3a] to-[#3a7bd5] text-white font-bold rounded-xl hover:shadow-lg transition-all">
                  Browse Marketplace →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {deals.map((deal) => {
                  const st = dealStatusStyle[deal.status] || dealStatusStyle.pending;
                  return (
                    <div key={deal._id} className="bg-white/90 backdrop-blur rounded-2xl shadow-md border border-white/50 p-6 hover:shadow-lg transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3a7bd5] to-[#00d2ff] flex items-center justify-center text-white shadow-md shrink-0">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                          </div>
                          <div>
                            <h3 className="font-bold text-[#1a2a3a]">{deal.fishType} — {deal.quantity} {deal.unit}</h3>
                            <p className="text-sm text-[#3a4a5a]">Seller: <span className="font-semibold">{deal.sellerName}</span></p>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-[#3a4a5a]">
                              <span>💰 ₹{deal.pricePerUnit}/{deal.unit}</span>
                              <span>📦 Total: ₹{deal.totalPrice}</span>
                              {deal.deliveryDate && <span>📅 {deal.deliveryDate}</span>}
                              {deal.deliveryLocation && <span>📍 {deal.deliveryLocation}</span>}
                            </div>
                            {deal.notes && <p className="text-xs text-[#9ca3af] mt-1 italic">"{deal.notes}"</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${st.bg} ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                            {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                          </span>
                          {deal.status === "pending" && (
                            <button onClick={() => updateDealStatus(deal._id, "cancelled")} className="text-xs font-semibold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-full border border-red-200 hover:bg-red-50 transition-all">
                              Cancel
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

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB: PROFILE                                    */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <div className="max-w-2xl mx-auto" style={{ animation: "fadeIn 0.3s ease-out" }}>
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-md border border-white/50 overflow-hidden">
              <div className="bg-gradient-to-r from-[#1a2a3a] to-[#3a7bd5] p-8 text-white">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl border-3 border-white/30 overflow-hidden shadow-lg bg-white/20 flex items-center justify-center">
                    {session?.user?.image ? (
                      <img src={session.user.image} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold">{(session?.user?.name || "?")[0]}</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{profileForm.displayName || session?.user?.name}</h2>
                    <p className="text-white/70 text-sm">{session?.user?.email}</p>
                    <span className="inline-block mt-2 text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">🛒 Buyer Account</span>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Display Name</label>
                    <input type="text" value={profileForm.displayName} onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Phone</label>
                    <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Location</label>
                    <input type="text" value={profileForm.location} onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Business Name</label>
                    <input type="text" value={profileForm.businessName} onChange={(e) => setProfileForm(prev => ({ ...prev, businessName: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Business Type</label>
                  <select value={profileForm.businessType} onChange={(e) => setProfileForm(prev => ({ ...prev, businessType: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] bg-white focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30">
                    <option value="">Select type</option>
                    {["Restaurant / Hotel", "Retail Fish Shop", "Wholesale Distributor", "Supermarket / Chain", "Catering Service", "Export Business", "Individual Buyer", "Other"].map((bt) => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Bio</label>
                  <textarea value={profileForm.bio} onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))} rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30 resize-none" placeholder="Tell sellers about your business..." />
                </div>
                <button onClick={saveProfile} disabled={profileSaving}
                  className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-[#1a2a3a] to-[#3a7bd5] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  {profileSaving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* DEAL CREATION MODAL                             */}
      {/* ═══════════════════════════════════════════════ */}
      {showDealModal && selectedSeller && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDealModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative" style={{ animation: "slideUp 0.3s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#3a7bd5] to-[#00d2ff] p-6 text-white">
              <button onClick={() => setShowDealModal(false)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
              <h2 className="text-xl font-bold">Create a Deal</h2>
              <p className="text-white/80 text-sm mt-1">with {selectedSeller.displayName || selectedSeller.name} — {selectedSeller.businessName || "Seller"}</p>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Fish Type</label>
                <div className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-[#1a2a3a] font-semibold">
                  🐟 {dealForm.fishType || "Selected Fish"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Quantity (kg) *</label>
                  <input type="number" value={dealForm.quantity} onChange={(e) => setDealForm(prev => ({ ...prev, quantity: e.target.value }))} placeholder="50"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Price/kg (₹) *</label>
                  <input type="number" value={dealForm.pricePerUnit} onChange={(e) => setDealForm(prev => ({ ...prev, pricePerUnit: e.target.value }))} placeholder="300"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30" />
                </div>
              </div>
              {dealForm.quantity && dealForm.pricePerUnit && (
                <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm text-emerald-700 font-medium">Total Amount</span>
                  <span className="text-lg font-bold text-emerald-700">₹{(Number(dealForm.quantity) * Number(dealForm.pricePerUnit)).toLocaleString()}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Delivery Location</label>
                <input type="text" value={dealForm.deliveryLocation} onChange={(e) => setDealForm(prev => ({ ...prev, deliveryLocation: e.target.value }))} placeholder="Your delivery address"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={dealForm.notes} onChange={(e) => setDealForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} placeholder="Any special requirements..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#3a7bd5]/30 resize-none" />
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowDealModal(false)} className="flex-1 py-3 rounded-xl font-bold text-[#1a2a3a] border border-slate-200 hover:bg-slate-50 transition-all text-sm">Cancel</button>
              <button onClick={createDeal} disabled={!dealForm.fishType || !dealForm.quantity || !dealForm.pricePerUnit}
                className={`flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all ${dealForm.fishType && dealForm.quantity && dealForm.pricePerUnit ? "bg-gradient-to-r from-[#3a7bd5] to-[#00d2ff] hover:opacity-90 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
                Submit Deal Request
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </main>
  );
}
