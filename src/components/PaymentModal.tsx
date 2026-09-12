import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { QRCodeDisplay } from './QRCodeDisplay';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Zap,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export const PaymentModal: React.FC = () => {
  const {
    currentUser,
    paymentConfig,
    showPaymentModal,
    setShowPaymentModal,
    buyCredits,
    isAdmin,
  } = useAuth();

  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [selectedMethod, setSelectedMethod] = useState<'upi_qr' | 'gpay' | 'phonepe' | 'paytm'>('upi_qr');
  const [transactionRef, setTransactionRef] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [autoApproved, setAutoApproved] = useState(false);

  if (!showPaymentModal || !currentUser) return null;

  const currentPrice = isCustom ? Number(customAmount) || 1 : selectedAmount;
  const creditsToReceive = currentPrice * paymentConfig.ratePerCredit; // 1 Rs = 1 Credit

  // UPI deep link URI
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(
    paymentConfig.upiId
  )}&pn=${encodeURIComponent('Video Looper')}&am=${currentPrice}&cu=INR&tn=${encodeURIComponent(
    `Credits for @${currentUser.username}`
  )}`;

  const handlePackageSelect = (amount: number) => {
    setIsCustom(false);
    setSelectedAmount(amount);
  };

  const handleCustomSelect = () => {
    setIsCustom(true);
    if (!customAmount) {
      setCustomAmount('150');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionRef.trim() || transactionRef.trim().length < 4) {
      setError('Please enter your 12-digit UTR, Transaction ID, or phone number used to pay.');
      return;
    }
    setError('');

    const res = buyCredits(currentPrice, transactionRef, selectedMethod);
    setAutoApproved(res.autoApproved);
    setSubmitted(true);
  };

  return (
    <div
      id="payment-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="payment-modal-content"
        className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">Buy Loop Credits (₹1 = 1 Credit)</h2>
              <p className="text-xs text-stone-400">
                Account: <span className="font-mono text-stone-300 font-semibold">@{currentUser.username}</span> • Current Balance: <span className="font-mono text-amber-400 font-semibold">{currentUser.credits}</span>
              </p>
            </div>
          </div>
          <button
            id="close-payment-modal"
            onClick={() => {
              setShowPaymentModal(false);
              setSubmitted(false);
            }}
            className="text-stone-400 hover:text-stone-100 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-stone-100">
                {autoApproved ? `+${creditsToReceive} Credits Added Successfully!` : 'Payment Submitted for Verification'}
              </h3>
              <p className="text-xs text-stone-300 max-w-sm mx-auto leading-relaxed">
                {autoApproved
                  ? `Payment of ₹${currentPrice} received. Your account (@${currentUser.username}) has been topped up with ${creditsToReceive} credits!`
                  : `Your transaction reference has been logged. Admin will credit your account (${creditsToReceive} credits) shortly.`}
              </p>
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs font-mono text-stone-400">
                Transferred to: <span className="text-amber-400 font-bold">{paymentConfig.upiId}</span> • UTR: {transactionRef}
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSubmitted(false);
                  setTransactionRef('');
                }}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-amber-500/20"
              >
                Back to Studio & Export
              </button>
            </div>
          ) : (
            <>
              {/* Select Package - 1 Rs = 1 Credit */}
              <div>
                <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider block mb-2">
                  1. Select Credit Package (1 Rs = 1 Credit)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {paymentConfig.packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => handlePackageSelect(pkg.priceInr)}
                      className={`p-3 rounded-xl border text-left transition-all relative ${
                        !isCustom && selectedAmount === pkg.priceInr
                          ? 'bg-amber-500/15 border-amber-500/80 text-stone-100 shadow-md'
                          : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {pkg.popular && (
                        <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-400 text-stone-950">
                          Popular
                        </span>
                      )}
                      <div className="text-sm font-bold font-mono text-stone-100">
                        {pkg.credits} Credits
                      </div>
                      <div className="text-xs font-mono text-amber-400 font-semibold mt-0.5">
                        ₹{pkg.priceInr}
                      </div>
                      <div className="text-[10px] text-stone-500 mt-1">{pkg.label}</div>
                    </button>
                  ))}
                </div>

                {/* Custom Amount option */}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCustomSelect}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isCustom
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-stone-950 border-stone-800 text-stone-400'
                    }`}
                  >
                    Custom Amount
                  </button>
                  {isCustom && (
                    <div className="flex items-center gap-2 flex-1 animate-in fade-in">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2 text-stone-500 font-mono text-xs">₹</span>
                        <input
                          type="number"
                          min="1"
                          placeholder="e.g. 75"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <span className="text-xs font-mono text-amber-400 whitespace-nowrap">
                        = {Number(customAmount) || 0} Credits
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider block mb-2">
                  2. Choose Payment App / Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('upi_qr')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-all ${
                      selectedMethod === 'upi_qr'
                        ? 'bg-amber-500/20 border-amber-500/80 text-amber-300'
                        : 'bg-stone-950 border-stone-800 text-stone-400'
                    }`}
                  >
                    Scan UPI QR
                  </button>

                  <a
                    href={upiIntentUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setSelectedMethod('gpay')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      selectedMethod === 'gpay'
                        ? 'bg-amber-500/20 border-amber-500/80 text-amber-300'
                        : 'bg-stone-950 border-stone-800 text-stone-300'
                    }`}
                  >
                    <span>Google Pay</span>
                    <ExternalLink className="w-3 h-3 text-stone-500" />
                  </a>

                  <a
                    href={upiIntentUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setSelectedMethod('phonepe')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      selectedMethod === 'phonepe'
                        ? 'bg-amber-500/20 border-amber-500/80 text-amber-300'
                        : 'bg-stone-950 border-stone-800 text-stone-300'
                    }`}
                  >
                    <span>PhonePe</span>
                    <ExternalLink className="w-3 h-3 text-stone-500" />
                  </a>

                  <a
                    href={upiIntentUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setSelectedMethod('paytm')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      selectedMethod === 'paytm'
                        ? 'bg-amber-500/20 border-amber-500/80 text-amber-300'
                        : 'bg-stone-950 border-stone-800 text-stone-300'
                    }`}
                  >
                    <span>Paytm</span>
                    <ExternalLink className="w-3 h-3 text-stone-500" />
                  </a>
                </div>

                {/* QR Code and Payment details directly to admin's UPI ID */}
                <QRCodeDisplay
                  qrCodeUrl={paymentConfig.qrCodeUrl}
                  upiId={paymentConfig.upiId}
                  phoneNumber={paymentConfig.phoneNumber}
                  amount={currentPrice}
                />
              </div>

              {/* Step 3: Transaction ID confirmation */}
              <form onSubmit={handleSubmit} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    3. Enter 12-digit UTR / Txn Reference (or Sender Mobile Number)
                  </label>
                  <input
                    id="input-transaction-ref"
                    type="text"
                    required
                    placeholder="e.g. 423891024819 from Google Pay / PhonePe / Paytm receipt"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  {error && (
                    <div className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {error}
                    </div>
                  )}
                </div>

                <button
                  id="btn-submit-payment"
                  type="submit"
                  className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Verify Payment & Add {creditsToReceive} Credits</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
