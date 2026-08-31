import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import Review from '@/lib/models/Review';
import AppItem from '@/lib/models/AppItem';
import { getUserFromRequest } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ packageName: string }>;
}

/**
 * Recalculates and updates the average rating and count on the AppItem
 */
async function updateAppAverageRating(packageName: string) {
  const cleanPkg = packageName.toLowerCase().trim();
  const reviews = await Review.find({ packageName: cleanPkg });

  if (reviews.length === 0) {
    await AppItem.findOneAndUpdate(
      { packageName: cleanPkg },
      { averageRating: 0, ratingCount: 0 }
    );
    return;
  }

  const totalScore = reviews.reduce((sum, r) => sum + r.rating, 0);
  const avg = Math.round((totalScore / reviews.length) * 10) / 10; // e.g. 4.7

  await AppItem.findOneAndUpdate(
    { packageName: cleanPkg },
    { averageRating: avg, ratingCount: reviews.length }
  );
}

/**
 * GET: Fetch all reviews and rating distribution summary for a package
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { packageName } = await context.params;
  const cleanPkg = packageName.toLowerCase().trim();

  try {
    await connectToDatabase();

    const reviews = await Review.find({ packageName: cleanPkg })
      .sort({ createdAt: -1 })
      .limit(100);

    // Compute rating breakdown
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalScore = 0;

    reviews.forEach((r) => {
      totalScore += r.rating;
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating as 1 | 2 | 3 | 4 | 5] =
          (distribution[r.rating as 1 | 2 | 3 | 4 | 5] || 0) + 1;
      }
    });

    const averageRating =
      reviews.length > 0 ? Math.round((totalScore / reviews.length) * 10) / 10 : 0;

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        summary: {
          averageRating,
          totalReviews: reviews.length,
          ratingDistribution: distribution,
        },
      },
    });
  } catch (error: any) {
    console.error(`Error fetching reviews for ${cleanPkg}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

/**
 * POST: Submit or update personal review (Authenticated)
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { packageName } = await context.params;
  const cleanPkg = packageName.toLowerCase().trim();

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Értékelés írásához bejelentkezés szükséges' },
        { status: 401 }
      );
    }

    const { rating, comment } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Kérlek adj meg 1 és 5 csillag közötti értékelést' },
        { status: 400 }
      );
    }

    if (!comment || !comment.trim()) {
      return NextResponse.json(
        { error: 'Kérlek írj egy rövid szöveges véleményt is' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Verify app exists
    const app = await AppItem.findOne({ packageName: cleanPkg });
    if (!app) {
      return NextResponse.json(
        { error: 'Az alkalmazás nem található' },
        { status: 404 }
      );
    }

    // Upsert review (1 review per user per app)
    const updatedReview = await Review.findOneAndUpdate(
      {
        packageName: cleanPkg,
        userId: new mongoose.Types.ObjectId(user.userId),
      },
      {
        packageName: cleanPkg,
        userId: new mongoose.Types.ObjectId(user.userId),
        userName: user.name,
        rating: Math.round(rating),
        comment: comment.trim(),
        isVerifiedDownload: true,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Update aggregated rating on AppItem
    await updateAppAverageRating(cleanPkg);

    return NextResponse.json({
      success: true,
      review: updatedReview,
    });
  } catch (error: any) {
    console.error(`Error saving review for ${cleanPkg}:`, error);
    return NextResponse.json(
      { error: error.message || 'Hiba történt az értékelés mentésekor' },
      { status: 500 }
    );
  }
}
