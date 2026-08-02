'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Store, Plus, Image as ImageIcon, MapPin, Phone, CreditCard, AlertCircle } from 'lucide-react';

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    zoneId: '',
    blockId: '',
    address: '',
    phone: '',
    defaultImageUrl: '',
    upiId: 'merchant@upi',
    upiName: 'Food Station'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resRes, zoneRes] = await Promise.all([
        api.get('/catalog/restaurants'),
        api.get('/catalog/zones')
      ]);
      setRestaurants(resRes.data.data);
      setZones(zoneRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedZone = zones.find(z => z.id === formData.zoneId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/catalog/restaurants', formData);
      setShowModal(false);
      setFormData({
        name: '',
        zoneId: '',
        blockId: '',
        address: '',
        phone: '',
        defaultImageUrl: '',
        upiId: 'merchant@upi',
        upiName: 'Food Station'
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create restaurant');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Restaurants</h2>
          <p className="text-sm text-slate-400">Manage partner restaurant branches and default menu cover images.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-rose-900/30 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Restaurant
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map((res) => (
          <div key={res.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
            <div className="relative h-44 bg-slate-950">
              <img
                src={res.defaultImageUrl}
                alt={res.name}
                className="w-full h-full object-cover"
                onError={(e: any) => {
                  e.target.src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80';
                }}
              />
              <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] uppercase font-bold text-rose-400">
                Default Menu Image
              </div>
            </div>

            <div className="p-6 space-y-3">
              <h3 className="text-lg font-bold text-white">{res.name}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" /> {res.address} ({res.zone?.name} - {res.block?.name})
              </p>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" /> {res.phone}
              </p>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" /> UPI ID: {res.upiId} ({res.upiName})
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6">
            <h3 className="text-lg font-bold text-white">Add New Restaurant</h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Restaurant Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500"
                  placeholder="Tummy Station Grill"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Zone</label>
                  <select
                    required
                    value={formData.zoneId}
                    onChange={(e) => setFormData({ ...formData, zoneId: e.target.value, blockId: '' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Select Zone</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Block / Sector</label>
                  <select
                    required
                    value={formData.blockId}
                    onChange={(e) => setFormData({ ...formData, blockId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Select Block</option>
                    {selectedZone?.blocks.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Default Menu Cover Image URL</label>
                <input
                  type="url"
                  required
                  value={formData.defaultImageUrl}
                  onChange={(e) => setFormData({ ...formData, defaultImageUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500"
                  placeholder="https://images.unsplash.com/photo-1555396273-367ea4eb4db5"
                />
                <p className="text-[10px] text-slate-500 mt-1">This default image will display for all food items without explicit item photos.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500"
                    placeholder="+919876543210"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Address</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500"
                    placeholder="Suite 101, Tech Park"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">UPI ID for Dynamic QR</label>
                  <input
                    type="text"
                    required
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500"
                    placeholder="merchant@upi"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payee Name</label>
                  <input
                    type="text"
                    required
                    value={formData.upiName}
                    onChange={(e) => setFormData({ ...formData, upiName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500"
                    placeholder="Food Station"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 rounded-xl font-bold"
                >
                  Save Restaurant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
