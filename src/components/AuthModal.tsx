import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  X,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  LogOut,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    currentUser,
    login,
    signup,
    logout,
    users,
    switchUser,
    showAuthModal,
    setShowAuthModal,
  } = useAuth();

  const [mode, setMode] = useState<'profile' | 'login' | 'signup'>('profile');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  if (!showAuthModal) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = login(username, password);
    if (!res.success) {
      setError(res.message || 'Login failed');
      return;
    }

    setShowAuthModal(false);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = signup({
      username,
      password,
      email,
      name,
      signupProvider: 'local',
    });

    if (!res.success) {
      setError(res.message || 'Signup failed');
      return;
    }

    setShowAuthModal(false);
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="auth-modal-content"
        className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-100">
                User Account & Switcher
              </h2>
              <p className="text-[11px] text-stone-400">
                {currentUser ? `Signed in as @${currentUser.username}` : 'Manage authentication'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAuthModal(false)}
            className="text-stone-400 hover:text-stone-100 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {currentUser && (
            <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-100 block font-mono">@{currentUser.username}</span>
                <span className="text-[11px] text-stone-400 block">{currentUser.name} ({currentUser.email})</span>
                <span className="text-[10px] font-mono text-amber-400 mt-1 block">
                  {currentUser.unlimitedAccess ? 'Unlimited Credits (Admin)' : `${currentUser.credits} Credits Remaining`}
                </span>
              </div>
              <button
                onClick={() => {
                  logout();
                  setShowAuthModal(false);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-rose-400 rounded-lg text-xs transition-colors border border-stone-700"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800 text-xs">
            <button
              onClick={() => {
                setMode('profile');
                setError('');
              }}
              className={`py-1.5 rounded-lg font-medium transition-all ${
                mode === 'profile' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Account Info
            </button>
            <button
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-1.5 rounded-lg font-medium transition-all ${
                mode === 'login' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Switch / Sign In
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError('');
              }}
              className={`py-1.5 rounded-lg font-medium transition-all ${
                mode === 'signup' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              New Account
            </button>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/70 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'profile' && currentUser && (
            <div className="space-y-3">
              <div className="p-3 bg-stone-950/70 rounded-xl border border-stone-800 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Username</span>
                  <span className="font-mono text-stone-200 font-bold">@{currentUser.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Account Type</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {currentUser.unlimitedAccess ? 'Super Admin (Unlimited Access)' : 'Standard Creator'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Remaining Balance</span>
                  <span className="font-mono text-stone-200 font-bold">
                    {currentUser.unlimitedAccess ? '∞ Credits' : `${currentUser.credits} Credits`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 transition-colors"
                >
                  Sign in with Another User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setShowAuthModal(false);
                  }}
                  className="py-2 px-4 bg-red-950/40 hover:bg-red-900/50 text-red-300 rounded-xl text-xs font-semibold border border-red-800/60 transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/20"
              >
                Log In
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="Choose username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Choose password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/20"
              >
                Create Account
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
