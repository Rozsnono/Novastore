import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';
import { getUserFromRequest } from '@/lib/userAuth';
import { redactAppForUser } from '@/lib/appVisibility';
import { escapeRegExp, parseBoundedInt } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('q') || searchParams.get('search') || '').trim();
    const sort = searchParams.get('sort') || 'popular'; // 'popular' | 'latest' | 'name'
    // Érvénytelen/0/negatív érték nem adhat "korlátlan" lekérdezést (Mongo: limit(0) = nincs limit)
    const limit = parseBoundedInt(searchParams.get('limit'), 50, 1, 100);
    const page = parseBoundedInt(searchParams.get('page'), 1, 1, 100000);

    // Filter out NovaStore itself from general app store catalog listings
    const query: any = {
      packageName: { $ne: 'com.novastore.app' },
    };

    if (search) {
      // A keresőszöveget escape-eljük, hogy ne értelmeződjön reguláris kifejezésként
      const pattern = escapeRegExp(search.substring(0, 100));
      query.$and = [
        { packageName: { $ne: 'com.novastore.app' } },
        {
          $or: [
            { title: { $regex: pattern, $options: 'i' } },
            { packageName: { $regex: pattern, $options: 'i' } },
            { description: { $regex: pattern, $options: 'i' } },
          ],
        },
      ];
      delete query.packageName;
    }

    let sortOption: any = { downloadCount: -1 };
    if (sort === 'latest') {
      sortOption = { updatedAt: -1 };
    } else if (sort === 'name') {
      sortOption = { title: 1 };
    }

    const skip = (page - 1) * limit;
    const [apps, total] = await Promise.all([
      AppItem.find(query).sort(sortOption).skip(skip).limit(limit),
      AppItem.countDocuments(query),
    ]);

    const user = await getUserFromRequest(req);

    return NextResponse.json({
      success: true,
      data: apps.map((a) => redactAppForUser(a, user)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching apps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
