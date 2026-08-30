import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NovaStore - Next-Gen Android App Store & Distribution',
  description: 'Enterprise custom Android app store with WebDAV NAS streaming, chunked installs, and passive updates.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#090d16] text-slate-100 min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
