import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'popular'; // 'popular' | 'latest' | 'name'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);

    // Filter out NovaStore itself from general app store catalog listings
    const query: any = {
      packageName: { $ne: 'com.novastore.app' },
    };

    if (search.trim()) {
      query.$and = [
        { packageName: { $ne: 'com.novastore.app' } },
        {
          $or: [
            { title: { $regex: search.trim(), $options: 'i' } },
            { packageName: { $regex: search.trim(), $options: 'i' } },
            { description: { $regex: search.trim(), $options: 'i' } },
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

    return NextResponse.json({
      success: true,
      data: apps,
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
      { error: error.message || 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
