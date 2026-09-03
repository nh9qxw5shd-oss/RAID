import { NextResponse } from 'next/server';

/** Error carrying an HTTP status, thrown inside route handlers. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error('[api]', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
