'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { MapPin, Plus, Building } from 'lucide-react';

export default function ZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  const [zoneName, setZoneName] = useState('');
  const [blockData, setBlockData] = useState({ zoneId: '', name: '' });

  const fetchZones = async () => {
    const res = await api.get('/catalog/zones');
    setZones(res.data.data);
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/catalog/zones', { name: zoneName });
      setZoneName('');
      setShowZoneModal(false);
      fetchZones();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create zone');
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/catalog/blocks', blockData);
      setBlockData({ zoneId: '', name: '' });
      setShowBlockModal(false);
      fetchZones();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create block');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Zones & Delivery Blocks</h2>
          <p className="text-sm text-slate-400">Configure regions and sectors for WhatsApp customer location filtering.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowBlockModal(true)}
            className="bg-slate-900 border border-slate-800 text-white px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Block / Sector
          </button>
          <button
            onClick={() => setShowZoneModal(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg shadow-rose-900/30"
          >
            <Plus className="w-4 h-4" /> Add Zone
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zones.map((zone) => (
          <div key={zone.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-400" /> {zone.name}
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg">Active</span>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Blocks in Zone ({zone.blocks.length})</p>
              <div className="flex flex-wrap gap-2">
                {zone.blocks.map((b: any) => (
                  <span key={b.id} className="text-xs font-medium bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" /> {b.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Zone Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Delivery Zone</h3>
            <form onSubmit={handleCreateZone} className="space-y-4">
              <input
                type="text"
                required
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="Zone Name (e.g. North Zone)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowZoneModal(false)} className="text-xs text-slate-400">Cancel</button>
                <button type="submit" className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Save Zone</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Sector / Block</h3>
            <form onSubmit={handleCreateBlock} className="space-y-4 text-xs">
              <select
                required
                value={blockData.zoneId}
                onChange={(e) => setBlockData({ ...blockData, zoneId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none"
              >
                <option value="">Select Zone</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
              <input
                type="text"
                required
                value={blockData.name}
                onChange={(e) => setBlockData({ ...blockData, name: e.target.value })}
                placeholder="Block Name (e.g. Block A - Tech Park)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowBlockModal(false)} className="text-slate-400">Cancel</button>
                <button type="submit" className="bg-rose-600 text-white px-4 py-2 rounded-xl font-bold">Save Block</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
