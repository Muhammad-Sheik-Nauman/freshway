import React from "react";
import Navbar from "./Navbar";

const LandingPage = () => {
  return (
    <div className="relative min-h-screen w-screen flex flex-col items-center justify-start font-sans" style={{ backgroundImage: "url('/bg.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
      {/* Overlay for white tint (brighter) */}
      <div className="absolute top-0 left-0 w-full h-full bg-white/75 z-0" />
      {/* Navigation Bar */}
      <Navbar />
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center mt-16 relative z-10 w-full px-2 sm:px-4 md:px-0">
        <h1 className="text-[2rem] sm:text-[2.5rem] md:text-[44px] font-bold text-[#1a2a3a] mb-3 mt-10 text-center leading-tight">
          Monitor Fish Freshness Efficiently
        </h1>
        <p className="text-base sm:text-lg md:text-[20px] text-[#3a4a5a] mb-9 text-center max-w-xl">
          Check the freshness of fish accurately at your designated locations.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3 w-full sm:w-auto justify-center items-center">
          <button className="bg-[#3a7bd5] text-white border-none rounded-md py-3 px-10 font-semibold text-lg shadow-sm cursor-pointer hover:bg-[#255bb5] transition w-full sm:w-auto">
            Sign In
          </button>
          <button className="bg-white text-[#3a7bd5] border border-[#dbeafe] rounded-md py-3 px-10 font-semibold text-lg shadow-sm cursor-pointer hover:bg-[#f1f5fa] transition w-full sm:w-auto">
            Sign Up
          </button>
        </div>
        <div className="text-[#b0b8c1] font-medium mb-8">or</div>
        {/* Features Row */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 bg-white/95 rounded-xl shadow-lg p-4 sm:p-8 mt-6 mb-8 w-full max-w-4xl items-center justify-center">
          {/* Feature 1 */}
          <div className="flex flex-col items-center min-w-35 sm:min-w-45 mb-4 md:mb-0">
            <span className="text-3xl sm:text-4xl mb-2">📍</span>
            <div className="font-bold text-base sm:text-lg text-[#1a2a3a] mb-1">Designated Areas</div>
            <div className="text-[#3a4a5a] text-xs sm:text-sm text-center">Set locations for precise monitoring.</div>
          </div>
          {/* Feature 2 */}
          <div className="flex flex-col items-center min-w-35 sm:min-w-45 mb-4 md:mb-0">
            <span className="text-3xl sm:text-4xl mb-2">📷</span>
            <div className="font-bold text-base sm:text-lg text-[#1a2a3a] mb-1">Capture and Analyze</div>
            <div className="text-[#3a4a5a] text-xs sm:text-sm text-center">Upload fish eye photos, for freshness assessment.</div>
          </div>
          {/* Feature 3 */}
          <div className="flex flex-col items-center min-w-35 sm:min-w-45">
            <span className="text-3xl sm:text-4xl mb-2">✅</span>
            <div className="font-bold text-base sm:text-lg text-[#1a2a3a] mb-1">Clear Results</div>
            <div className="text-[#3a4a5a] text-xs sm:text-sm text-center">View easy-to-understand freshness statuses.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;