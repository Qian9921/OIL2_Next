import { Timestamp } from "firebase/firestore";

import { fromIsoTimestamp } from "@/lib/timestamp-serialization";

type TimestampMarker = {
  __oilTimestamp: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function isTimestampLike(value: unknown): value is { toDate(): Date } {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  );
}

function isTimestampMarker(value: unknown): value is TimestampMarker {
  return (
    isPlainObject(value) &&
    Object.keys(value).length === 1 &&
    typeof value.__oilTimestamp === "string"
  );
}

export function serializeFirestoreJson<T>(value: T): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return {
      __oilTimestamp: value.toISOString(),
    } satisfies TimestampMarker;
  }

  if (isTimestampLike(value)) {
    return {
      __oilTimestamp: value.toDate().toISOString(),
    } satisfies TimestampMarker;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeFirestoreJson(item));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, serializeFirestoreJson(entryValue)]),
    );
  }

  return value;
}

export function deserializeFirestoreJson<T>(value: unknown): T {
  if (value === null || value === undefined) {
    return value as T;
  }

  if (isTimestampMarker(value)) {
    return fromIsoTimestamp(value.__oilTimestamp) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deserializeFirestoreJson(item)) as T;
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, deserializeFirestoreJson(entryValue)]),
    ) as T;
  }

  return value as T;
}

export function isFirebaseTimestamp(value: unknown): value is Timestamp {
  return value instanceof Timestamp;
}
