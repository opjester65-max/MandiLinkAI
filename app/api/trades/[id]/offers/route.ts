import { NextRequest, NextResponse } from 'next/server';
import { handleCreateOffer, makeError } from '../../../../../lib/api/handlers';
import { FIXTURE_IDS } from '../../../../../lib/fixtures';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idempotencyKey = request.headers.get('idempotency-key') || undefined;
    const actorId = request.headers.get('x-agent-id') || FIXTURE_IDS.buyerTariq;
    const body = await request.json();

    const result = await handleCreateOffer(id, body, actorId, idempotencyKey);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(makeError('INVALID_INPUT', err.message), { status: 400 });
  }
}
