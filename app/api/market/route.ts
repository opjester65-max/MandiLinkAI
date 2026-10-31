import { NextRequest, NextResponse } from 'next/server';
import { handleGetMarket } from '../../../lib/api/handlers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date') || undefined;
  const produce = searchParams.get('produce') || undefined;
  const mode = searchParams.get('mode') || undefined;

  const result = await handleGetMarket({ date, produce, mode });
  return NextResponse.json(result.body, { status: result.status });
}
