import { NextRequest, NextResponse } from 'next/server';
import { handleGetTrade } from '../../../../lib/api/handlers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actorId = request.headers.get('x-agent-id') || undefined;
  const result = await handleGetTrade(id, actorId);
  return NextResponse.json(result.body, { status: result.status });
}
