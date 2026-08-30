import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ packageName: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { packageName } = await context.params;

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
      { error: error.message || 'Failed to update download count' },
      { status: 500 }
    );
  }
}
