import { createHmac, timingSafeEqual } from "node:crypto";

import { Participation, Project, Subtask } from "./types";

export interface EvaluationProxyRequest {
  projectId: string;
  participationId: string;
  subtaskId: string;
  waitForResult: boolean;
  timeoutMs: number;
  pollIntervalMs: number;
}

export interface EvaluationAccessClaims {
  evaluationId: string;
  userId: string;
  participationId: string;
  subtaskId: string;
}

export interface UpstreamEvaluationRequest {
  projectDetail: string;
  tasks: string[];
  currentTask: string;
  githubRepoUrl: string;
  evidence: string;
  youtubeLink: null;
}

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_POLL_INTERVAL_MS = 3_000;
const MAX_TIMEOUT_MS = 60_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_POLL_INTERVAL_MS = 15_000;
const MIN_POLL_INTERVAL_MS = 500;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseEvaluationProxyRequest(body: unknown): EvaluationProxyRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const candidate = body as Record<string, unknown>;
  const projectId = asTrimmedString(candidate.projectId);
  const participationId = asTrimmedString(candidate.participationId);
  const subtaskId = asTrimmedString(candidate.subtaskId);

  if (!projectId || !participationId || !subtaskId) {
    return null;
  }

  const timeoutMs =
    typeof candidate.timeoutMs === "number" && Number.isFinite(candidate.timeoutMs)
      ? clamp(candidate.timeoutMs, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS)
      : DEFAULT_TIMEOUT_MS;
  const pollIntervalMs =
    typeof candidate.pollIntervalMs === "number" && Number.isFinite(candidate.pollIntervalMs)
      ? clamp(candidate.pollIntervalMs, MIN_POLL_INTERVAL_MS, MAX_POLL_INTERVAL_MS)
      : DEFAULT_POLL_INTERVAL_MS;

  return {
    projectId,
    participationId,
    subtaskId,
    waitForResult: candidate.waitForResult !== false,
    timeoutMs,
    pollIntervalMs,
  };
}

export function buildEvaluationProxyPayload(input: {
  project: Pick<Project, "title" | "subtasks">;
  participation: Pick<Participation, "studentGitHubRepo">;
  subtask: Pick<Subtask, "title" | "description">;
}): UpstreamEvaluationRequest {
  return {
    projectDetail: input.project.title,
    tasks: input.project.subtasks.map((task) => task.title),
    currentTask: input.subtask.title,
    githubRepoUrl: input.participation.studentGitHubRepo ?? "",
    evidence: input.subtask.description || "Task completion criteria",
    youtubeLink: null,
  };
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createEvaluationAccessToken(claims: EvaluationAccessClaims, secret: string): string {
  const payload = encodeBase64Url(JSON.stringify(claims));
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export function verifyEvaluationAccessToken(token: string, secret: string): EvaluationAccessClaims | null {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload, secret);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as Partial<EvaluationAccessClaims>;
    const evaluationId = asTrimmedString(parsed.evaluationId);
    const userId = asTrimmedString(parsed.userId);
    const participationId = asTrimmedString(parsed.participationId);
    const subtaskId = asTrimmedString(parsed.subtaskId);

    if (!evaluationId || !userId || !participationId || !subtaskId) {
      return null;
    }

    return {
      evaluationId,
      userId,
      participationId,
      subtaskId,
    };
  } catch {
    return null;
  }
}
