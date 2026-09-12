import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Film,
  Lock,
  User,
  Mail,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, signup, resetPasswordWithRecovery } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [socialProviderSelected, setSocialProviderSelected] = useState<string | null>(null);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Recovery modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = login(loginUsername, loginPassword);
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleQuickUserLogin = () => {
    setLoginUsername('creator');
    setLoginPassword('user123');
    const res = login('creator', 'user123');
    if (!res.success) {
      setError(res.message || 'User login failed.');
    }
  };

  const handleSocialSelect = (provider: 'google' | 'microsoft' | 'github' | 'apple') => {
    setSocialProviderSelected(provider);
    const mockEmail =
      provider === 'google'
        ? 'creator@gmail.com'
        : provider === 'microsoft'
        ? 'creator@outlook.com'
        : provider === 'github'
        ? 'creator@github.com'
        : 'creator@icloud.com';

    setSignupEmail(mockEmail);
    setSignupName(provider.charAt(0).toUpperCase() + provider.slice(1) + ' User');
    setSignupUsername(provider + '_user_' + Math.floor(1000 + Math.random() * 9000));
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!signupUsername.trim() || !signupPassword.trim()) {
      setError('Please set a valid username and password to log in.');
      setIsSubmitting(false);
      return;
    }

    const res = signup({
      username: signupUsername,
      password: signupPassword,
      email: signupEmail,
      name: signupName,
      signupProvider: (socialProviderSelected as any) || 'local',
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.message || 'Registration failed.');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryInput.trim() || !newPasswordInput.trim()) {
      setRecoveryStatus({ success: false, message: 'Please provide your username/email and a new password.' });
      return;
    }

    const res = resetPasswordWithRecovery(recoveryInput, newPasswordInput);
    if (res.success) {
      setRecoveryStatus({ success: true, message: 'Password updated successfully! You can now log in.' });
      setTimeout(() => {
        setShowForgotModal(false);
        setRecoveryStatus(null);
        setLoginPassword(newPasswordInput);
      }, 1800);
    } else {
      setRecoveryStatus({ success: false, message: res.message || 'Account recovery failed.' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-stone-950 text-stone-100 flex flex-col justify-center items-center p-4 relative selection:bg-amber-500/30 selection:text-amber-200">
      {/* Subtle background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-stone-900/90 border border-stone-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.35)] mx-auto mb-3">
            <Film className="w-6 h-6 fill-stone-950" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-stone-100">Video Looper Studio</h1>
          <p className="text-xs text-stone-400 mt-1">
            Gapless AI video crossfade dissolve & seamless loop generator
          </p>
        </div>

        {/* Auth Mode Toggle Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800 mb-5 text-xs font-semibold">
          <button
            type="button"
            id="tab-login-btn"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            id="tab-signup-btn"
            onClick={() => {
              setMode('signup');
              setError(null);
              setSocialProviderSelected(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/70 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* SIGN IN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-stone-500" />
                <input
                  id="input-login-username"
                  type="text"
                  required
                  placeholder="Enter your username or email"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-stone-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setRecoveryInput(loginUsername || 'mohammadyusuf8868@gmail.com');
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-stone-500" />
                <input
                  id="input-login-password"
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>Sign In to Studio</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleQuickUserLogin}
                className="text-[11px] text-stone-400 hover:text-stone-300 transition-colors"
              >
                Or test with standard account: <span className="font-mono text-amber-400">creator / user123</span>
              </button>
            </div>
          </form>
        )}

        {/* SIGN UP FLOW */}
        {mode === 'signup' && (
          <div className="space-y-4">
            {!socialProviderSelected ? (
              <>
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block text-center">
                    Sign up with your preferred service
                  </span>

                  {/* Google Button */}
                  <button
                    type="button"
                    onClick={() => handleSocialSelect('google')}
                    className="w-full flex items-center justify-center space-x-2.5 py-2.5 px-4 bg-stone-950 hover:bg-stone-800/80 border border-stone-800 rounded-xl text-xs font-semibold text-stone-200 transition-all group"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  {/* Microsoft Button */}
                  <button
                    type="button"
                    onClick={() => handleSocialSelect('microsoft')}
                    className="w-full flex items-center justify-center space-x-2.5 py-2.5 px-4 bg-stone-950 hover:bg-stone-800/80 border border-stone-800 rounded-xl text-xs font-semibold text-stone-200 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <rect fill="#F25022" x="1" y="1" width="10" height="10" />
                      <rect fill="#7FBA00" x="13" y="1" width="10" height="10" />
                      <rect fill="#00A4EF" x="1" y="13" width="10" height="10" />
                      <rect fill="#FFB900" x="13" y="13" width="10" height="10" />
                    </svg>
                    <span>Continue with Microsoft</span>
                  </button>

                  {/* GitHub & Apple row */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSocialSelect('github')}
                      className="flex items-center justify-center space-x-2 py-2 px-3 bg-stone-950 hover:bg-stone-800/80 border border-stone-800 rounded-xl text-xs font-medium text-stone-300 transition-all"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      <span>GitHub</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSocialSelect('apple')}
                      className="flex items-center justify-center space-x-2 py-2 px-3 bg-stone-950 hover:bg-stone-800/80 border border-stone-800 rounded-xl text-xs font-medium text-stone-300 transition-all"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.65-.79 1.1-1.88.98-2.97-.94.04-2.09.63-2.76 1.42-.59.68-1.11 1.78-.97 2.85 1.05.08 2.1-.51 2.75-1.3" />
                      </svg>
                      <span>Apple ID</span>
                    </button>
                  </div>
                </div>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-stone-800 w-full" />
                  <span className="bg-stone-900 px-3 text-[10px] text-stone-500 uppercase font-mono tracking-wider absolute">
                    or custom account
                  </span>
                </div>
              </>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-xs font-semibold text-stone-100">
                      Connected with {socialProviderSelected.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-stone-400 block">{signupEmail}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSocialProviderSelected(null)}
                  className="text-[11px] text-amber-400 underline"
                >
                  Change
                </button>
              </div>
            )}

            {/* Set Username and Password - strictly required by user request */}
            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Studio"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {!socialProviderSelected && (
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Crucial: choose username & password to log in every time */}
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Set Your Studio Login Credentials</span>
                </div>
                <p className="text-[11px] text-stone-400">
                  You will use this unique username and password to log in to Video Looper every time.
                </p>

                <div>
                  <label className="block text-[11px] font-medium text-stone-300 mb-1">
                    Choose Username
                  </label>
                  <input
                    id="input-signup-username"
                    type="text"
                    required
                    placeholder="e.g. creator99"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-300 mb-1">
                    Choose Password
                  </label>
                  <input
                    id="input-signup-password"
                    type="password"
                    required
                    placeholder="Create a secure password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <button
                id="btn-complete-signup"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Account & Get 5 Free Credits</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* RECOVERY / FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-100">Password Recovery</h3>
                <p className="text-[11px] text-stone-400">Reset your password via recovery email</p>
              </div>
            </div>

            {recoveryStatus && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  recoveryStatus.success
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                }`}
              >
                {recoveryStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{recoveryStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Username or Recovery Email
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your username or recovery email"
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Enter New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-lg text-xs transition-colors"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
