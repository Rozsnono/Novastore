import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import Review from '@/lib/models/Review';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const { message } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Válaszüzenet megadása kötelező' }, { status: 400 });
    }

    await connectToDatabase();

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      {
        developerResponse: {
          message: message.trim(),
          respondedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedReview) {
      return NextResponse.json({ error: 'Értékelés nem található' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedReview,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Hiba történt a válasz mentésekor' },
      { status: 500 }
    );
  }
}
