import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ packageName: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { packageName } = await context.params;

  try {
    await connectToDatabase();
    const app = await AppItem.findOne({ packageName: packageName.toLowerCase().trim() });

    if (!app) {
      return NextResponse.json(
        { error: `App with package name "${packageName}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: app });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch application details' },
      { status: 500 }
    );
  }
}
