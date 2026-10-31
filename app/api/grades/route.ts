import { NextRequest, NextResponse } from 'next/server';
import { handleGradeUpload, makeError } from '../../../lib/api/handlers';
import { FIXTURE_IDS } from '../../../lib/fixtures';

export async function POST(request: NextRequest) {
  try {
    const actorId = request.headers.get('x-agent-id') || FIXTURE_IDS.growerFatima;
    const contentType = request.headers.get('content-type') || '';

    let buffer: Buffer;
    let locale = 'en-PK';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('image') as File | null;
      if (!file) {
        return NextResponse.json(makeError('INVALID_INPUT', 'Missing image file in multipart form'), {
          status: 400,
        });
      }
      locale = (formData.get('locale') as string) || 'en-PK';
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      const body = await request.json();
      if (!body.imageBase64) {
        return NextResponse.json(makeError('INVALID_INPUT', 'Missing imageBase64 payload'), { status: 400 });
      }
      locale = body.locale || 'en-PK';
      const clean = body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(clean, 'base64');
    }

    const result = await handleGradeUpload(buffer, locale, actorId);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(makeError('INVALID_INPUT', err.message), { status: 400 });
  }
}
