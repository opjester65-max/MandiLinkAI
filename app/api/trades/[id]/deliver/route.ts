import { NextRequest, NextResponse } from 'next/server';
import { handleDeliverTrade, makeError } from '../../../../../lib/api/handlers';
import { FIXTURE_IDS } from '../../../../../lib/fixtures';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idempotencyKey = request.headers.get('idempotency-key') || undefined;
    const actorId = request.headers.get('x-agent-id') || FIXTURE_IDS.buyerTariq;
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    const requestHash = Array.from(new TextEncoder().encode(rawBody))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 64);

    const result = await handleDeliverTrade(id, body, actorId, idempotencyKey, requestHash);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(makeError('INVALID_INPUT', err.message), { status: 400 });
  }
}
