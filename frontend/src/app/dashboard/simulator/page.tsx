'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../../lib/api';
import { Send, Bot, CheckCheck, RefreshCw } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

const DEFAULT_WELCOME_MSG: ChatMessage = {
  id: '1',
  sender: 'bot',
  text: '👋 Welcome to WhatsApp Food Station!\n\nWhat would you like to do today?\n\n1️⃣ Order Food\n2️⃣ Reorder Previous Meal\n3️⃣ My Orders / Track Order\n4️⃣ Help & Support\n\nReply with 1, 2, 3, or 4',
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export default function WhatsAppSimulatorPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('+919348145818');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MSG]);
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const seenNotificationIds = useRef<Set<string>>(new Set());
  const resetTimestampRef = useRef<number>(0);

  // Load chat history and reset timestamp from localStorage on initial render
  useEffect(() => {
    try {
      const savedNum = localStorage.getItem('tummy_sim_phone');
      if (savedNum) setWhatsappNumber(savedNum);

      const savedResetTime = localStorage.getItem('tummy_sim_reset_time');
      if (savedResetTime) {
        resetTimestampRef.current = Number(savedResetTime);
      }

      const savedMsgs = localStorage.getItem('tummy_sim_messages');
      if (savedMsgs) {
        const parsed = JSON.parse(savedMsgs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          parsed.forEach((m: ChatMessage) => {
            if (m.id.startsWith('notif_')) seenNotificationIds.current.add(m.id);
          });
        }
      }
    } catch (e) {
      console.error('Failed to load simulator storage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('tummy_sim_phone', whatsappNumber);
      localStorage.setItem('tummy_sim_messages', JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save simulator storage:', e);
    }
  }, [messages, whatsappNumber, isLoaded]);

  // Poll for Admin status update notifications (e.g. READY_FOR_PAYMENT, ACCEPTED, PREPARING)
  useEffect(() => {
    if (!isLoaded || !whatsappNumber) return;

    const fetchNotifications = async () => {
      try {
        const sinceParam = resetTimestampRef.current > 0 ? `&since=${resetTimestampRef.current}` : '';
        const res = await api.get(`/webhook/simulator/notifications?whatsappNumber=${encodeURIComponent(whatsappNumber)}${sinceParam}`);
        const notifications = res.data.data;
        if (Array.isArray(notifications)) {
          const newBotMsgs: ChatMessage[] = [];
          notifications.forEach((notif: any) => {
            const notifId = `notif_${notif.id}`;
            if (!seenNotificationIds.current.has(notifId)) {
              seenNotificationIds.current.add(notifId);
              newBotMsgs.push({
                id: notifId,
                sender: 'bot',
                text: notif.content,
                time: new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            }
          });

          if (newBotMsgs.length > 0) {
            setMessages((prev) => [...prev, ...newBotMsgs]);
          }
        }
      } catch (err) {
        // ignore polling errors
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 2000);
    return () => clearInterval(interval);
  }, [whatsappNumber, isLoaded]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputMessage.trim();
    if (!textToSend) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await api.post('/webhook/simulate', {
        whatsappNumber,
        text: textToSend
      });

      const replyText = res.data.data.replyText;

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: '❌ Error: ' + (err.response?.data?.error || err.message),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickSend = (cmd: string) => {
    setInputMessage(cmd);
  };

  const handleResetSession = async () => {
    setLoading(true);
    try {
      const now = Date.now();
      resetTimestampRef.current = now;
      localStorage.setItem('tummy_sim_reset_time', now.toString());

      seenNotificationIds.current.clear();
      localStorage.removeItem('tummy_sim_messages');

      const res = await api.post('/webhook/simulate/reset', { whatsappNumber });
      const replyText = res.data.data.replyText;

      const freshMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'bot',
        text: replyText || DEFAULT_WELCOME_MSG.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages([freshMsg]);
      setInputMessage('');
    } catch (err: any) {
      setMessages([DEFAULT_WELCOME_MSG]);
      localStorage.removeItem('tummy_sim_messages');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Interactive WhatsApp Simulator</h2>
          <p className="text-sm text-slate-400">Test all WhatsApp food ordering state machine commands live in your browser. Live notifications stream automatically.</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-rose-400 font-mono focus:outline-none"
            placeholder="+919348145818"
          />
          <button
            onClick={handleResetSession}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Session
          </button>
        </div>
      </div>

      {/* WhatsApp Chat Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[620px]">
        {/* Chat Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">WhatsApp Food Station (Bot)</h3>
              <p className="text-[11px] text-emerald-400 font-medium">Online • Live Sync Active</p>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            ⚡ Real-time Admin Sync Active
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950/60 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap shadow-lg ${
                  msg.sender === 'user'
                    ? 'bg-rose-600 text-white rounded-br-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                }`}
              >
                {msg.text}
                <div
                  className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
                    msg.sender === 'user' ? 'text-rose-200' : 'text-slate-500'
                  }`}
                >
                  <span>{msg.time}</span>
                  {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-rose-200" />}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-400 animate-pulse">
                Food Station Bot is typing...
              </div>
            </div>
          )}
        </div>

        {/* Quick Command Suggestions */}
        <div className="bg-slate-950/80 px-4 py-2 border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-500 font-semibold flex-shrink-0">Quick Commands:</span>
          {['Hi', '1', 'PAID', 'cart', 'checkout', 'WELCOME10', 'SKIP', 'track', 'reorder', 'help'].map((cmd) => (
            <button
              key={cmd}
              onClick={() => quickSend(cmd)}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-3 py-1 rounded-lg border border-slate-800 flex-shrink-0 font-medium"
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your WhatsApp message (e.g. 1, PAID, cart, checkout)..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-rose-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white p-3 rounded-xl shadow-lg shadow-rose-900/30 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
