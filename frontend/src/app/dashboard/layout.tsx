'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  MapPin,
  UtensilsCrossed,
  Tag,
  Clock,
  Users,
  BarChart3,
  LogOut,
  ShieldAlert,
  Bell,
  QrCode
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { admin, loading, logout } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !admin) {
      window.location.href = '/login';
    }
  }, [admin, loading]);

  if (loading || !admin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading Admin Workspace...
      </div>
    );
  }

  const navItems = [
    { label: 'Live Orders', href: '/dashboard', icon: ShoppingBag, roles: ['SUPER_ADMIN', 'RESTAURANT_MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF'] },
    { label: 'Pair Bot Phone (QR)', href: '/dashboard/pair', icon: QrCode, roles: ['SUPER_ADMIN', 'RESTAURANT_MANAGER'] },
    { label: 'WhatsApp Simulator', href: '/dashboard/simulator', icon: Bell, roles: ['SUPER_ADMIN', 'RESTAURANT_MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF'] },
    { label: 'Restaurants', href: '/dashboard/restaurants', icon: Store, roles: ['SUPER_ADMIN'] },
    { label: 'Zones & Blocks', href: '/dashboard/zones', icon: MapPin, roles: ['SUPER_ADMIN'] },
    { label: 'Menu Catalog', href: '/dashboard/menu', icon: UtensilsCrossed, roles: ['SUPER_ADMIN', 'RESTAURANT_MANAGER', 'KITCHEN_STAFF'] },
    { label: 'Coupons', href: '/dashboard/coupons', icon: Tag, roles: ['SUPER_ADMIN', 'RESTAURANT_MANAGER'] },
    { label: 'Pickup Slots', href: '/dashboard/pickup-slots', icon: Clock, roles: ['SUPER_ADMIN', 'RESTAURANT_MANAGER'] },
    { label: 'Users & Staff', href: '/dashboard/users', icon: Users, roles: ['SUPER_ADMIN'] },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, roles: ['SUPER_ADMIN', 'RESTAURANT_MANAGER'] },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-rose-600 to-amber-500 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-rose-900/30">
            WS
          </div>
          <div>
            <h2 className="font-bold text-white tracking-tight leading-none text-base">Food Station</h2>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-rose-400">WhatsApp Order System</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            if (!item.roles.includes(admin.role)) return null;
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin Profile Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{admin.name}</p>
              <span className="inline-block mt-0.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-md">
                {admin.role.replace('_', ' ')}
              </span>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white capitalize">
              {navItems.find((i) => i.href === pathname)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              WhatsApp Cloud API Active
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
