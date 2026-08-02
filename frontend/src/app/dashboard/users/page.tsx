'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Users, UserPlus, Phone, Mail, Shield } from 'lucide-react';

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'admins' | 'customers'>('admins');
  const [admins, setAdmins] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'RESTAURANT_MANAGER'
  });

  const fetchData = async () => {
    try {
      const [adminRes, custRes] = await Promise.all([
        api.get('/users/admins'),
        api.get('/users/customers')
      ]);
      setAdmins(adminRes.data.data);
      setCustomers(custRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users/admins', adminForm);
      setShowModal(false);
      setAdminForm({ name: '', email: '', password: '', role: 'RESTAURANT_MANAGER' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create admin');
    }
  };

  const toggleAdmin = async (id: string, isEnabled: boolean) => {
    try {
      await api.patch(`/users/admins/${id}/status`, { isEnabled: !isEnabled });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to toggle status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Users & Staff Management</h2>
          <p className="text-sm text-slate-400">Manage WhatsApp customers and Role-Based Admin staff access.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1">
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'admins' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin Staff ({admins.length})
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'customers' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              WhatsApp Customers ({customers.length})
            </button>
          </div>

          {activeTab === 'admins' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Add Admin
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {activeTab === 'admins' ? (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4">Name & Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-800/40">
                    <td className="p-4">
                      <p className="font-bold text-white">{adm.name}</p>
                      <p className="text-xs text-slate-400">{adm.email}</p>
                    </td>
                    <td className="p-4 font-semibold text-rose-400">{adm.role.replace('_', ' ')}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${adm.isEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {adm.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => toggleAdmin(adm.id, adm.isEnabled)}
                        className="text-xs text-slate-400 hover:text-white bg-slate-950 px-3 py-1 rounded-lg border border-slate-800"
                      >
                        {adm.isEnabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">WhatsApp Phone</th>
                  <th className="p-4">Total Orders</th>
                  <th className="p-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-white">{cust.name || 'WhatsApp Customer'}</td>
                    <td className="p-4 text-rose-400 font-mono">{cust.whatsappNumber}</td>
                    <td className="p-4 font-bold text-emerald-400">{cust._count?.orders || 0}</td>
                    <td className="p-4 text-xs text-slate-400">{new Date(cust.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Staff Member</h3>
            <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  placeholder="Manager Name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  placeholder="staff@tummybot.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assign Role</label>
                <select
                  value={adminForm.role}
                  onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none"
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="RESTAURANT_MANAGER">Restaurant Manager</option>
                  <option value="KITCHEN_STAFF">Kitchen Staff</option>
                  <option value="DELIVERY_STAFF">Delivery Staff</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400">Cancel</button>
                <button type="submit" className="bg-rose-600 text-white font-bold px-4 py-2 rounded-xl">Save Admin</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
