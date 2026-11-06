import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';

export const dynamic = 'force-dynamic';

/**
 * Tárhelyhasználat appok szerint (az admin oldalsáv körgrafikonjához).
 * Csak admin session-nel érhető el. A méretek az adatbázisban tárolt `sizeBytes` értékekből jönnek
 * (a NAS tényleges kapacitását nem kérdezi le).
 */
export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Nincs jogosultság' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const apps = await AppItem.find({}, { title: 1, sizeBytes: 1 }).lean();
    const sorted = apps
      .map((a: any) => ({ label: String(a.title), value: Number(a.sizeBytes) || 0 }))
      .filter((a) => a.value > 0)
      .sort((a, b) => b.value - a.value);

    const slices = sorted.slice(0, 5);
    const rest = sorted.slice(5).reduce((acc, a) => acc + a.value, 0);
    if (rest > 0) slices.push({ label: 'Egyéb', value: rest });
    const totalBytes = sorted.reduce((acc, a) => acc + a.value, 0);

    return NextResponse.json({ success: true, data: { slices, totalBytes } });
  } catch (error: any) {
    console.error('Storage summary error:', error);
    return NextResponse.json({ error: 'A tárhelyadatok betöltése nem sikerült' }, { status: 500 });
  }
}
