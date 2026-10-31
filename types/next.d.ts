declare module 'next/server' {
  export class NextRequest extends Request {
    nextUrl: URL;
  }

  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, status?: number): NextResponse;
  }
}
