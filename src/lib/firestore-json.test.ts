import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";

import {
  deserializeFirestoreJson,
  serializeFirestoreJson,
} from "./firestore-json";

test("serializeFirestoreJson and deserializeFirestoreJson preserve nested timestamp fields", () => {
  const now = Timestamp.now();
  const payload = {
    createdAt: now,
    nested: {
      items: [
        { reviewedAt: now },
        { values: [now, "plain-text", null] },
      ],
    },
  };

  const serialized = serializeFirestoreJson(payload) as {
    createdAt: { __oilTimestamp: string };
    nested: {
      items: Array<
        | { reviewedAt: { __oilTimestamp: string } }
        | { values: Array<{ __oilTimestamp: string } | string | null> }
      >;
    };
  };

  assert.equal(typeof serialized.createdAt.__oilTimestamp, "string");

  const deserialized = deserializeFirestoreJson<typeof payload>(serialized);
  const reviewedEntry = deserialized.nested.items[0];
  const valuesEntry = deserialized.nested.items[1];

  assert.ok(deserialized.createdAt instanceof Timestamp);
  assert.ok(reviewedEntry && "reviewedAt" in reviewedEntry);
  assert.ok(valuesEntry && "values" in valuesEntry);
  assert.ok(reviewedEntry.reviewedAt instanceof Timestamp);
  const values = valuesEntry.values;
  assert.ok(Array.isArray(values));
  assert.ok(values[0] instanceof Timestamp);
  assert.equal(values[1], "plain-text");
  assert.equal(values[2], null);
});
