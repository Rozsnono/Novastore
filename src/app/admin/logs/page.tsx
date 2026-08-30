import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import AdminNavbar from '@/components/AdminNavbar';
import AdminLogsViewer from './AdminLogsViewer';

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-white">
      <AdminNavbar currentPath="/admin/logs" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <AdminLogsViewer />
      </main>
    </div>
  );
}
