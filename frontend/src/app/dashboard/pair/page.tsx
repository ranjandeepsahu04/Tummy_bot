'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { QrCode, RefreshCw, CheckCircle2, Smartphone, ShieldCheck } from 'lucide-react';

export default function PairSecondaryPhonePage() {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [status, setStatus] = useState<string>('CONNECTING');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/webhook/baileys/qr');
      if (res.data?.data) {
        setStatus(res.data.data.status);
        setQrDataUrl(res.data.data.qrDataUrl || '');
      }
    } catch (err) {
      console.error('Failed to fetch QR status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Pair Secondary Phone as WhatsApp Bot</h2>
          <p className="text-sm text-slate-400">Scan this QR code with your secondary phone's WhatsApp to turn it into your live TummyBot!</p>
        </div>

        <button
          onClick={fetchStatus}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-xl">
        {status === 'CONNECTED' ? (
          <div className="py-10 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-950">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-white">Secondary Phone Connected & Active! 🎉</h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Your secondary phone is now acting as the <span className="text-emerald-400 font-semibold">TummyBot WhatsApp Server</span>.
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-w-lg mx-auto text-left text-xs space-y-2 text-slate-400 font-mono">
              <p className="text-emerald-400 font-semibold text-sm">📲 Ready for Live Class Demo:</p>
              <p>1. Open WhatsApp on your <b>Primary Phone</b> (or ask your professor/classmates).</p>
              <p>2. Send <b>"Hi"</b> to your <b>Secondary Phone Number</b>.</p>
              <p>3. Your Secondary Phone will reply with the food ordering flow automatically!</p>
            </div>
          </div>
        ) : qrDataUrl ? (
          <div className="space-y-6">
            <div className="inline-block bg-white p-4 rounded-2xl shadow-2xl border-4 border-emerald-500/30">
              <img src={qrDataUrl} alt="WhatsApp Pairing QR Code" className="w-64 h-64 mx-auto" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                Scan with Secondary Phone
              </h3>
              <ol className="text-xs text-slate-400 space-y-1.5 max-w-md mx-auto text-left list-decimal list-inside bg-slate-950 p-4 rounded-xl border border-slate-800">
                <li>Open <b>WhatsApp</b> on your secondary phone.</li>
                <li>Tap <b>Settings</b> ➔ <b>Linked Devices</b>.</li>
                <li>Tap <b>Link a Device</b> and point your camera at this QR code.</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="py-12 space-y-3">
            <div className="w-12 h-12 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mx-auto"></div>
            <p className="text-sm text-slate-400 font-medium">Initializing WhatsApp Pairing Engine...</p>
            <p className="text-xs text-slate-500">Ensure <code className="text-rose-400 font-mono">WHATSAPP_PROVIDER=baileys</code> in backend/.env</p>
          </div>
        )}
      </div>
    </div>
  );
}
