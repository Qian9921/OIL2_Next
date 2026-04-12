import { Timestamp } from "firebase/firestore";

type TimestampLike = {
  toDate(): Date;
};

export function toIsoTimestamp(timestamp: TimestampLike | Date | null | undefined) {
  if (!timestamp) {
    return null;
  }

  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  return timestamp.toDate().toISOString();
}

export function fromIsoTimestamp(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return Timestamp.fromDate(new Date(value));
}

