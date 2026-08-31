'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminNavbar from '@/components/AdminNavbar';
import { Sparkles, Shield, User, Trash2, Search, Loader2, Calendar, AlertCircle } from 'lucide-react';
import { IUser, UserRole } from '@/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.append('q', search);
      if (roleFilter) params.append('role', roleFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Error updating user role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Biztosan törölni szeretnéd a következő felhasználót: ${userName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err: any) {
      alert(err.message || 'Error deleting user');
    }
  };

  const formatAge = (dobString: string | Date) => {
    if (!dobString) return '-';
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const age = Math.abs(new Date(diffMs).getUTCFullYear() - 1970);
    return `${age} év (${new Date(dobString).toLocaleDateString('hu-HU')})`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-white">
      <AdminNavbar currentPath="/admin/users" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Felhasználók & Jogosultságok</h1>
            <p className="text-xs text-slate-400 mt-1">
              Regisztrált felhasználók kezelése, szerepkörök és zárt applikációs hozzáférések beállítása.
            </p>
          </div>

          {/* Search and filter */}
          <form onSubmit={handleSearch} className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Keresés név vagy email alapján..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="" className="bg-[#090d16]">Minden szerepkör</option>
              <option value="user" className="bg-[#090d16]">User (Alapértelmezett)</option>
              <option value="vip" className="bg-[#090d16]">VIP</option>
              <option value="tester" className="bg-[#090d16]">Béta Tesztelő</option>
              <option value="developer" className="bg-[#090d16]">Fejlesztő</option>
              <option value="admin" className="bg-[#090d16]">Adminisztrátor</option>
            </select>
          </form>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-3xl border border-white/5 space-y-3">
            <User className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">Nincs találat</h3>
            <p className="text-xs text-slate-400">Még nem regisztrált felhasználó vagy nincs egyezés a keresési feltételre.</p>
          </div>
        ) : (
          <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 uppercase font-semibold tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4">Felhasználó</th>
                    <th className="px-6 py-4">Születési idő & Kor</th>
                    <th className="px-6 py-4">Szerepkör (Jogosultság)</th>
                    <th className="px-6 py-4">Regisztráció</th>
                    <th className="px-6 py-4 text-right">Műveletek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{user.name}</p>
                            <p className="text-slate-400 font-mono text-[11px]">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatAge(user.dateOfBirth)}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={user.role}
                            disabled={updatingId === user._id}
                            onChange={(e) => handleRoleChange(user._id!, e.target.value as UserRole)}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none transition-colors ${
                              user.role === 'vip'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                : user.role === 'tester'
                                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                                : user.role === 'admin'
                                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                                : user.role === 'developer'
                                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                                : 'bg-white/5 border-white/10 text-slate-300'
                            }`}
                          >
                            <option value="user" className="bg-[#090d16]">User</option>
                            <option value="vip" className="bg-[#090d16]">VIP</option>
                            <option value="tester" className="bg-[#090d16]">Béta Tesztelő</option>
                            <option value="developer" className="bg-[#090d16]">Fejlesztő</option>
                            <option value="admin" className="bg-[#090d16]">Adminisztrátor</option>
                          </select>
                          {updatingId === user._id && (
                            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('hu-HU') : '-'}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(user._id!, user.name)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                          title="Felhasználó törlése"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
