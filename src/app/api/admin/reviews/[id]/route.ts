import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import Review from '@/lib/models/Review';
import AppItem from '@/lib/models/AppItem';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await connectToDatabase();

    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return NextResponse.json({ error: 'Értékelés nem található' }, { status: 404 });
    }

    // Recalculate average rating
    const remaining = await Review.find({ packageName: review.packageName });
    if (remaining.length === 0) {
      await AppItem.findOneAndUpdate(
        { packageName: review.packageName },
        { averageRating: 0, ratingCount: 0 }
      );
    } else {
      const totalScore = remaining.reduce((sum, r) => sum + r.rating, 0);
      const avg = Math.round((totalScore / remaining.length) * 10) / 10;
      await AppItem.findOneAndUpdate(
        { packageName: review.packageName },
        { averageRating: avg, ratingCount: remaining.length }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Értékelés törölve',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Hiba történt a törlés során' },
      { status: 500 }
    );
  }
}
