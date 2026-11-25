import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-gray-900 to-black text-white px-4 select-none">
      {/* Background ambient lighting */}
      <div className="absolute w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -bottom-10 -right-10"></div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        {/* Animated Silver Dual Rings with Diamond */}
        <div className="relative flex items-center justify-center w-28 h-28 mb-6">
          {/* Outer Pulsing Glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-500/30 to-purple-500/20 blur-md animate-pulse"></div>

          {/* Outer Rotating Metallic Ring */}
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-blue-400/50 border-b-transparent border-l-cyan-300 animate-spin"
            style={{ animationDuration: '2s' }}
          ></div>

          {/* Inner Counter-Rotating Ring */}
          <div
            className="absolute inset-2.5 rounded-full border-2 border-transparent border-b-purple-400 border-l-pink-400/60 border-t-transparent border-r-purple-300 animate-spin"
            style={{ animationDuration: '3s', animationDirection: 'reverse' }}
          ></div>

          {/* Center Jewel Icon */}
          <div className="relative text-3xl select-none filter drop-shadow-[0_0_14px_rgba(59,130,246,0.7)] animate-bounce-slow">
            💎
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gray-100 via-cyan-200 to-gray-300 uppercase mb-1">
          SBA SILVERS
        </h1>
        <p className="text-xs font-medium tracking-wider text-gray-400 uppercase mb-5">
          Shree Basaveshwar Agarbatti & Silvers
        </p>

        {/* Minimalist Shimmer Bar */}
        <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden shadow-inner relative">
          <div className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
        </div>

        {/* Loading text with animated dots */}
        <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400 tracking-wide">
          <span>Loading</span>
          <span className="inline-flex">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
