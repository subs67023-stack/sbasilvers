import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const UnderProgress = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login');
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.15), transparent 70%), radial-gradient(ellipse at bottom, rgba(168, 85, 247, 0.15), transparent 70%)'
      }}
    >
      {/* Top Navbar */}
      <header className="w-full border-b border-white/10 bg-black/40 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">👑</span>
            <div>
              <span className="text-xl font-bold tracking-wider text-white">ARGENTUM</span>
              <span className="block text-xs text-gray-400">Silver Grace Jewelry</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all shadow-md"
              >
                Go to Admin Panel →
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-red-600/90 hover:bg-red-700 text-white font-medium rounded-lg transition-all shadow-md flex items-center gap-2"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-xl w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 sm:p-10 shadow-2xl text-center relative">
          {/* Decorative Badge */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-4xl shadow-lg mb-6 ring-4 ring-amber-500/20 animate-pulse">
            🚧
          </div>

          <div className="inline-block px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4">
            Under Progress • प्रगतीपथावर आहे
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
            Store Under Progress
          </h1>
          <p className="text-lg text-amber-200/90 font-medium mb-4">
            आमचे ऑनलाइन स्टोअर लवकरच नवीन स्वरूपात सुरू होत आहे!
          </p>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-8">
            The customer portal and public online storefront are currently undergoing updates and enhancements. All product catalogs, inventory, and online purchases are being synchronized.
          </p>

          {/* User Profile Card */}
          {user && (
            <div className="bg-black/30 border border-white/10 rounded-2xl p-5 mb-8 text-left">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  Logged In Account
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 border border-blue-400/30 text-blue-300 capitalize">
                  {user.role || 'User'}
                </span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between text-gray-200">
                  <span className="text-gray-400">Name:</span>
                  <span className="font-medium text-white">{user.firstName} {user.lastName || ''}</span>
                </div>
                <div className="flex items-center justify-between text-gray-200">
                  <span className="text-gray-400">Email:</span>
                  <span className="font-medium text-white">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center justify-between text-gray-200">
                    <span className="text-gray-400">Phone:</span>
                    <span className="font-medium text-white">{user.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleLogout}
              className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>🚪</span>
              <span>Logout Account</span>
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200"
              >
                Go to Admin Dashboard →
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-black/40 backdrop-blur-md px-6 py-4 text-center text-xs text-gray-400">
        ARGENTUM Jewellery &copy; {new Date().getFullYear()} • All rights reserved.
      </footer>
    </div>
  );
};

export default UnderProgress;

