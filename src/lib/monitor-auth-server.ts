import { createHash, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

import { MONITOR_SESSION_COOKIE_NAME } from "@/lib/monitor-auth";

export function getMonitorConfig() {
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

export function buildMonitorSessionToken(
  username: string,
  password: string,
  sessionSecret: string,
) {
  return createHash("sha256")
    .update(`${username}:${password}:${sessionSecret}`)
    .digest("hex");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getExpectedMonitorSessionToken() {
  const { username, password, sessionSecret, configured } = getMonitorConfig();

  if (!configured || !username || !password || !sessionSecret) {
    return null;
  }

  return buildMonitorSessionToken(username, password, sessionSecret);
}

export function isValidMonitorSession(request: Request | NextRequest) {
  const expectedToken = getExpectedMonitorSessionToken();
  if (!expectedToken) {
    return false;
  }

  const cookieHeader =
    "cookies" in request && typeof request.cookies?.get === "function"
      ? request.cookies.get(MONITOR_SESSION_COOKIE_NAME)?.value
      : request.headers
          .get("cookie")
          ?.split(";")
          .map((part) => part.trim())
          .find((part) => part.startsWith(`${MONITOR_SESSION_COOKIE_NAME}=`))
          ?.split("=")[1];

  if (!cookieHeader) {
    return false;
  }

  return safeCompare(expectedToken, cookieHeader);
}

