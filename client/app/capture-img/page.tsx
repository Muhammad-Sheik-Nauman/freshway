"use client";

import React, { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";

interface PredictionResult {
  freshness: string;
  confidence: number;
  status: string;
  message: string;
  market_route?: string;
  all_scores?: Record<string, number>;
}

export default function CapturePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stop camera when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Attach stream to video element when camera is opened
  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraOpen, stream]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        alert("File is too large! Please select an image smaller than 10MB.");
        event.target.value = "";
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please make sure you have given permission or use the upload option.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob for API upload
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "captured_fish_eye.png", { type: "image/png" });
            setImageFile(file);
          }
        }, "image/png");

        const imageData = canvas.toDataURL("image/png");
        setSelectedImage(imageData);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const resetImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    setResult(null);
    setShowResult(false);
    stopCamera();
  };

  const analyzeFreshness = async () => {
    if (!imageFile && !selectedImage) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      const formData = new FormData();

      if (imageFile) {
        formData.append("image", imageFile);
      } else if (selectedImage) {
        // Convert base64 to blob
        const res = await fetch(selectedImage);
        const blob = await res.blob();
        formData.append("image", blob, "fish_eye.png");
      }

      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        body: formData,
      });

      const data: PredictionResult = await response.json();
      setResult(data);
      setShowResult(true);
    } catch (error) {
      console.error("Analysis failed:", error);
      setResult({
        freshness: "Error",
        confidence: 0,
        status: "error",
        message: "Could not connect to the analysis server. Make sure the backend is running.",
      });
      setShowResult(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getFreshnessColor = (freshness: string) => {
    switch (freshness) {
      case "Highly Fresh": return { bg: "from-emerald-500 to-green-400", text: "text-emerald-700", icon: "🟢" };
      case "Fresh": return { bg: "from-blue-500 to-cyan-400", text: "text-blue-700", icon: "🔵" };
      case "Not Fresh": return { bg: "from-red-500 to-orange-400", text: "text-red-700", icon: "🔴" };
      case "Uncertain": return { bg: "from-yellow-500 to-amber-400", text: "text-yellow-700", icon: "🟡" };
      default: return { bg: "from-gray-500 to-gray-400", text: "text-gray-700", icon: "⚪" };
    }
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-start font-sans" style={{ backgroundImage: "url('/bg.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
      <div className="absolute top-0 left-0 w-full h-full bg-white/75 z-0" />

      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 w-full max-w-2xl">
        <div className="w-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-10 border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#1a2a3a] mb-2">Capture Quality</h1>
            <p className="text-[#3a4a5a]">Upload or take a photo of the fish eye for freshness analysis</p>
          </div>

          {!selectedImage && !isCameraOpen ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button
                onClick={startCamera}
                className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#3a7bd5] to-[#00d2ff] rounded-xl text-white hover:scale-105 transition-transform cursor-pointer shadow-lg group"
              >
                <div className="bg-white/20 p-4 rounded-full mb-4 group-hover:bg-white/30 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                </div>
                <span className="text-xl font-bold">Take Photo</span>
                <span className="text-sm opacity-80">Use device camera</span>
              </button>

              <button
                onClick={triggerUpload}
                className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-[#3a7bd5] rounded-xl text-[#3a7bd5] hover:bg-[#f0f7ff] transition-colors cursor-pointer group"
              >
                <div className="bg-[#f0f7ff] p-4 rounded-full mb-4 group-hover:bg-[#e0efff] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                </div>
                <span className="text-xl font-bold">Upload</span>
                <span className="text-sm text-[#3a4a5a]/60">Choose from gallery</span>
              </button>
            </div>
          ) : isCameraOpen ? (
            <div className="space-y-6">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border-4 border-white shadow-lg bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-2 border-white/30 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-dashed border-white/50 rounded-full"></div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={capturePhoto}
                  className="flex-1 py-4 bg-[#3a7bd5] text-white rounded-xl font-bold text-lg shadow-lg hover:bg-[#255bb5] transition-all flex items-center justify-center gap-2"
                >
                  <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                  Capture Photo
                </button>
                <button
                  onClick={stopCamera}
                  className="px-6 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-xl border-4 border-white shadow-lg">
                <img
                  src={selectedImage!}
                  alt="Captured fish eye"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={resetImage}
                  className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={analyzeFreshness}
                  disabled={isAnalyzing}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${isAnalyzing
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-[#3a7bd5] text-white hover:bg-[#255bb5]"
                    }`}
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                      Analyze Freshness
                    </>
                  )}
                </button>
                <button
                  onClick={resetImage}
                  className="w-full py-3 bg-transparent text-[#3a4a5a] font-medium hover:text-[#1a2a3a] transition-colors"
                >
                  Retake Photo
                </button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl text-center">
            <span className="block text-2xl mb-1">💡</span>
            <p className="text-xs text-[#3a4a5a] font-medium">Good lighting is essential</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl text-center">
            <span className="block text-2xl mb-1">🎯</span>
            <p className="text-xs text-[#3a4a5a] font-medium">Focus on the eye directly</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl text-center">
            <span className="block text-2xl mb-1">📸</span>
            <p className="text-xs text-[#3a4a5a] font-medium">Keep the image steady</p>
          </div>
        </div>
      </div>

      {/* ── RESULT MODAL ───────────────────────────────────────────── */}
      {showResult && result && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowResult(false)}>
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-[slideUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${getFreshnessColor(result.freshness || "").bg} p-6 text-white text-center`}>
              <span className="text-5xl block mb-2">{getFreshnessColor(result.freshness || "").icon}</span>
              <h2 className="text-2xl font-bold">{result.freshness}</h2>
              {result.confidence > 0 && (
                <p className="text-white/90 text-lg mt-1">{result.confidence}% Confidence</p>
              )}
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-[#3a4a5a] text-center">{result.message}</p>

              {/* Confidence Bars */}
              {result.all_scores && (
                <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-[#1a2a3a] uppercase tracking-wider">Detailed Scores</h3>
                  {Object.entries(result.all_scores).map(([label, score]) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-[#3a4a5a]">{label}</span>
                        <span className="font-bold text-[#1a2a3a]">{score}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full bg-gradient-to-r ${getFreshnessColor(label).bg}`}
                          style={{ width: `${score}%`, transition: "width 1s ease-out" }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Market Route */}
              {result.market_route && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-blue-500 font-semibold mb-1">Recommended Market</p>
                  <p className="text-[#1a2a3a] font-bold">{result.market_route}</p>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setShowResult(false)}
                className="w-full py-3 bg-[#1a2a3a] text-white rounded-xl font-bold hover:bg-[#0d1b2a] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </main>
  );
}
