'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  ChefHat,
  Search,
  RefreshCw,
  Phone,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function LiveOrdersDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, statsRes] = await Promise.all([
        api.get('/orders', { params: { status: statusFilter, search } }),
        api.get('/analytics/dashboard')
      ]);
      setOrders(ordersRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10 seconds for real-time live updates
    return () => clearInterval(interval);
  }, [statusFilter, search]);

  const handleStatusUpdate = async (orderId: string, newStatus: string, notes?: string) => {
    try {
      setUpdatingId(orderId);
      await api.patch(`/orders/${orderId}/status`, { status: newStatus, notes });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold animate-pulse">PENDING REVIEW</span>;
      case 'ACCEPTED':
        return <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold">ACCEPTED</span>;
      case 'PREPARING':
        return <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold">PREPARING</span>;
      case 'READY_FOR_PAYMENT':
        return <span className="px-3 py-1 bg-pink-500/10 text-pink-400 border border-pink-500/30 rounded-lg text-xs font-bold">READY FOR PAYMENT</span>;
      case 'PAYMENT_RECEIVED':
        return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold">PAYMENT CONFIRMED</span>;
      case 'READY_FOR_PICKUP':
        return <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-bold">READY FOR PICKUP</span>;
      case 'COMPLETED':
        return <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold">COMPLETED</span>;
      case 'CANCELLED':
      case 'REJECTED':
        return <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold">{status}</span>;
      default:
        return <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Analytics Metric Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Sales</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">₹{stats.todaySales.toFixed(2)}</h3>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Orders</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{stats.pendingCount}</h3>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Preparing</p>
            <h3 className="text-2xl font-black text-purple-400 mt-1">{stats.preparingCount}</h3>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ready / Payment</p>
            <h3 className="text-2xl font-black text-pink-400 mt-1">{stats.readyCount}</h3>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Today</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{stats.completedCount}</h3>
          </div>
        </div>
      )}

      {/* Filter Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === '' ? 'bg-rose-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            All Orders
          </button>
          {['PENDING', 'ACCEPTED', 'PREPARING', 'READY_FOR_PAYMENT', 'PAYMENT_RECEIVED', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === st ? 'bg-rose-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Order # or WhatsApp..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
          <button
            onClick={fetchData}
            title="Refresh Orders"
            className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Live Order Grid */}
      {orders.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-slate-600" />
          <h3 className="text-lg font-bold text-white">No active orders matching filters</h3>
          <p className="text-sm">New WhatsApp customer orders will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white">{order.orderNumber}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <Phone className="w-3.5 h-3.5 text-rose-400" />
                      <span>{order.user.whatsappNumber}</span>
                    </div>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {/* Restaurant & Slot info */}
                <div className="text-xs text-slate-300 space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p><strong className="text-slate-400">Restaurant:</strong> {order.restaurant.name}</p>
                  <p><strong className="text-slate-400">Pickup Slot:</strong> {order.pickupTimeStr}</p>
                  <p><strong className="text-slate-400">Zone / Block:</strong> {order.zone?.name} / {order.block?.name}</p>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ordered Items</p>
                  <ul className="space-y-1 text-sm divide-y divide-slate-800/60">
                    {order.orderItems.map((item: any) => (
                      <li key={item.id} className="pt-1.5 flex justify-between text-slate-200">
                        <span>{item.itemName} <strong className="text-rose-400">x {item.quantity}</strong></span>
                        <span className="font-semibold text-slate-300">₹{item.totalPrice.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Total & Action Buttons */}
              <div className="border-t border-slate-800/80 pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final Total</span>
                  <span className="text-xl font-black text-emerald-400">₹{order.finalAmount.toFixed(2)}</span>
                </div>

                {/* Workflow Buttons according to specs */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {order.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'ACCEPTED')}
                        disabled={updatingId === order.id}
                        className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
                      >
                        Accept Order
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'REJECTED')}
                        disabled={updatingId === order.id}
                        className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {order.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'PREPARING')}
                      disabled={updatingId === order.id}
                      className="col-span-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
                    >
                      Start Preparing
                    </button>
                  )}

                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'READY_FOR_PAYMENT')}
                      disabled={updatingId === order.id}
                      className="col-span-2 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-pink-900/30 transition-all"
                    >
                      Send Payment Request (UPI QR)
                    </button>
                  )}

                  {(order.status === 'READY_FOR_PAYMENT' || order.status === 'PAYMENT_RECEIVED') && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'PAYMENT_RECEIVED')}
                        disabled={updatingId === order.id}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors"
                      >
                        Confirm Payment
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'READY_FOR_PICKUP')}
                        disabled={updatingId === order.id}
                        className="py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors"
                      >
                        Ready for Pickup
                      </button>
                    </>
                  )}

                  {order.status === 'READY_FOR_PICKUP' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'COMPLETED')}
                      disabled={updatingId === order.id}
                      className="col-span-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors"
                    >
                      Mark Order Completed
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
