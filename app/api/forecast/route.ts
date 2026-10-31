import { NextRequest, NextResponse } from 'next/server';
import { handleGetForecast } from '../../../lib/api/handlers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date') || undefined;
  const produce = searchParams.get('produce') || undefined;

  const result = await handleGetForecast({ date, produce });
  return NextResponse.json(result.body, { status: result.status });
}
