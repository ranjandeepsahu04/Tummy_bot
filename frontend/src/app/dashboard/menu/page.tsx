'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { UtensilsCrossed, Plus, Edit2, Trash2, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';

export default function MenuCatalogPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);
  const [foodItems, setFoodItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [newCatName, setNewCatName] = useState('');

  const [itemForm, setItemForm] = useState({
    id: '',
    categoryId: '',
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    inStock: true,
    isAvailable: true
  });

  const fetchInitialData = async () => {
    const res = await api.get('/catalog/restaurants');
    setRestaurants(res.data.data);
    if (res.data.data.length > 0) {
      setSelectedRestaurantId(res.data.data[0].id);
    }
  };

  const fetchMenuData = async () => {
    if (!selectedRestaurantId) return;
    setLoading(true);
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get('/catalog/categories', { params: { restaurantId: selectedRestaurantId } }),
        api.get('/catalog/food-items', { params: { restaurantId: selectedRestaurantId } })
      ]);
      setCategories(catRes.data.data);
      setFoodItems(itemRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchMenuData();
  }, [selectedRestaurantId]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/catalog/categories', {
        restaurantId: selectedRestaurantId,
        name: newCatName
      });
      setNewCatName('');
      setShowCategoryModal(false);
      fetchMenuData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create category');
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...itemForm,
        restaurantId: selectedRestaurantId,
        imageUrl: itemForm.imageUrl.trim() || null // Null defaults to restaurant.defaultImageUrl
      };

      if (itemForm.id) {
        await api.put(`/catalog/food-items/${itemForm.id}`, payload);
      } else {
        await api.post('/catalog/food-items', payload);
      }

      setShowItemModal(false);
      setItemForm({ id: '', categoryId: '', name: '', description: '', price: '', imageUrl: '', inStock: true, isAvailable: true });
      fetchMenuData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save food item');
    }
  };

  const toggleStock = async (item: any) => {
    try {
      await api.put(`/catalog/food-items/${item.id}`, { inStock: !item.inStock });
      fetchMenuData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update stock');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await api.delete(`/catalog/food-items/${id}`);
      fetchMenuData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete item');
    }
  };

  const currentRestaurant = restaurants.find(r => r.id === selectedRestaurantId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Menu Catalog</h2>
          <p className="text-sm text-slate-400">Manage categories, dish prices, availability, and image fallbacks.</p>
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
            onClick={() => setShowCategoryModal(true)}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Category
          </button>

          <button
            onClick={() => {
              setItemForm({ id: '', categoryId: categories[0]?.id || '', name: '', description: '', price: '', imageUrl: '', inStock: true, isAvailable: true });
              setShowItemModal(true);
            }}
            className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg shadow-rose-900/30"
          >
            <Plus className="w-4 h-4" /> Add Food Item
          </button>
        </div>
      </div>

      {/* Menu Table / Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4">Item & Image</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock Status</th>
                <th className="p-4">Image Source</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {foodItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <img
                      src={item.effectiveImageUrl}
                      alt={item.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-800 bg-slate-950 flex-shrink-0"
                    />
                    <div>
                      <p className="font-bold text-white">{item.name}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">{item.description || 'No description'}</p>
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-rose-400">{item.category?.name}</td>
                  <td className="p-4 font-bold text-emerald-400">₹{item.price.toFixed(2)}</td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleStock(item)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        item.inStock
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {item.inStock ? 'In Stock' : 'Out of Stock'}
                    </button>
                  </td>
                  <td className="p-4 text-xs">
                    {item.imageUrl ? (
                      <span className="text-blue-400 font-semibold">Custom Item Photo</span>
                    ) : (
                      <span className="text-slate-400 font-semibold">Restaurant Default Image</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setItemForm({
                            id: item.id,
                            categoryId: item.categoryId,
                            name: item.name,
                            description: item.description || '',
                            price: item.price.toString(),
                            imageUrl: item.imageUrl || '',
                            inStock: item.inStock,
                            isAvailable: item.isAvailable
                          });
                          setShowItemModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Starters, Desserts"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="text-xs text-slate-400">Cancel</button>
                <button type="submit" className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6">
            <h3 className="text-lg font-bold text-white">{itemForm.id ? 'Edit Food Item' : 'Add New Food Item'}</h3>

            <form onSubmit={handleItemSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category</label>
                <select
                  required
                  value={itemForm.categoryId}
                  onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="Paneer Tikka"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  placeholder="240.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Smoky grilled cottage cheese cubes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none h-20"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Custom Item Image URL (Optional)</label>
                <input
                  type="url"
                  value={itemForm.imageUrl}
                  onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                  placeholder="Leave empty to use restaurant default image"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">If left empty, this item will automatically use {currentRestaurant?.name || 'the restaurant'}'s default cover image.</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowItemModal(false)} className="text-slate-400 px-3 py-2">Cancel</button>
                <button type="submit" className="bg-rose-600 text-white font-bold px-5 py-2 rounded-xl">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
