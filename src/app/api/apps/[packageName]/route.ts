import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';
import { getUserFromRequest } from '@/lib/userAuth';
import { redactAppForUser } from '@/lib/appVisibility';

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

    const user = await getUserFromRequest(req);
    return NextResponse.json({ success: true, data: redactAppForUser(app, user) });
  } catch (error: any) {
    console.error(`Error fetching application details for ${packageName}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch application details' },
      { status: 500 }
    );
  }
}
