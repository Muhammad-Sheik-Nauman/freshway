import React from "react";

const Navbar = () => {
  return (
    <nav className="w-full flex justify-between items-center px-4 md:px-[8vw] bg-white/75 sticky top-0 z-30 shadow-md border-b border-slate-200 backdrop-blur-md">
      <div className="flex items-center gap-4 md:gap-8">
        <img src="/logo.png" alt="Logo" className="h-14 md:h-18 mr-4 md:mr-6" />
        <a href="#" className="hidden sm:inline font-semibold text-[#1a2a3a] border-b-2 border-[#3a7bd5] pb-1">Home</a>
        <a href="#" className="hidden sm:inline text-[#1a2a3a] no-underline">About</a>
        <a href="#" className="hidden sm:inline text-[#1a2a3a] no-underline">How It Works</a>
        <a href="#" className="hidden sm:inline text-[#1a2a3a] no-underline">Contact</a>
      </div>
      <button className="bg-[#3a7bd5] text-white border-none rounded-md py-2 px-5 md:px-7 font-semibold text-base cursor-pointer shadow-sm hover:bg-[#255bb5] transition ml-4 md:ml-8">
        Sign In
      </button>
    </nav>
  );
};

export default Navbar;