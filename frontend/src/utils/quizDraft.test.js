import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import {
  clearQuizDraft,
  getQuizDraftKey,
  getQuizSignature,
  loadQuizDraft,
  saveQuizDraft,
} from "./quizDraft.js";

function createStorage() {
  const items = new Map();
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
  };
}

const questions = [
  { question: "Q1", options: ["a", "b", "c"], correctIndex: 0, points: 5 },
  { question: "Q2", options: ["a", "b"], correctIndex: 1, points: 5 },
  { question: "Q3", options: ["a", "b", "c", "d"], correctIndex: 2, points: 10 },
];
const key = getQuizDraftKey("day-1");

function storeRaw(storage, draft) {
  storage.setItem(
    key,
    JSON.stringify({
      version: 1,
      signature: getQuizSignature(questions),
      ...draft,
    }),
  );
}

describe("quiz drafts", () => {
  let storage;

  beforeEach(() => {
    storage = createStorage();
  });

  test("restores a saved in-progress draft", () => {
    saveQuizDraft(key, questions, { step: 2, answers: [1, 0] }, storage);

    assert.deepEqual(loadQuizDraft(key, questions, storage), {
      step: 2,
      answers: [1, 0],
    });
  });

  test("restores a fully answered draft whose submit did not succeed", () => {
    saveQuizDraft(key, questions, { step: 2, answers: [1, 0, 3] }, storage);

    assert.deepEqual(loadQuizDraft(key, questions, storage), {
      step: 2,
      answers: [1, 0, 3],
    });
  });

  test("keeps drafts for different days separate", () => {
    saveQuizDraft(key, questions, { step: 1, answers: [2] }, storage);

    assert.equal(
      loadQuizDraft(getQuizDraftKey("day-2"), questions, storage),
      null,
    );
  });

  test("returns null after the draft is cleared", () => {
    saveQuizDraft(key, questions, { step: 1, answers: [2] }, storage);
    clearQuizDraft(key, storage);

    assert.equal(loadQuizDraft(key, questions, storage), null);
  });

  test("returns null when nothing is stored", () => {
    assert.equal(loadQuizDraft(key, questions, storage), null);
  });

  test("ignores malformed JSON", () => {
    storage.setItem(key, "{not json");

    assert.equal(loadQuizDraft(key, questions, storage), null);
  });

  test("ignores non-object JSON", () => {
    storage.setItem(key, "null");
    assert.equal(loadQuizDraft(key, questions, storage), null);

    storage.setItem(key, "42");
    assert.equal(loadQuizDraft(key, questions, storage), null);
  });

  test("ignores a draft with an unknown version", () => {
    storeRaw(storage, { version: 0, step: 1, answers: [0] });

    assert.equal(loadQuizDraft(key, questions, storage), null);
  });

  test("ignores a draft taken before the question count changed", () => {
    saveQuizDraft(key, questions, { step: 2, answers: [1, 0] }, storage);

    assert.equal(loadQuizDraft(key, questions.slice(0, 2), storage), null);
    assert.equal(
      loadQuizDraft(
        key,
        [...questions, { question: "Q4", options: ["a"], points: 1 }],
        storage,
      ),
      null,
    );
  });

  test("ignores a draft taken before a question was edited", () => {
    saveQuizDraft(key, questions, { step: 1, answers: [1] }, storage);
    const edited = questions.map((question, index) =>
      index === 0 ? { ...question, options: ["x", "y", "z"] } : question,
    );

    assert.equal(loadQuizDraft(key, edited, storage), null);
  });

  test("ignores answers that are not valid option indexes", () => {
    for (const answers of [[3], [-1], [1.5], ["1"], [null], [0, 2]]) {
      storeRaw(storage, {
        step: Math.min(answers.length, questions.length - 1),
        answers,
      });

      assert.equal(
        loadQuizDraft(key, questions, storage),
        null,
        `answers ${JSON.stringify(answers)} should be rejected`,
      );
    }
  });

  test("ignores a step that does not match the answers", () => {
    for (const step of [0, 2, -1, 3, "1", undefined]) {
      storeRaw(storage, { step, answers: [0] });

      assert.equal(
        loadQuizDraft(key, questions, storage),
        null,
        `step ${JSON.stringify(step)} should be rejected`,
      );
    }
  });

  test("ignores empty or oversized answer lists", () => {
    storeRaw(storage, { step: 0, answers: [] });
    assert.equal(loadQuizDraft(key, questions, storage), null);

    storeRaw(storage, { step: 2, answers: [0, 0, 0, 0] });
    assert.equal(loadQuizDraft(key, questions, storage), null);
  });

  test("does not throw when storage is unavailable", () => {
    const brokenStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    };

    assert.doesNotThrow(() => {
      saveQuizDraft(key, questions, { step: 1, answers: [0] }, brokenStorage);
      clearQuizDraft(key, brokenStorage);
    });
    assert.equal(loadQuizDraft(key, questions, brokenStorage), null);
    assert.equal(loadQuizDraft(key, questions, null), null);
  });
});
