// In-progress quiz drafts live in sessionStorage only. They are never sent to
// the server: grading and the one-attempt rule stay in quizController.
const DRAFT_VERSION = 1;

function getSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getQuizDraftKey(dayId) {
  return `hs.quizDraft.${dayId}`;
}

// Fingerprint of the questions a draft was taken against, so a draft is
// dropped if the quiz is edited or a different quiz is mapped to the day.
export function getQuizSignature(questions) {
  const text = JSON.stringify(
    questions.map((question) => [question.question, question.options]),
  );
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (Math.imul(31, hash) + text.charCodeAt(index)) | 0;
  }
  return `${questions.length}:${(hash >>> 0).toString(36)}`;
}

// Returns { step, answers } for a usable draft, or null for anything missing,
// malformed, or taken against a different version of the quiz.
export function parseQuizDraft(raw, questions) {
  if (!raw || !Array.isArray(questions) || questions.length === 0) return null;

  let draft;
  try {
    draft = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    !draft ||
    draft.version !== DRAFT_VERSION ||
    draft.signature !== getQuizSignature(questions)
  ) {
    return null;
  }

  const { step, answers } = draft;
  if (
    !Array.isArray(answers) ||
    answers.length === 0 ||
    answers.length > questions.length
  ) {
    return null;
  }

  const answersValid = answers.every(
    (answer, index) =>
      Number.isInteger(answer) &&
      answer >= 0 &&
      answer < (questions[index].options?.length ?? 0),
  );
  if (!answersValid) return null;

  // The quiz advances one question per answer and stays on the last question
  // once every answer is filled in (e.g. when the submit request failed).
  if (step !== Math.min(answers.length, questions.length - 1)) return null;

  return { step, answers };
}

export function loadQuizDraft(key, questions, storage = getSessionStorage()) {
  try {
    return parseQuizDraft(storage?.getItem(key), questions);
  } catch {
    return null;
  }
}

export function saveQuizDraft(
  key,
  questions,
  { step, answers },
  storage = getSessionStorage(),
) {
  try {
    storage?.setItem(
      key,
      JSON.stringify({
        version: DRAFT_VERSION,
        signature: getQuizSignature(questions),
        step,
        answers,
      }),
    );
  } catch {
    // Storage can be full or disabled; the quiz still works without a draft.
  }
}

export function clearQuizDraft(key, storage = getSessionStorage()) {
  try {
    storage?.removeItem(key);
  } catch {
    // Ignore unavailable storage, as above.
  }
}
