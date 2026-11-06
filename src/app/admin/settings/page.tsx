import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import AdminNavbar from '@/components/AdminNavbar';
import SettingsForm from './SettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-white">
      <AdminNavbar currentPath="/admin/settings" />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <SettingsForm />
      </main>
    </div>
  );
}
