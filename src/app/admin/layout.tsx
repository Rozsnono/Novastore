import React from 'react';

/**
 * Az admin felület közös burkolója.
 * Az `admin-theme` osztály kapcsolja be a sötét-piros ("Karmazsin") témát
 * (lásd globals.css); a nyilvános oldalt ez nem érinti.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-theme">{children}</div>;
}
