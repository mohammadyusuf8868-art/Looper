import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { QRCodeDisplay } from './QRCodeDisplay';
import {
  ShieldCheck,
  QrCode,
  Users,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Minus,
  Save,
  Upload,
  X,
  Sparkles,
  Phone,
  DollarSign,
  KeyRound,
  Lock,
  Mail,
  User,
  AlertCircle,
} from 'lucide-react';

export const AdminPanelModal: React.FC = () => {
  const {
    currentUser,
    users,
    paymentConfig,
    paymentRequests,
    isAdmin,
    showAdminModal,
    setShowAdminModal,
    updatePaymentConfig,
    updateUserCredits,
    changeAdminCredentials,
    reviewPayment,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'security' | 'qr' | 'users' | 'transactions'>('security');

  // Admin Security tab state
  const [newAdminUsername, setNewAdminUsername] = useState(currentUser?.username || 'yusufadmin');
  const [newAdminPassword, setNewAdminPassword] = useState(currentUser?.password || 'yusuf2121@admin');
  const [newRecoveryEmail, setNewRecoveryEmail] = useState(currentUser?.recoveryEmail || paymentConfig.recoveryEmail || 'mohammadyusuf8868@gmail.com');
  const [securitySaved, setSecuritySaved] = useState(false);

  // Payment Setup tab state
  const [upiId, setUpiId] = useState(paymentConfig.upiId);
  const [phoneNumber, setPhoneNumber] = useState(paymentConfig.phoneNumber);
  const [qrCodeUrl, setQrCodeUrl] = useState(paymentConfig.qrCodeUrl || '');
  const [autoApprove, setAutoApprove] = useState(paymentConfig.autoApprove);
  const [note, setNote] = useState(paymentConfig.note);
  const [paymentSaved, setPaymentSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!showAdminModal || !isAdmin) return null;

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    const res = changeAdminCredentials(newAdminUsername, newAdminPassword, newRecoveryEmail);
    if (res.success) {
      setSecuritySaved(true);
      setTimeout(() => setSecuritySaved(false), 2500);
    }
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    updatePaymentConfig({
      upiId,
      phoneNumber,
      qrCodeUrl,
      autoApprove,
      note,
      ratePerCredit: 1, // 1 INR = 1 Credit strictly maintained
    });
    setPaymentSaved(true);
    setTimeout(() => setPaymentSaved(false), 2500);
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setQrCodeUrl(result);
        updatePaymentConfig({ qrCodeUrl: result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      id="admin-panel-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="admin-panel-modal"
        className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-stone-100">Super Admin Center</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  yusufadmin
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Receiving UPI payments to <span className="font-mono text-amber-400 font-semibold">{paymentConfig.upiId}</span>
              </p>
            </div>
          </div>
          <button
            id="close-admin-panel"
            onClick={() => setShowAdminModal(false)}
            className="text-stone-400 hover:text-stone-100 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-950/30 px-6 gap-2 pt-2 overflow-x-auto">
          <button
            id="tab-security"
            onClick={() => setActiveTab('security')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'security'
                ? 'border-amber-500 text-amber-400 bg-stone-900/60 rounded-t-lg'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Admin Username, Password & Recovery</span>
          </button>

          <button
            id="tab-payment-qr"
            onClick={() => setActiveTab('qr')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'qr'
                ? 'border-amber-500 text-amber-400 bg-stone-900/60 rounded-t-lg'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>My UPI ID & QR Code (1 Credit = ₹1)</span>
          </button>

          <button
            id="tab-users-credits"
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'users'
                ? 'border-amber-500 text-amber-400 bg-stone-900/60 rounded-t-lg'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Accounts & Credits ({users.length})</span>
          </button>

          <button
            id="tab-transactions"
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-all relative ${
              activeTab === 'transactions'
                ? 'border-amber-500 text-amber-400 bg-stone-900/60 rounded-t-lg'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment Log</span>
            {paymentRequests.filter((p) => p.status === 'pending').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-1" />
            )}
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 1. SECURITY TAB: CHANGE USERNAME, PASSWORD, RECOVERY EMAIL */}
          {activeTab === 'security' && (
            <div className="max-w-xl space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Admin Credentials & Account Recovery
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Manage your admin login credentials and recovery email. Use your recovery email anytime to recover access if you forget your password.
                </p>
              </div>

              <form onSubmit={handleSaveSecurity} className="space-y-4 bg-stone-950/70 p-5 rounded-xl border border-stone-800">
                {/* Admin Username */}
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Admin Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
                    <input
                      id="input-change-admin-username"
                      type="text"
                      required
                      value={newAdminUsername}
                      onChange={(e) => setNewAdminUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    Current: <span className="font-mono text-amber-400">{currentUser?.username}</span>
                  </span>
                </div>

                {/* Admin Password */}
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Admin Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
                    <input
                      id="input-change-admin-password"
                      type="text"
                      required
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    Keep this secure. Use recovery email if forgotten.
                  </span>
                </div>

                {/* Recovery Email */}
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Recovery Email (For Forgot Password)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
                    <input
                      id="input-change-recovery-email"
                      type="email"
                      required
                      value={newRecoveryEmail}
                      onChange={(e) => setNewRecoveryEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    If you ever forget your password at the login screen, enter this email to reset it immediately.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-amber-500/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Admin Credentials</span>
                  </button>

                  {securitySaved && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4" /> Credentials Updated!
                    </span>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* 2. PAYMENT & UPI ID TAB */}
          {activeTab === 'qr' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleSavePayment} className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    My Receiving UPI ID & QR Code
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    All user payments are transferred directly to your UPI ID and Phone Number. Users pay <strong>1 Rs = 1 Credit</strong>.
                  </p>
                </div>

                {/* UPI ID */}
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Your UPI ID (Where Users Send Money)
                  </label>
                  <input
                    id="input-upi-id"
                    type="text"
                    required
                    placeholder="yourname@okhdfcbank or yourname@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    All QR codes and 1-click payment links (GPay, PhonePe, Paytm) will pay to this UPI address.
                  </span>
                </div>

                {/* Receiving Phone Number */}
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Your Phone Number (Google Pay / PhonePe / Paytm)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
                    <input
                      id="input-phone-number"
                      type="text"
                      required
                      placeholder="+91 9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                {/* Embed Custom QR Code */}
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Embed Your Personal QR Code Image
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleQrUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium transition-colors border border-stone-700"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Upload My UPI QR (PNG / JPG)</span>
                    </button>
                    {qrCodeUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setQrCodeUrl('');
                          updatePaymentConfig({ qrCodeUrl: '' });
                        }}
                        className="px-3 py-2 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 rounded-lg text-xs transition-colors border border-rose-800/40"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Or paste QR image link (https://...)"
                    value={qrCodeUrl}
                    onChange={(e) => setQrCodeUrl(e.target.value)}
                    className="w-full mt-2 px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-[11px] text-stone-300 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {/* Rate Notice */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 font-mono">
                  Standard Rate: 1 INR (₹1) = 1 Loop Credit
                </div>

                {/* Auto Approve Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-stone-950 border border-stone-800">
                  <div>
                    <span className="text-xs font-medium text-stone-200 block">Instant Credit Delivery</span>
                    <span className="text-[10px] text-stone-500 block">
                      Credits are added instantly when the user submits their UTR number.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoApprove(!autoApprove)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      autoApprove ? 'bg-amber-500 justify-end' : 'bg-stone-700 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-stone-950 shadow" />
                  </button>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-amber-500/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Payment Info</span>
                  </button>
                  {paymentSaved && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4" /> Payment Settings Saved!
                    </span>
                  )}
                </div>
              </form>

              {/* Live Preview of QR Card */}
              <div className="flex flex-col items-center justify-center p-4 bg-stone-950/60 rounded-xl border border-stone-800">
                <span className="text-xs text-stone-400 mb-3 font-medium uppercase tracking-wider">
                  Live Customer Payment Card
                </span>
                <QRCodeDisplay
                  qrCodeUrl={qrCodeUrl}
                  upiId={upiId}
                  phoneNumber={phoneNumber}
                  amount={100}
                />
              </div>
            </div>
          )}

          {/* 3. USERS & CREDIT BALANCES */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-stone-200">Registered Users & Credit Adjuster</h3>
                  <p className="text-xs text-stone-400">
                    Each user has their own separate projects and data. Modify balances or grant unlimited access below.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-stone-800 rounded-xl bg-stone-950">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-900 border-b border-stone-800 text-stone-400 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Username & Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 text-center">Current Credits</th>
                      <th className="px-4 py-3 text-right">Credit Adjuster</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {users.map((u) => {
                      const isUserAdmin = u.role === 'admin' || u.username.toLowerCase() === 'yusufadmin';
                      return (
                        <tr key={u.id} className="hover:bg-stone-900/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-stone-100 font-mono">@{u.username}</div>
                            <div className="text-[11px] text-stone-400">{u.name}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-stone-400 text-[11px]">
                            {u.email}
                          </td>
                          <td className="px-4 py-3">
                            {isUserAdmin ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                                Admin (Free ∞)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-800 text-stone-400">
                                Standard User
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isUserAdmin ? (
                              <span className="font-mono text-amber-400 font-bold text-base">∞</span >
                            ) : (
                              <span className="font-mono font-bold text-stone-200 text-sm">{u.credits}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isUserAdmin ? (
                              <span className="text-[11px] text-stone-500 italic">Always Free</span>
                            ) : (
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => updateUserCredits(u.id, Math.max(0, u.credits - 5))}
                                  className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-mono transition-colors"
                                  title="Deduct 5 credits"
                                >
                                  -5
                                </button>
                                <button
                                  onClick={() => updateUserCredits(u.id, u.credits + 25)}
                                  className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-mono transition-colors"
                                  title="Add 25 credits"
                                >
                                  +25
                                </button>
                                <button
                                  onClick={() => updateUserCredits(u.id, u.credits + 100)}
                                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-mono transition-colors border border-amber-500/30"
                                  title="Add 100 credits"
                                >
                                  +100
                                </button>
                                <button
                                  onClick={() => updateUserCredits(u.id, 9999, true)}
                                  className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-medium transition-colors border border-emerald-500/30"
                                  title="Grant Unlimited"
                                >
                                  VIP Pass
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. TRANSACTION LOG */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-stone-200">Customer UPI Payment Ledger</h3>
                <p className="text-xs text-stone-400">
                  Payments transferred to your UPI ID (<span className="font-mono text-amber-400">{paymentConfig.upiId}</span>).
                </p>
              </div>

              {paymentRequests.length === 0 ? (
                <div className="p-8 text-center bg-stone-950 rounded-xl border border-stone-800 text-stone-500 text-xs">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-stone-600" />
                  No payment requests submitted yet.
                </div>
              ) : (
                <div className="overflow-x-auto border border-stone-800 rounded-xl bg-stone-950">
                  <table className="w-full text-left text-xs text-stone-300">
                    <thead className="bg-stone-900 border-b border-stone-800 text-stone-400 font-mono uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Amount Paid</th>
                        <th className="px-4 py-3">Credits</th>
                        <th className="px-4 py-3">UTR / Ref</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60">
                      {paymentRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-stone-900/40">
                          <td className="px-4 py-3 font-mono text-stone-400 text-[11px]">
                            {new Date(req.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-stone-100 font-mono">@{req.username}</div>
                            <div className="text-[11px] text-stone-500">{req.userEmail}</div>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-amber-400">
                            ₹{req.amount}
                          </td>
                          <td className="px-4 py-3 font-mono text-emerald-400 font-semibold">
                            +{req.creditsGranted}
                          </td>
                          <td className="px-4 py-3 font-mono text-stone-300 bg-stone-900/30 px-2 rounded">
                            {req.transactionRef}
                          </td>
                          <td className="px-4 py-3">
                            {req.status === 'approved' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" /> Approved
                              </span>
                            )}
                            {req.status === 'pending' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                            {req.status === 'rejected' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {req.status === 'pending' ? (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => reviewPayment(req.id, 'approved')}
                                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded text-[11px] transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => reviewPayment(req.id, 'rejected')}
                                  className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[11px] transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-stone-500">Completed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
