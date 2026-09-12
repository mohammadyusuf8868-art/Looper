import React, { useState } from 'react';
import { Copy, Check, QrCode } from 'lucide-react';

interface QRCodeDisplayProps {
  qrCodeUrl?: string;
  upiId: string;
  phoneNumber: string;
  amount: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrCodeUrl,
  upiId,
  phoneNumber,
  amount,
}) => {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const copyToClipboard = (text: string, type: 'upi' | 'phone') => {
    navigator.clipboard.writeText(text);
    if (type === 'upi') {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center bg-stone-950 p-5 rounded-2xl border border-stone-800 text-stone-200 w-full max-w-sm mx-auto shadow-inner">
      {/* Amount Tag */}
      <div className="mb-3 text-center">
        <span className="text-xs text-stone-400 font-medium">Payment Due</span>
        <div className="text-3xl font-bold font-mono text-amber-400">₹{amount}</div>
        <div className="text-[11px] text-stone-500">Scan via GPay / PhonePe / Paytm</div>
      </div>

      {/* QR Code Container */}
      <div className="relative p-3 bg-white rounded-xl shadow-lg border border-stone-200 mb-4 flex items-center justify-center min-w-[200px] min-h-[200px]">
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt="Payment QR Code"
            className="w-48 h-48 object-contain rounded-lg"
          />
        ) : (
          /* High-contrast stylized UPI QR SVG if no image uploaded yet */
          <div className="flex flex-col items-center justify-center p-2 text-stone-900 text-center">
            <div className="relative w-44 h-44 bg-stone-50 rounded-lg p-2 border-2 border-stone-800 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full text-stone-900 fill-current">
                {/* Simulated high-fidelity 2D matrix QR pattern */}
                <rect x="0" y="0" width="28" height="28" fill="#000" />
                <rect x="4" y="4" width="20" height="20" fill="#fff" />
                <rect x="8" y="8" width="12" height="12" fill="#000" />

                <rect x="72" y="0" width="28" height="28" fill="#000" />
                <rect x="76" y="4" width="20" height="20" fill="#fff" />
                <rect x="80" y="8" width="12" height="12" fill="#000" />

                <rect x="0" y="72" width="28" height="28" fill="#000" />
                <rect x="4" y="76" width="20" height="20" fill="#fff" />
                <rect x="8" y="80" width="12" height="12" fill="#000" />

                {/* Grid modules */}
                <rect x="36" y="8" width="8" height="8" fill="#000" />
                <rect x="48" y="16" width="8" height="8" fill="#000" />
                <rect x="36" y="28" width="8" height="8" fill="#000" />
                <rect x="56" y="28" width="8" height="8" fill="#000" />
                <rect x="12" y="38" width="8" height="8" fill="#000" />
                <rect x="24" y="46" width="8" height="8" fill="#000" />
                <rect x="38" y="44" width="14" height="14" fill="#000" />
                <rect x="62" y="44" width="8" height="8" fill="#000" />
                <rect x="76" y="36" width="8" height="8" fill="#000" />
                <rect x="44" y="66" width="8" height="8" fill="#000" />
                <rect x="64" y="66" width="8" height="8" fill="#000" />
                <rect x="82" y="76" width="8" height="8" fill="#000" />
                <rect x="72" y="88" width="8" height="8" fill="#000" />
                <rect x="36" y="82" width="8" height="8" fill="#000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="bg-amber-500 text-stone-950 text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                  ₹{amount}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-stone-500 font-mono mt-1">Scan or use details below</span>
          </div>
        )}
      </div>

      {/* UPI ID / Phone Details */}
      <div className="w-full space-y-2 text-xs">
        {upiId && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-stone-900 border border-stone-800">
            <div className="truncate mr-2">
              <span className="text-[10px] text-stone-500 block">UPI ID</span>
              <span className="font-mono text-stone-200 font-semibold">{upiId}</span>
            </div>
            <button
              onClick={() => copyToClipboard(upiId, 'upi')}
              className="p-1.5 text-stone-400 hover:text-amber-400 bg-stone-800 hover:bg-stone-700 rounded-md transition-colors"
              title="Copy UPI ID"
            >
              {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {phoneNumber && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-stone-900 border border-stone-800">
            <div className="truncate mr-2">
              <span className="text-[10px] text-stone-500 block">Phone / GPay / PhonePe Number</span>
              <span className="font-mono text-stone-200 font-semibold">{phoneNumber}</span>
            </div>
            <button
              onClick={() => copyToClipboard(phoneNumber, 'phone')}
              className="p-1.5 text-stone-400 hover:text-amber-400 bg-stone-800 hover:bg-stone-700 rounded-md transition-colors"
              title="Copy Phone Number"
            >
              {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
