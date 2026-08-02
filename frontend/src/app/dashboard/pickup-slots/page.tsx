'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Clock, Plus } from 'lucide-react';

export default function PickupSlotsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [slotData, setSlotData] = useState({ slotTime: '', maxOrders: '25' });

  const fetchInitialData = async () => {
    const res = await api.get('/catalog/restaurants');
    setRestaurants(res.data.data);
    if (res.data.data.length > 0) setSelectedRestaurantId(res.data.data[0].id);
  };

  const fetchSlots = async () => {
    if (!selectedRestaurantId) return;
    const res = await api.get('/catalog/pickup-slots', { params: { restaurantId: selectedRestaurantId } });
    setSlots(res.data.data);
  };

  useEffect(() => { fetchInitialData(); }, []);
  useEffect(() => { fetchSlots(); }, [selectedRestaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/catalog/pickup-slots', { ...slotData, restaurantId: selectedRestaurantId });
      setShowModal(false);
      setSlotData({ slotTime: '', maxOrders: '25' });
      fetchSlots();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create slot');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Pickup Time Slots</h2>
          <p className="text-sm text-slate-400">Configure pickup windows and order capacity per slot.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedRestaurantId}
            onChange={(e) => setSelectedRestaurantId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-semibold focus:outline-none"
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowModal(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg shadow-rose-900/30"
          >
            <Plus className="w-4 h-4" /> Add Slot
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slots.map((slot) => (
          <div key={slot.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-rose-400" /> {slot.slotTime}
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg">Active</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Orders Booked: <strong className="text-white">{slot.currentOrders}</strong></span>
              <span>Capacity: <strong className="text-white">{slot.maxOrders}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Pickup Slot</h3>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Time Slot Label</label>
                <input
                  type="text"
                  required
                  value={slotData.slotTime}
                  onChange={(e) => setSlotData({ ...slotData, slotTime: e.target.value })}
                  placeholder="12:30 PM - 01:00 PM"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Max Orders Allowed</label>
                <input
                  type="number"
                  required
                  value={slotData.maxOrders}
                  onChange={(e) => setSlotData({ ...slotData, maxOrders: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400">Cancel</button>
                <button type="submit" className="bg-rose-600 text-white font-bold px-4 py-2 rounded-xl">Save Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
