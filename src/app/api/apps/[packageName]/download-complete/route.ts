import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ packageName: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { packageName } = await context.params;

  // A számláló hitelesítés nélküli, ezért IP+app szerint korlátozzuk (egyszerű számláló-felfújás ellen)
  if (!checkRateLimit(`dl-complete:${getClientIp(req)}:${packageName.toLowerCase()}`, 5, 3600000)) {
    return NextResponse.json({ error: 'Túl sok kérés. Próbáld újra később.' }, { status: 429 });
  }

  try {
    await connectToDatabase();

    const updatedApp = await AppItem.findOneAndUpdate(
      { packageName: packageName.toLowerCase().trim() },
      { $inc: { downloadCount: 1 } },
      { new: true }
    );

    if (!updatedApp) {
      return NextResponse.json(
        { error: `App "${packageName}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      downloadCount: updatedApp.downloadCount,
    });
  } catch (error: any) {
    console.error(`Error incrementing download count for ${packageName}:`, error);
    return NextResponse.json(
      { error: 'Failed to update download count' },
      { status: 500 }
    );
  }
}
