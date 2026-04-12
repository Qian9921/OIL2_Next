import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { serializeFirestoreJson } from "@/lib/firestore-json";
import { getEffectiveUserRole } from "@/lib/role-routing";
import {
  clearStudentTaskChatHistoryAdmin,
  completeStudentSubtaskAdmin,
  saveStudentEvaluationHistoryAdmin,
  saveStudentGitHubRepoAdmin,
  saveStudentPromptHistoryAdmin,
  saveStudentTaskChatHistoryAdmin,
  submitStudentProjectForReviewAdmin,
} from "@/lib/server-firestore";
import type { ChatMessage, Participation } from "@/lib/types";

type StudentParticipationAction =
  | "save-chat-history"
  | "clear-chat-history"
  | "save-github-repo"
  | "save-prompt-history"
  | "save-evaluation-history"
  | "complete-subtask"
  | "submit-project";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isChatMessage(value: unknown): value is ChatMessage {
  return (
    isObject(value) &&
    (value.role === "user" || value.role === "model" || value.role === "system") &&
    typeof value.content === "string"
  );
}

function toStatus(error: Error) {
  if (error.message === "Unauthorized" || error.message === "Forbidden") {
    return 403;
  }

  if (
    error.message === "Participation not found" ||
    error.message === "Project not found" ||
    error.message === "Subtask not found" ||
    error.message === "User not found"
  ) {
    return 404;
  }

  if (error.message === "Task evaluation score is below the completion threshold") {
    return 409;
  }

  return 500;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ participationId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { participationId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "Invalid action payload" }, { status: 400 });
  }

  const action = body.action as StudentParticipationAction;

  try {
    switch (action) {
      case "save-chat-history": {
        if (typeof body.subtaskId !== "string" || !Array.isArray(body.messages) || !body.messages.every(isChatMessage)) {
          return NextResponse.json({ error: "Invalid chat history payload" }, { status: 400 });
        }

        const chatHistory = await saveStudentTaskChatHistoryAdmin({
          studentId: session.user.id,
          participationId,
          subtaskId: body.subtaskId,
          messages: body.messages,
        });

        return NextResponse.json(serializeFirestoreJson({ chatHistory }));
      }

      case "clear-chat-history": {
        if (typeof body.subtaskId !== "string") {
          return NextResponse.json({ error: "Invalid clear chat payload" }, { status: 400 });
        }

        const chatHistory = await clearStudentTaskChatHistoryAdmin({
          studentId: session.user.id,
          participationId,
          subtaskId: body.subtaskId,
        });

        return NextResponse.json(serializeFirestoreJson({ chatHistory }));
      }

      case "save-github-repo": {
        if (typeof body.subtaskId !== "string" || typeof body.repoUrl !== "string") {
          return NextResponse.json({ error: "Invalid GitHub payload" }, { status: 400 });
        }

        const result = await saveStudentGitHubRepoAdmin({
          studentId: session.user.id,
          participationId,
          subtaskId: body.subtaskId,
          repoUrl: body.repoUrl.trim(),
        });

        return NextResponse.json(serializeFirestoreJson(result));
      }

      case "save-prompt-history": {
        if (
          typeof body.subtaskId !== "string" ||
          typeof body.promptContent !== "string" ||
          !isObject(body.qualityData) ||
          typeof body.qualityData.qualityScore !== "number"
        ) {
          return NextResponse.json({ error: "Invalid prompt history payload" }, { status: 400 });
        }

        const result = await saveStudentPromptHistoryAdmin({
          studentId: session.user.id,
          participationId,
          subtaskId: body.subtaskId,
          promptContent: body.promptContent,
          qualityData: {
            qualityScore: body.qualityData.qualityScore,
            goalScore:
              typeof body.qualityData.goalScore === "number" ? body.qualityData.goalScore : undefined,
            contextScore:
              typeof body.qualityData.contextScore === "number"
                ? body.qualityData.contextScore
                : undefined,
            expectationsScore:
              typeof body.qualityData.expectationsScore === "number"
                ? body.qualityData.expectationsScore
                : undefined,
            sourceScore:
              typeof body.qualityData.sourceScore === "number" ? body.qualityData.sourceScore : undefined,
            isGoodPrompt:
              typeof body.qualityData.isGoodPrompt === "boolean"
                ? body.qualityData.isGoodPrompt
                : undefined,
          },
          feedback:
            body.feedback === null
              ? null
              : isObject(body.feedback) && (body.feedback.feedback === undefined || typeof body.feedback.feedback === "string")
                ? { feedback: typeof body.feedback.feedback === "string" ? body.feedback.feedback : undefined }
                : undefined,
        });

        return NextResponse.json(serializeFirestoreJson(result));
      }

      case "save-evaluation-history":
      case "complete-subtask": {
        if (
          typeof body.subtaskId !== "string" ||
          !isObject(body.result) ||
          typeof body.result.score !== "number" ||
          typeof body.result.feedback !== "string"
        ) {
          return NextResponse.json({ error: "Invalid evaluation payload" }, { status: 400 });
        }

        const resultPayload = body.result as Omit<
          NonNullable<Participation["evaluationHistory"]>[string][number],
          "timestamp"
        >;

        const result =
          action === "complete-subtask"
            ? await completeStudentSubtaskAdmin({
                studentId: session.user.id,
                participationId,
                subtaskId: body.subtaskId,
                result: resultPayload,
              })
            : await saveStudentEvaluationHistoryAdmin({
                studentId: session.user.id,
                participationId,
                subtaskId: body.subtaskId,
                result: resultPayload,
              });

        return NextResponse.json(serializeFirestoreJson(result));
      }

      case "submit-project": {
        if (typeof body.content !== "string" || !body.content.trim()) {
          return NextResponse.json({ error: "Invalid submission payload" }, { status: 400 });
        }

        const result = await submitStudentProjectForReviewAdmin({
          studentId: session.user.id,
          participationId,
          content: body.content.trim(),
        });

        return NextResponse.json(serializeFirestoreJson(result));
      }

      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error("Student participation action failed");
    return NextResponse.json(
      { error: normalizedError.message },
      { status: toStatus(normalizedError) },
    );
  }
}
