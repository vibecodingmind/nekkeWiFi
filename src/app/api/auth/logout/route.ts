import { NextResponse } from 'next/server';

// POST /api/auth/logout
export async function POST() {
  // Demo: no real session to invalidate on server side.
  // The client will clear its local state and localStorage.
  return NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });
}
