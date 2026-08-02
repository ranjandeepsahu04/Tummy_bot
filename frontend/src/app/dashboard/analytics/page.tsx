'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Download, TrendingUp, Users, ShoppingBag, DollarSign } from 'lucide-react';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [popularItems, setPopularItems] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/popular-items')
    ]).then(([statsRes, popRes]) => {
      setStats(statsRes.data.data);
      setPopularItems(popRes.data.data);
    }).catch(console.error);
  }, []);

  const handleExportCsv = async () => {
    try {
      const res = await api.get('/orders/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download CSV export');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Sales & Performance Analytics</h2>
          <p className="text-sm text-slate-400">Export order records and view top selling food items.</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all"
        >
          <Download className="w-4 h-4" /> Export Orders CSV
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Today's Revenue</p>
              <h3 className="text-xl font-black text-white mt-0.5">₹{stats.todaySales.toFixed(2)}</h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center font-bold">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Total Orders</p>
              <h3 className="text-xl font-black text-white mt-0.5">{stats.totalOrdersCount}</h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Customers</p>
              <h3 className="text-xl font-black text-white mt-0.5">{stats.totalCustomersCount}</h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Completed Rate</p>
              <h3 className="text-xl font-black text-white mt-0.5">
                {stats.totalOrdersCount ? Math.round((stats.completedCount / stats.totalOrdersCount) * 100) : 0}%
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Top Selling Items */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white">Top 10 Selling Food Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4">Food Item</th>
                <th className="p-4">Total Sold Qty</th>
                <th className="p-4">Total Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {popularItems.map((item, idx) => (
                <tr key={item.foodItemId} className="hover:bg-slate-800/40">
                  <td className="p-4 font-bold text-white flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-950 text-slate-400 text-xs font-mono flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    {item.itemName}
                  </td>
                  <td className="p-4 font-bold text-rose-400">{item._sum.quantity} units</td>
                  <td className="p-4 font-bold text-emerald-400">₹{(item._sum.totalPrice || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
