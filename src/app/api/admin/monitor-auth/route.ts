import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { MONITOR_SESSION_COOKIE_NAME } from '@/lib/monitor-auth';

interface MonitorCredentialsPayload {
  username?: string;
  password?: string;
}

function getMonitorConfig() {
  const username = process.env.MONITOR_ADMIN_USERNAME;
  const password = process.env.MONITOR_ADMIN_PASSWORD;
  const sessionSecret =
    process.env.MONITOR_ADMIN_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET;

  return {
    username,
    password,
    sessionSecret,
    configured: Boolean(username && password && sessionSecret),
  };
}

function buildSessionToken(username: string, password: string, sessionSecret: string) {
  return createHash('sha256')
    .update(`${username}:${password}:${sessionSecret}`)
    .digest('hex');
}


function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getExpectedSessionToken() {
  const { username, password, sessionSecret, configured } = getMonitorConfig();

  if (!configured || !username || !password || !sessionSecret) {
    return null;
  }

  return buildSessionToken(username, password, sessionSecret);
}

function isValidMonitorSession(request: NextRequest) {
  const expectedToken = getExpectedSessionToken();
  const cookieToken = request.cookies.get(MONITOR_SESSION_COOKIE_NAME)?.value;

  if (!expectedToken || !cookieToken) {
    return false;
  }

  return safeCompare(expectedToken, cookieToken);
}

export async function GET(request: NextRequest) {
  const { configured } = getMonitorConfig();

  return NextResponse.json({
    authenticated: configured ? isValidMonitorSession(request) : false,
    configured,
    message: configured
      ? undefined
      : 'Set MONITOR_ADMIN_USERNAME, MONITOR_ADMIN_PASSWORD, and MONITOR_ADMIN_SESSION_SECRET (or NEXTAUTH_SECRET) to enable monitor access.',
  });
}

export async function POST(request: NextRequest) {
  const { username, password, sessionSecret, configured } = getMonitorConfig();

  if (!configured || !username || !password || !sessionSecret) {
    return NextResponse.json(
      {
        authenticated: false,
        configured: false,
        message:
          'Monitor access is not configured. Please set monitor admin environment variables on the server.',
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as MonitorCredentialsPayload;

  if (!body.username || !body.password) {
    return NextResponse.json(
      {
        authenticated: false,
        configured: true,
        message: 'Username and password are required.',
      },
      { status: 400 },
    );
  }

  const usernameMatches = safeCompare(body.username, username);
  const passwordMatches = safeCompare(body.password, password);

  if (!usernameMatches || !passwordMatches) {
    return NextResponse.json(
      {
        authenticated: false,
        configured: true,
        message: 'Invalid username or password.',
      },
      { status: 401 },
    );
  }

  const response = NextResponse.json({
    authenticated: true,
    configured: true,
  });

  response.cookies.set({
    name: MONITOR_SESSION_COOKIE_NAME,
    value: buildSessionToken(username, password, sessionSecret),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({
    authenticated: false,
    configured: getMonitorConfig().configured,
  });

  response.cookies.set({
    name: MONITOR_SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}
