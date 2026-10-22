import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Play,
  RotateCcw,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Markdown } from "./Markdown";
import {
  clearQuizDraft,
  getQuizDraftKey,
  loadQuizDraft,
  saveQuizDraft,
} from "../utils/quizDraft";
import "./daymodal.css";

function toEmbedUrl(url) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${parsedUrl.pathname}`;
    }

    const videoId = parsedUrl.searchParams.get("v");
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch {
    return url;
  }

  return url;
}

function Pill({ children, tone = "muted" }) {
  return (
    <span className={`daymodal-pill daymodal-pill-${tone}`}>
      {children}
    </span>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="daymodal-progress-bar-track">
      <div
        className="daymodal-progress-bar-fill"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function DailyQuiz({
  questions,
  draftKey,
  onSubmit,
  previousScore,
  dailyQuizAttempt,
  submitting = false,
  userName,
  moduleTheme,
}) {
  const quizAlreadyTaken = Boolean(dailyQuizAttempt);
  const [restoredDraft] = useState(() =>
    quizAlreadyTaken ? null : loadQuizDraft(draftKey, questions),
  );
  const [step, setStep] = useState(restoredDraft?.step ?? 0);
  const [answers, setAnswers] = useState(restoredDraft?.answers ?? []);
  const [done, setDone] = useState(false);
  const totalMarks = useMemo(
    () => questions.reduce((sum, question) => sum + question.points, 0),
    [questions],
  );
  const [viewMode, setViewMode] = useState(
    quizAlreadyTaken ? "results" : "start",
  );
  const canResume = answers.length > 0;

  // Sync viewMode if dailyQuizAttempt is loaded after initial mount, and drop
  // any leftover draft so it can never be replayed against a taken quiz.
  useEffect(() => {
    if (quizAlreadyTaken) {
      setViewMode("results");
      clearQuizDraft(draftKey);
    }
  }, [quizAlreadyTaken, draftKey]);

  const scoreFromAnswers = answers.reduce((sum, answer, index) => {
    const question = questions[index];
    if (!question) return sum;
    return answer === question.correctIndex ? sum + question.points : sum;
  }, 0);

  const resultPayload = dailyQuizAttempt || {
    score: scoreFromAnswers,
    totalMarks,
    userAnswers: answers,
    attemptedAt: new Date().toISOString(),
  };

  const handleAnswer = async (optionIndex) => {
    const nextAnswers = [...answers];
    nextAnswers[step] = optionIndex;
    setAnswers(nextAnswers);

    if (step + 1 < questions.length) {
      saveQuizDraft(draftKey, questions, {
        step: step + 1,
        answers: nextAnswers,
      });
      setStep((currentStep) => currentStep + 1);
      return;
    }

    // Keep the full draft until the server confirms the submit, so a failed
    // request can be retried after closing the modal or reloading.
    saveQuizDraft(draftKey, questions, { step, answers: nextAnswers });

    const finalScore = nextAnswers.reduce((sum, answer, index) => {
      const question = questions[index];
      return answer === question.correctIndex ? sum + question.points : sum;
    }, 0);

    const submitted = await onSubmit(finalScore, nextAnswers, totalMarks);
    if (submitted) clearQuizDraft(draftKey);
    setDone(true);
    setViewMode("results");
  };

  const handleStartOver = () => {
    clearQuizDraft(draftKey);
    setAnswers([]);
    setStep(0);
    setViewMode("quiz");
  };

  if (viewMode === "start") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="daymodal-quiz-start-view"
      >
        <div
          className="daymodal-quiz-start-icon-wrap"
          style={{ background: `${moduleTheme.accent}1c` }}
        >
          <Zap className="size-8 daymodal-quiz-accent-icon" />
        </div>
        <div className="daymodal-quiz-start-label">
          {questions.length} question{questions.length !== 1 ? "s" : ""}
        </div>
        <div className="daymodal-quiz-start-sub">
          {canResume
            ? `${answers.length} of ${questions.length} answered · `
            : ""}
          {totalMarks} pts total
        </div>
        <button
          type="button"
          disabled={quizAlreadyTaken || submitting}
          onClick={() => setViewMode("quiz")}
          className="daymodal-primary-btn"
          style={{ background: moduleTheme.button }}
        >
          <Zap className="size-4" />
          {quizAlreadyTaken
            ? "Quiz Completed"
            : canResume
              ? "Resume Quiz"
              : "Start Quiz"}
        </button>
        {canResume && !quizAlreadyTaken ? (
          <button
            type="button"
            disabled={submitting}
            onClick={handleStartOver}
            className="daymodal-ready-btn mt-3"
          >
            <RotateCcw className="size-4" />
            Start over
          </button>
        ) : null}
      </motion.div>
    );
  }

  if (viewMode === "results" && (done || quizAlreadyTaken)) {
    const hasAnswerReview =
      Array.isArray(resultPayload.userAnswers) &&
      resultPayload.userAnswers.length === questions.length;

    return (
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="daymodal-review-section"
      >
        <div className="daymodal-results-header">
          {userName ? (
            <div className="daymodal-results-user">
              Results for{" "}
              <span className="daymodal-results-username">{userName}</span>
            </div>
          ) : null}
          <div className="daymodal-results-trophy-wrap">
            <Trophy className="size-8" />
          </div>
          <div className="daymodal-results-score">
            {resultPayload.score} / {resultPayload.totalMarks || totalMarks} pts
          </div>
          <p className="daymodal-results-status">Quiz completed.</p>
          {previousScore !== undefined &&
          resultPayload.score > previousScore &&
          !dailyQuizAttempt ? (
            <div className="daymodal-score-improvement">
              <Zap className="size-3.5" />+{resultPayload.score - previousScore}{" "}
              pts earned
            </div>
          ) : null}
        </div>

        <div className="daymodal-review-section">
          <h4 className="daymodal-review-heading">
            {hasAnswerReview ? "Answer Review" : "Correct Answers"}
          </h4>

          {questions.map((question, questionIndex) => {
            const userAnswer = resultPayload.userAnswers?.[questionIndex];
            const isCorrect = hasAnswerReview
              ? userAnswer === question.correctIndex
              : true;

            return (
              <div
                key={questionIndex}
                className="daymodal-review-card"
              >
                <div className="daymodal-review-layout">
                  <div
                    className={`daymodal-review-badge ${
                      isCorrect ? "is-correct" : "is-incorrect"
                    }`}
                  >
                    {isCorrect ? (
                      <Check className="size-4" />
                    ) : (
                      <X className="size-4" />
                    )}
                  </div>

                  <div className="daymodal-review-body">
                    <p className="daymodal-review-question">
                      Q{questionIndex + 1}: {question.question}
                    </p>
                    <div className="daymodal-review-answers-stack">
                      <div className="daymodal-review-answer-pill correct">
                        <span className="font-semibold">Correct Answer:</span>{" "}
                        {question.options[question.correctIndex]}
                      </div>
                      {hasAnswerReview && !isCorrect ? (
                        <div className="daymodal-review-answer-pill incorrect">
                          <span className="font-semibold">Your Answer:</span>{" "}
                          {question.options[userAnswer]}
                        </div>
                      ) : null}
                    </div>
                    <div className="daymodal-review-points">
                      {question.points} points
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  const activeQuestion = questions[step];

  return (
    <div className="daymodal-content-wrapper">
      <div>
        <div className="daymodal-quiz-step-info">
          <span>
            Question {step + 1} of {questions.length}
          </span>
          <span>{totalMarks} pts total</span>
        </div>
        <ProgressBar value={((step + 1) / questions.length) * 100} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          <p className="daymodal-question-text">{activeQuestion.question}</p>
          <div className="daymodal-options-grid">
            {activeQuestion.options.map((option, optionIndex) => (
              <button
                key={optionIndex}
                type="button"
                onClick={() => handleAnswer(optionIndex)}
                className="daymodal-option-btn"
              >
                <span>
                  {String.fromCharCode(65 + optionIndex)}.
                </span>
                {option}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DayModal({
  chapter,
  moduleTheme,
  isCompleted,
  dailyScore,
  dailyQuizAttempt,
  userName,
  onClose,
  onComplete,
  submitting = false,
}) {
  const [locallyCompleted, setLocallyCompleted] = useState(false);
  const videoUrls = Array.isArray(chapter.videoUrls)
    ? chapter.videoUrls.filter(Boolean)
    : chapter.videoUrl
      ? [chapter.videoUrl]
      : [];
  const hasQuiz = (chapter.quiz?.length ?? 0) > 0;
  const [activeTab, setActiveTab] = useState("content");
  const quizDone = locallyCompleted || isCompleted || Boolean(dailyQuizAttempt);

  const handleQuizSubmit = async (score, userAnswers, totalMarks) => {
    if (dailyQuizAttempt || submitting) return false;

    const submitted = await onComplete(
      chapter.id,
      score,
      userAnswers,
      totalMarks,
    );
    setLocallyCompleted(true);
    return submitted;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="daymodal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 220 }}
        className="daymodal-drawer"
      >
        <div
          className="daymodal-header"
          style={{
            background: `${moduleTheme.banner}, radial-gradient(circle at top right, ${moduleTheme.dot} 1px, transparent 1px)`,
            backgroundSize: "auto, 14px 14px",
            boxShadow: `inset 0 -1px 0 rgba(255, 255, 255, 0.08), 0 12px 40px ${moduleTheme.bannerShadow}`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="daymodal-header-day">
                Day {chapter.day}
              </div>
              <h2 className="daymodal-header-title">{chapter.title}</h2>
              <div className="daymodal-header-chips">
                {videoUrls.length > 0 ? (
                  <Pill>
                    <Play className="size-3" />
                    {videoUrls.length === 1 ? "Video" : `${videoUrls.length} videos`}
                  </Pill>
                ) : null}
                {hasQuiz ? (
                  <Pill>
                    <Zap className="size-3" />
                    {chapter.quiz.length} questions
                  </Pill>
                ) : null}
                {isCompleted ? (
                  <Pill tone="success">
                    <CheckCircle2 className="size-3" />
                    Completed
                  </Pill>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="daymodal-close-btn"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {hasQuiz ? (
          <div className="daymodal-tabs">
            {[
              { key: "content", label: "Content & Goals", icon: BookOpen },
              { key: "quiz", label: "Daily Quiz", icon: Zap },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`daymodal-tab ${activeTab === key ? "is-active" : ""}`}
              >
                <Icon className="size-4" />
                {label}
                {key === "quiz" && quizDone ? (
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                ) : null}
              </button>
            ))}
          </div>
        ) : null}

        <div className="daymodal-body">
          <AnimatePresence mode="wait">
            {activeTab === "content" ? (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="daymodal-content-wrapper"
              >
                {videoUrls.length > 0 ? (
                  <div className="daymodal-content-wrapper">
                    {videoUrls.map((videoUrl, index) => (
                      <div
                        key={`${videoUrl}-${index}`}
                        className="daymodal-video-container"
                      >
                        <iframe
                          src={toEmbedUrl(videoUrl)}
                          className="h-full w-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={`${chapter.title} video ${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                {chapter.contentMarkdown ? (
                  <div className="daymodal-content-card">
                    <div className="daymodal-content-card-label">
                      <BookOpen className="size-3.5" />
                      Lesson content
                    </div>
                    <Markdown source={chapter.contentMarkdown} tone="light" />
                  </div>
                ) : null}

                {hasQuiz && !quizDone ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="daymodal-ready-box"
                  >
                    <div className="daymodal-ready-text-group">
                      <div className="daymodal-ready-title">Ready to test yourself?</div>
                      <div className="daymodal-ready-subtext">
                        {chapter.quiz.length} questions. Completing the quiz
                        will mark this day done.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("quiz")}
                      className="daymodal-ready-btn"
                    >
                      Take Quiz
                      <ChevronRight className="size-4" />
                    </button>
                  </motion.div>
                ) : null}

                {!hasQuiz && !quizDone ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={async () => {
                      await onComplete(chapter.id, null, null, null);
                      setLocallyCompleted(true);
                    }}
                    className="daymodal-primary-btn"
                    style={{ background: moduleTheme.button }}
                  >
                    <CheckCircle2 className="size-4" />
                    Mark day complete
                  </button>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="quiz"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="daymodal-quiz-card">
                  <div className="daymodal-quiz-header">
                    <div className="daymodal-quiz-title-group">
                      <Zap className="size-4 daymodal-quiz-accent-icon" />
                      <span className="daymodal-quiz-title">Day {chapter.day} Quiz</span>
                    </div>
                    {dailyScore !== undefined ? (
                      <Pill tone="bright">Best: {dailyScore} pts</Pill>
                    ) : null}
                  </div>

                  {hasQuiz ? (
                    <DailyQuiz
                      key={dailyQuizAttempt ? "completed" : "pending"}
                      questions={chapter.quiz}
                      draftKey={getQuizDraftKey(chapter.id)}
                      onSubmit={handleQuizSubmit}
                      previousScore={dailyScore}
                      dailyQuizAttempt={dailyQuizAttempt}
                      submitting={submitting}
                      userName={userName}
                      moduleTheme={moduleTheme}
                    />
                  ) : (
                    <div className="p-6 text-center text-slate-500">
                      No quiz questions found for this day.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

export { DayModal };
