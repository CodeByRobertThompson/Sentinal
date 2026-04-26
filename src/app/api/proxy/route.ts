import { NextResponse } from 'next/server';

async function handleProxy(req: Request) {
  try {
    const targetUrl = req.headers.get('x-target-url');
    if (!targetUrl) return NextResponse.json({ error: 'Missing x-target-url header' }, { status: 400 });
    const isAuth = targetUrl.includes('/oauth/token');

    // Build pure, untainted headers
    const headers: Record<string, string> = {
      'ngrok-skip-browser-warning': 'true'
    };

    const authHeader = req.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const accountHeader = req.headers.get('x-account');
    if (accountHeader) headers['x-account'] = accountHeader;

    const idempotencyHeader = req.headers.get('x-idempotency-key');
    if (idempotencyHeader) headers['x-idempotency-key'] = idempotencyHeader;

    // 1. OAUTH ROUTING (Strict URL-Encoded handling)
    if (isAuth) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const bodyParams = new URLSearchParams();
      bodyParams.append('grant_type', 'client_credentials');

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: bodyParams.toString()
      });
      return new NextResponse(await response.text(), {
        status: response.status,
        headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' }
      });
    }

    // 2. STANDARD JSON ROUTING (Conversations API & Ngrok API)
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      headers['Content-Type'] = 'application/json';
      
      const bodyText = await req.text();

      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: bodyText
      });
      return new NextResponse(await response.text(), {
        status: response.status,
        headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' }
      });
    }

    // 3. GET/DELETE ROUTING (Session cleanup & Webhook polling)
    const response = await fetch(targetUrl, {
      method: req.method,
      headers
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' }
    });

  } catch (err: any) {
    console.error('Vercel Node Fetch Error:', err);
    return NextResponse.json({ error: 'Proxy Failure', details: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) { return handleProxy(req); }
export async function POST(req: Request) { return handleProxy(req); }
export async function PUT(req: Request) { return handleProxy(req); }
export async function PATCH(req: Request) { return handleProxy(req); }
export async function DELETE(req: Request) { return handleProxy(req); }
