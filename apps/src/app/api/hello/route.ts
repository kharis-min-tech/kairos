import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // TODO: Validate Cognito access token from Authorization header
  // const authHeader = request.headers.get('authorization');
  // if (!authHeader || !authHeader.startsWith('Bearer ')) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }
  // const token = authHeader.split(' ')[1];
  // await verifyToken(token); // Implement JWT verification with Cognito JWKS

  return NextResponse.json({ message: 'Hello, from API!' });
}
