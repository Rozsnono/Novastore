import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const { role, customPermissions } = await req.json();

    await connectToDatabase();

    const updateFields: any = {};
    if (role) {
      updateFields.role = role;
    }
    if (Array.isArray(customPermissions)) {
      updateFields.customPermissions = customPermissions;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateFields, {
      new: true,
    }).select('-passwordHash');

    if (!updatedUser) {
      return NextResponse.json({ error: 'Felhasználó nem található' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('Error updating user role/permissions:', error);
    return NextResponse.json(
      { error: error.message || 'Hiba történt a felhasználó frissítésekor' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await connectToDatabase();
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Felhasználó nem található' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Felhasználó sikeresen törölve',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Hiba történt a törlés során' },
      { status: 500 }
    );
  }
}
