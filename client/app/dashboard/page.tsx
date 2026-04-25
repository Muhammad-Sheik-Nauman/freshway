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

interface Review {
  _id: string;
  buyerEmail: string;
  buyerName: string;
  sellerEmail: string;
  fishName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface FishListing {
  _id: string;
  sellerEmail: string;
  sellerName: string;
  businessName: string;
  fishName: string;
  description: string;
  pricePerKg: number;
  availableQuantity: number;
  unit: string;
  freshness: string;
  availability: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

const fishOptions = [
  "Mackerel (Bangda / Ayla)",
  "Sardine (Mathi / Boote)",
  "Seer Fish / King Fish (Anjal / Surmai)",
  "Pomfret (Black/White) (Maanji / Paplet)",
  "Tuna (Kera / Choora)",
  "Anchovy (Bolinge / Nethili)",
  "Lady Fish / Silver Whiting (Kane)",
  "Catfish (Kadu / Singara)",
  "Red Snapper (Kempu Meen / Rani Meen)",
  "Barracuda (Sheelav / Seela)",
  "Croaker (Ghol / Kathalai)",
  "Ribbon Fish (Baale Meen)",
  "Shark (small varieties) (Mori / Bondaas)",
  "Eel (Baim / Halla Meen)",
  "Threadfin Bream (Kilimeen / Rani)",
  "Prawn / Shrimp (Yeti / Chemmeen)",
  "Tiger Prawn (large) (Bagda / Tiger Yeti)",
  "Crab (Kakke)",
  "Blue Crab / Sea Crab (Neer Kakke)"
];

type Tab = "tools" | "listings" | "messages" | "deals" | "profile";

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
  const [prevMsgCount, setPrevMsgCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const convPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fish listing state
  const [myListings, setMyListings] = useState<FishListing[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [postForm, setPostForm] = useState({
    fishName: "",
    description: "",
    imageUrl: "",
    pricePerKg: "",
    availableQuantity: "",
    unit: "kg",
    freshness: "Fresh",
    availability: "",
  });
  const [posting, setPosting] = useState(false);
  const [messageImage, setMessageImage] = useState<string | null>(null);

  // Profile state
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    phone: "",
    location: "",
    businessName: "",
    businessType: "",
    bio: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewsViewer, setShowReviewsViewer] = useState<{ sellerEmail: string, sellerName: string } | null>(null);

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

  useEffect(() => {
    fetchConversations();
    fetchDeals();
    fetchMyListings();
    fetchReviews();

    const params = new URLSearchParams(window.location.search);
    const chatEmail = params.get("chat");
    if (chatEmail) {
      setActiveTab("messages");
      openChat(chatEmail);
      window.history.replaceState({}, '', '/dashboard');
    }

    // Real-time polling for conversations every 3s
    convPollingRef.current = setInterval(() => {
      fetchConversations();
      fetchDeals();
      fetchReviews();
    }, 3000);

    return () => {
      if (convPollingRef.current) clearInterval(convPollingRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);

  // Handle manual scroll to detect if user is at bottom
  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = chatContainerRef.current;
    // If we are within 50px of the bottom, consider it "at bottom"
    const atBottom = scrollHeight - scrollTop <= clientHeight + 50;
    setIsAtBottom(atBottom);
  };

  // Reset counter when switching chats
  useEffect(() => {
    setPrevMsgCount(0);
    setIsAtBottom(true); // Default to bottom for new chats
  }, [activeChat]);

  // Smart Auto-scroll chat
  useEffect(() => {
    const lastMessage = chatMessages[chatMessages.length - 1];
    const isMyMessage = lastMessage?.senderEmail === session?.user?.email;
    const hasNewMessages = chatMessages.length > prevMsgCount;

    // Scroll if: 
    // - I sent a message
    // - New message arrived AND I'm already at bottom
    // - First load of a chat
    if (isMyMessage || (hasNewMessages && isAtBottom) || (chatMessages.length > 0 && prevMsgCount === 0)) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    setPrevMsgCount(chatMessages.length);
  }, [chatMessages, session?.user?.email]);

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

  const fetchMyListings = async () => {
    try {
      const res = await fetch("/api/fish-listings?mine=true");
      if (res.ok) setMyListings(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?sellerEmail=${session?.user?.email || ""}`);
      if (res.ok) setReviews(await res.json());
    } catch (err) { console.error("Error fetching reviews:", err); }
  };

  const postFishListing = async () => {
    if (!postForm.fishName.trim() || !postForm.pricePerKg || !postForm.imageUrl || !postForm.availability) return;
    setPosting(true);
    try {
      if (editingListingId) {
        // UPDATE EXISTING
        await fetch("/api/fish-listings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId: editingListingId,
            fishName: postForm.fishName,
            description: postForm.description,
            imageUrl: postForm.imageUrl || null,
            pricePerKg: Number(postForm.pricePerKg),
            availableQuantity: Number(postForm.availableQuantity),
            unit: postForm.unit,
            freshness: postForm.freshness,
            availability: postForm.availability,
          }),
        });
      } else {
        // CREATE NEW
        await fetch("/api/fish-listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fishName: postForm.fishName,
            description: postForm.description,
            imageUrl: postForm.imageUrl || null,
            pricePerKg: Number(postForm.pricePerKg),
            availableQuantity: Number(postForm.availableQuantity),
            unit: postForm.unit,
            freshness: postForm.freshness,
            availability: postForm.availability,
          }),
        });
      }

      setShowPostModal(false);
      setEditingListingId(null);
      setPostForm({ fishName: "", description: "", imageUrl: "", pricePerKg: "", availableQuantity: "", unit: "kg", freshness: "Fresh", availability: "" });
      fetchMyListings();
      setActiveTab("listings");
    } catch (err) { console.error(err); }
    setPosting(false);
  };

  const startEditListing = (listing: FishListing) => {
    setEditingListingId(listing._id);
    setPostForm({
      fishName: listing.fishName,
      description: listing.description || "",
      imageUrl: listing.imageUrl || "",
      pricePerKg: String(listing.pricePerKg),
      availableQuantity: String(listing.availableQuantity),
      unit: listing.unit,
      freshness: listing.freshness,
      availability: listing.availability,
    });
    setShowPostModal(true);
  };

  const toggleListingActive = async (listingId: string, isActive: boolean) => {
    try {
      await fetch("/api/fish-listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, isActive: !isActive }),
      });
      fetchMyListings();
    } catch (err) { console.error(err); }
  };

  const deleteListing = async (listingId: string) => {
    try {
      await fetch(`/api/fish-listings?id=${listingId}`, { method: "DELETE" });
      fetchMyListings();
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
    if ((!newMessage.trim() && !messageImage) || !activeChat) return;
    const content = newMessage;
    const imgUrl = messageImage;
    setNewMessage("");
    setMessageImage(null);

    // Optimistic update
    setChatMessages(prev => [...prev, {
      _id: "temp-" + Date.now(),
      senderEmail: session?.user?.email || "",
      senderName: session?.user?.name || "",
      recipientEmail: activeChat,
      content,
      imageUrl: imgUrl || undefined,
      createdAt: new Date().toISOString(),
    }]);

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: activeChat, content, imageUrl: imgUrl }),
      });
      fetchChatMessages(activeChat);
      fetchConversations();
    } catch (err) { console.error(err); }
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

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setProfileForm({
          displayName: data.displayName || data.name || "",
          phone: data.phone || "",
          location: data.location || "",
          businessName: data.businessName || "",
          businessType: data.businessType || "",
          bio: data.bio || "",
        });
      }
    } catch (err) { console.error(err); }
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      alert("Profile updated successfully!");
    } catch (err) { console.error(err); }
    setProfileSaving(false);
  };

  const detectLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || "";
          const state = data.address.state || "";
          setProfileForm(prev => ({ ...prev, location: city ? `${city}, ${state}` : state }));
        } catch (err) {
          console.error("Geocoding error:", err);
          setProfileForm(prev => ({ ...prev, location: `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}` }));
        }
      });
    } else {
      alert("Geolocation is not supported by your browser.");
    }
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
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="inline-block bg-[#11998e]/10 text-[#11998e] text-xs font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wider">
              Seller Dashboard
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1a2a3a]">
              Welcome, {session?.user?.name?.split(" ")[0] || "Seller"} 👋
            </h1>
          </div>
          {(() => {
            const avgRating = reviews.length ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : "New";
            return (
              <button onClick={() => setShowReviewsViewer({ sellerEmail: session?.user?.email || "", sellerName: session?.user?.name || "You" })} className="flex items-center gap-3 bg-white/90 backdrop-blur px-5 py-3 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="text-left leading-tight">
                  <p className="text-[10px] font-bold text-[#11998e] uppercase tracking-wider">Buyer Feedback</p>
                  <p className="text-sm font-bold text-[#1a2a3a]">Your Rating</p>
                </div>
                <span className="text-xl font-bold text-amber-500 bg-amber-50 px-3 py-1 rounded-xl border border-amber-100 flex items-center gap-1.5">
                  ⭐ {avgRating} {avgRating !== "New" && <span className="text-xs text-amber-700 font-medium">({reviews.length})</span>}
                </span>
              </button>
            );
          })()}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-white/80 backdrop-blur rounded-2xl p-1.5 shadow-sm border border-slate-200/80 mb-6 overflow-x-auto">
          {([
            { id: "tools" as Tab, label: "My Tools", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
            { id: "listings" as Tab, label: "My Fish Posts", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg> },
            { id: "messages" as Tab, label: "Messages", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
            { id: "deals" as Tab, label: "Buyer Requests", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
            { id: "profile" as Tab, label: "Profile", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${activeTab === tab.id
                  ? "bg-gradient-to-r from-[#11998e] to-[#38ef7d] text-white shadow-md"
                  : "text-[#3a4a5a] hover:bg-slate-100"
                }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "listings" && myListings.length > 0 && (
                <span className="ml-1 w-5 h-5 bg-[#11998e]/20 text-[#11998e] text-[10px] font-bold rounded-full flex items-center justify-center">{myListings.filter(l => l.isActive).length}</span>
              )}
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

        {/* ══ TAB: MY FISH POSTS ══ */}
        {activeTab === "listings" && (
          <div style={{ animation: "fadeIn 0.3s ease-out" }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-[#1a2a3a]">Your Fish Listings</h2>
                <p className="text-sm text-[#3a4a5a]">Post fish for sale — buyers will see these in their marketplace</p>
              </div>
              <button
                onClick={() => setShowPostModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#11998e] to-[#38ef7d] text-white font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Post Fish for Sale
              </button>
            </div>

            {myListings.length === 0 ? (
              <div className="bg-white/90 backdrop-blur rounded-2xl shadow-md border border-white/50 p-16 text-center">
                <p className="text-5xl mb-4">🐟</p>
                <h3 className="text-xl font-bold text-[#1a2a3a] mb-2">No fish posted yet</h3>
                <p className="text-sm text-[#3a4a5a] mb-6">Post your fish for sale so buyers can find and purchase from you.</p>
                <button onClick={() => setShowPostModal(true)} className="px-6 py-3 bg-gradient-to-r from-[#11998e] to-[#38ef7d] text-white font-bold rounded-xl hover:shadow-lg transition-all">
                  + Post Your First Fish
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myListings.map((listing) => (
                  <div key={listing._id} className={`relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-md border border-white/50 p-5 hover:shadow-lg transition-all flex flex-col h-full ${!listing.isActive ? "opacity-60" : ""}`}>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#11998e] to-[#38ef7d] rounded-t-2xl" />

                    {/* Fish badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full text-white bg-gradient-to-r from-[#11998e] to-[#38ef7d]">
                          🐟 {listing.freshness}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          ⏱ {listing.availability}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${listing.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {listing.isActive ? "● Live" : "● Inactive"}
                      </span>
                    </div>

                    {/* Fish Name - Fixed Height for Alignment */}
                    <div className="min-h-[56px] mb-2">
                      <h3 className="text-lg font-extrabold text-[#1a2a3a] line-clamp-2 leading-tight">
                        <span className="bg-gradient-to-r from-[#11998e] to-[#38ef7d] bg-clip-text text-transparent">🐟 {listing.fishName}</span>
                      </h3>
                    </div>

                    {listing.imageUrl && (
                      <div className="mb-3 rounded-xl overflow-hidden shadow-sm border border-slate-100 flex items-center justify-center bg-slate-50 relative aspect-video h-32 w-full shrink-0">
                        <img src={listing.imageUrl} alt={listing.fishName} className="object-cover w-full h-full" />
                      </div>
                    )}

                    {listing.description && <p className="text-xs text-[#3a4a5a] mb-3 line-clamp-2">{listing.description}</p>}

                    <div className="flex flex-wrap gap-3 text-xs text-[#3a4a5a] mb-4">
                      <span className="font-semibold">💰 ₹{listing.pricePerKg}/{listing.unit}</span>
                      {listing.availableQuantity > 0 && <span>📦 {listing.availableQuantity} {listing.unit} available</span>}
                    </div>

                    {/* Actions - Pushed to Bottom */}
                    <div className="mt-auto">
                      <p className="text-[10px] text-[#9ca3af] mb-3">Posted {new Date(listing.createdAt).toLocaleDateString()}</p>
                      <div className="flex gap-2 pt-3 border-t border-slate-100">
                        <button onClick={() => toggleListingActive(listing._id, listing.isActive)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${listing.isActive ? "border-amber-200 text-amber-600 hover:bg-amber-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            }`}>
                          {listing.isActive ? "⏸ Pause" : "▶ Activate"}
                        </button>
                        <button onClick={() => startEditListing(listing)}
                          className="py-2 px-3 rounded-xl text-xs font-semibold border border-blue-200 text-blue-500 hover:bg-blue-50 transition-all">
                          ✎ Edit
                        </button>
                        <button onClick={() => deleteListing(listing._id)}
                          className="py-2 px-3 rounded-xl text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-100 transition-all">
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                    <div className="flex gap-2 items-center">
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold mr-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Real-time
                      </span>
                      <button onClick={() => deleteConversation(activeChat)} className="text-xs font-semibold px-2.5 py-1.5 rounded bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        🗑 Delete Chat
                      </button>
                    </div>
                  </div>

                  <div
                    ref={chatContainerRef}
                    onScroll={handleChatScroll}
                    className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[380px] min-h-[200px]"
                  >
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-12 text-[#9ca3af]"><p className="text-3xl mb-2">👋</p><p className="text-sm">Start the conversation!</p></div>
                    ) : (
                      chatMessages.map((msg, idx) => {
                        const isMine = msg.senderEmail === session?.user?.email;
                        return (
                          <div key={msg._id || idx} className={`flex flex-col group ${isMine ? "items-end" : "items-start"}`}>
                            <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm relative ${isMine ? "bg-gradient-to-r from-[#11998e] to-[#38ef7d] text-white rounded-tr-md" : "bg-slate-100 text-[#1a2a3a] rounded-tl-md"
                              }`}>
                              {msg.imageUrl && (
                                <img src={msg.imageUrl} alt="attached" className="max-w-full rounded-xl mb-2 aspect-auto border border-white/20" />
                              )}
                              {msg.content}
                              <div className={`text-[10px] mt-1 ${isMine ? "text-white/60" : "text-[#9ca3af]"}`}>
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
                  <div className="p-4 border-t border-slate-100 flex gap-2 items-center relative">
                    <label className="cursor-pointer text-[#9ca3af] hover:text-[#11998e] transition-colors p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setMessageImage)} />
                    </label>
                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30" />
                    <button onClick={sendMessage} disabled={!newMessage.trim() && !messageImage}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#11998e] to-[#38ef7d] text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
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
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
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
        {/* ══ TAB: PROFILE ══ */}
        {activeTab === "profile" && (
          <div className="max-w-2xl mx-auto" style={{ animation: "fadeIn 0.3s ease-out" }}>
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-md border border-white/50 overflow-hidden">
              <div className="bg-gradient-to-r from-[#11998e] to-[#38ef7d] p-8 text-white">
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
                    <span className="inline-block mt-2 text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">🏪 Seller Account</span>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Display Name</label>
                    <input type="text" value={profileForm.displayName} onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Phone</label>
                    <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Location</label>
                    <div className="relative">
                      <input type="text" value={profileForm.location} onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30 pr-12" placeholder="City, State" />
                      <button 
                        onClick={detectLocation}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#11998e] hover:bg-[#11998e]/10 rounded-lg transition-colors"
                        title="Auto-detect Location"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Business Name</label>
                    <input type="text" value={profileForm.businessName} onChange={(e) => setProfileForm(prev => ({ ...prev, businessName: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Business Type</label>
                  <select
                    value={profileForm.businessType}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, businessType: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] bg-white focus:outline-none focus:ring-2 focus:ring-[#11998e]/30">
                    <option value="">Select Business Type...</option>
                    <option value="Local Fisherman">🎣 Local Fisherman</option>
                    <option value="Wholesaler">📦 Wholesaler</option>
                    <option value="Retail Shop">🏪 Retail Shop</option>
                    <option value="Exporters">🌐 Exporters</option>
                    <option value="Cold Storage">❄️ Cold Storage</option>
                    <option value="Home Delivery">🛵 Home Delivery</option>
                    <option value="Fish Fertilizer & Feed">🌱 Fish Fertilizer & Feed</option>
                    <option value="Boat & Gear Supplier">⛵ Boat & Gear Supplier</option>
                    <option value="Aquaculture & Hatchery">🐟 Aquaculture & Hatchery</option>
                    <option value="Processing Plant">🏭 Processing Plant</option>
                    <option value="Other">✨ Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Business Bio</label>
                  <textarea rows={3} value={profileForm.bio} onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30 resize-none"
                    placeholder="Tell buyers about your catch and experience..."></textarea>
                </div>

                <div className="pt-4 flex gap-3">
                  <button onClick={saveProfile} disabled={profileSaving}
                    className="flex-1 bg-gradient-to-r from-[#11998e] to-[#38ef7d] text-white font-bold py-4 rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50">
                    {profileSaving ? "Saving..." : "Save Profile Changes"}
                  </button>
                  <button onClick={() => window.location.reload()} className="px-6 py-4 rounded-xl border border-slate-200 font-bold text-[#3a4a5a] hover:bg-slate-50 transition-all">
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ POST FISH MODAL ══ */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPostModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative" style={{ animation: "slideUp 0.3s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#11998e] to-[#38ef7d] p-6 text-white">
              <button onClick={() => { setShowPostModal(false); setEditingListingId(null); setPostForm({ fishName: "", description: "", imageUrl: "", pricePerKg: "", availableQuantity: "", unit: "kg", freshness: "Fresh", availability: "" }); }} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
              <h2 className="text-xl font-bold flex items-center gap-2">🐟 {editingListingId ? "Edit Fish Listing" : "Post Fish for Sale"}</h2>
              <p className="text-white/80 text-sm mt-1">{editingListingId ? "Update your listing details" : "This listing will be visible to all buyers in the marketplace"}</p>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Fish Name *</label>
                <input type="text" list="fishNameOptions" value={postForm.fishName} onChange={(e) => setPostForm(prev => ({ ...prev, fishName: e.target.value }))}
                  placeholder="Select or type custom fish name..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] bg-white focus:outline-none focus:ring-2 focus:ring-[#11998e]/30" />
                <datalist id="fishNameOptions">
                  {fishOptions.map((f) => (<option key={f} value={f} />))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={postForm.description} onChange={(e) => setPostForm(prev => ({ ...prev, description: e.target.value }))} rows={2}
                  placeholder="Freshly caught, premium quality..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Fish Picture *</label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#3a4a5a] hover:bg-slate-100 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                    Upload Image
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (base64) => setPostForm(prev => ({ ...prev, imageUrl: base64 })))} />
                  </label>
                  {postForm.imageUrl && (
                    <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <img src={postForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button onClick={(e) => { e.preventDefault(); setPostForm(prev => ({ ...prev, imageUrl: "" })) }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 shadow">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Price/kg (₹) *</label>
                  <input type="number" value={postForm.pricePerKg} onChange={(e) => setPostForm(prev => ({ ...prev, pricePerKg: e.target.value }))} placeholder="300"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Available Qty (kg)</label>
                  <input type="number" value={postForm.availableQuantity} onChange={(e) => setPostForm(prev => ({ ...prev, availableQuantity: e.target.value }))} placeholder="100"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#11998e]/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Freshness</label>
                  <select value={postForm.freshness} onChange={(e) => setPostForm(prev => ({ ...prev, freshness: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] bg-white focus:outline-none focus:ring-2 focus:ring-[#11998e]/30">
                    <option value="Fresh">🟢 Fresh (Today)</option>
                    <option value="Day-old">🟡 Day-old</option>
                    <option value="Frozen">🔵 Frozen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#3a4a5a] uppercase tracking-wider mb-1.5">Availability Timeline *</label>
                  <input type="text" list="availabilityOptions" value={postForm.availability} onChange={(e) => setPostForm(prev => ({ ...prev, availability: e.target.value }))}
                    placeholder="Select or type custom..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1a2a3a] bg-white focus:outline-none focus:ring-2 focus:ring-[#11998e]/30" />
                  <datalist id="availabilityOptions">
                    <option value="Available Today" />
                    <option value="Available Tomorrow" />
                    <option value="In 2 Days" />
                    <option value="In 3+ Days" />
                  </datalist>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowPostModal(false)} className="flex-1 py-3 rounded-xl font-bold text-[#1a2a3a] border border-slate-200 hover:bg-slate-50 transition-all text-sm">Cancel</button>
              <button onClick={postFishListing} disabled={!postForm.fishName || !postForm.pricePerKg || !postForm.imageUrl || !postForm.availability || posting}
                className={`flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all ${(postForm.fishName && postForm.pricePerKg && postForm.imageUrl && postForm.availability) ? "bg-gradient-to-r from-[#11998e] to-[#38ef7d] hover:opacity-90 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
                {posting ? "Posting..." : "🐟 Post Fish Listing"}
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

      {/* ══ REVIEWS VIEWER MODAL ══ */}
      {showReviewsViewer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowReviewsViewer(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]" style={{ animation: "slideUp 0.3s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shadow-sm relative z-10">
              <div>
                <h2 className="font-bold text-[#1a2a3a]">Your Reviews</h2>
                <p className="text-xs text-[#9ca3af]">What buyers are saying about your fish</p>
              </div>
              <button onClick={() => setShowReviewsViewer(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 bg-slate-50">
              {reviews.filter(r => r.sellerEmail === showReviewsViewer.sellerEmail).length === 0 ? (
                <div className="text-center py-12 text-[#9ca3af]">
                  <p className="text-4xl mb-3">⭐</p>
                  <p className="font-medium text-[#1a2a3a]">No reviews yet.</p>
                  <p className="text-xs mt-1">Complete deals with buyers to get reviews!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.filter(r => r.sellerEmail === showReviewsViewer.sellerEmail).map(r => (
                    <div key={r._id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-sm text-[#1a2a3a]">{r.buyerName}</p>
                          <p className="text-[10px] text-[#9ca3af]">Bought: <span className="font-medium text-[#11998e]">{r.fishName}</span></p>
                        </div>
                        <div className="flex" title={`${r.rating} stars`}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} className={`text-xs ${star <= r.rating ? "text-amber-500" : "text-slate-200"}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-[#3a4a5a] relative">
                        <span className="text-slate-200 text-2xl absolute -left-1 -top-2">"</span>
                        <span className="relative z-10 pl-3 block">{r.comment}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-3 text-right">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
