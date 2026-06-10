import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Markdown } from "../src/components/Markdown";
import {
  createAdminQuiz,
  deleteAdminQuiz,
  getAdminModule,
  listAdminModules,
  listAdminQuizzes,
  updateAdminModule,
  updateAdminQuiz,
} from "./admin-api";

const makeQuestion = () => ({
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
});

const makeDay = (index) => ({
  id: "",
  title: `Day ${index}`,
  videoUrls: [""],
  markdownContent: "",
  markdownFileName: "",
  quizId: "",
  questions: [makeQuestion()],
});

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const asId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return value._id.toString();
  if (value.id) return value.id.toString();
  return value.toString?.() || "";
};

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || "");
    reader.onerror = () => reject(new Error("Failed to read markdown file."));
    reader.readAsText(file);
  });

function MarkdownEditor({
  label,
  description,
  value,
  fileName,
  placeholder,
  minRows = 12,
  onChange,
  onUpload,
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-100">{label}</h3>
          {description ? <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p> : null}
          {fileName ? <p className="mt-2 text-xs text-emerald-300">Loaded: {fileName}</p> : null}
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-indigo-500 hover:bg-gray-900 hover:text-white">
          Upload markdown
          <input
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            onChange={(event) => onUpload(event.target.files?.[0])}
            className="sr-only"
          />
        </label>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Markdown editor
          </span>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={minRows}
            spellCheck
            placeholder={placeholder}
            className="min-h-80 w-full resize-y rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 font-mono text-sm leading-6 text-white outline-none transition placeholder:text-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
          <p className="mt-2 text-xs text-gray-600">
            Supports headings, paragraphs, ordered and bullet lists, italics, tables, images, quotes, inline code, and code blocks.
          </p>
        </label>

        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Live preview
          </span>
          <div className="min-h-80 max-h-[560px] overflow-y-auto rounded-lg border border-gray-700 bg-slate-900 px-5 py-4 text-sm shadow-inner shadow-black/20">
            {value.trim() ? (
              <div className="admin-markdown-preview text-slate-200">
                <Markdown source={value} tone="dark" />
              </div>
            ) : (
              <p className="text-sm text-gray-500">Preview appears here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function quizBelongsToModule(quiz, moduleId) {
  return asId(quiz.moduleRefId || quiz.moduleId) === asId(moduleId);
}

function buildDaysFromModule(moduleDoc, moduleQuizzes) {
  const days = [];
  const quizzesByDayId = new Map(
    moduleQuizzes.map((quiz) => [asId(quiz.dayId), quiz]),
  );

  for (const chapter of moduleDoc.chapters || []) {
    for (const day of chapter.days || []) {
      const dayId = asId(day._id);
      const quiz = quizzesByDayId.get(dayId);
      days.push({
        id: dayId,
        title: day.title || `Day ${days.length}`,
        videoUrls: Array.isArray(day.videoUrl)
          ? day.videoUrl.filter(Boolean)
          : day.videoUrl
            ? [day.videoUrl]
            : [""],
        markdownContent: day.contentMarkdown || "",
        markdownFileName: "",
        quizId: quiz?._id || "",
        questions: quiz?.questions?.length
          ? quiz.questions.map((question) => ({
              question: question.question || "",
              options: [0, 1, 2, 3].map((index) => question.options?.[index] || ""),
              correctIndex: Number.isInteger(question.correctIndex)
                ? question.correctIndex
                : 0,
              points: question.points || 10,
            }))
          : [makeQuestion()],
      });
    }
  }

  return days;
}

export default function EditModule() {
  const navigate = useNavigate();
  const { id: routeModuleId } = useParams();
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState(routeModuleId || "");
  const [moduleNumber, setModuleNumber] = useState(1);
  const [moduleName, setModuleName] = useState("");
  const [learningPoints, setLearningPoints] = useState("");
  const [tempInfo, setTempInfo] = useState("");
  const [finalAssessment, setFinalAssessment] = useState("");
  const [finalAssessmentFileName, setFinalAssessmentFileName] = useState("");
  const [showFinalAssessment, setShowFinalAssessment] = useState(false);
  const [days, setDays] = useState([makeDay(0)]);
  const [moduleQuizzes, setModuleQuizzes] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingModule, setLoadingModule] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const dayCount = days.length;
  const slugPreview = useMemo(() => slugify(moduleName), [moduleName]);

  useEffect(() => {
    let active = true;

    async function loadModules() {
      setLoadingModules(true);
      setError("");
      try {
        const moduleList = await listAdminModules();
        if (!active) return;
        setModules(moduleList);
        if (!selectedModuleId && moduleList[0]?._id) {
          setSelectedModuleId(moduleList[0]._id);
        }
      } catch (err) {
        if (active) setError(err.message || "Failed to load modules.");
      } finally {
        if (active) setLoadingModules(false);
      }
    }

    loadModules();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (routeModuleId && routeModuleId !== selectedModuleId) {
      setSelectedModuleId(routeModuleId);
    }
  }, [routeModuleId, selectedModuleId]);

  useEffect(() => {
    if (!selectedModuleId) return;

    let active = true;

    async function loadModule() {
      setLoadingModule(true);
      setError("");
      setSuccess("");
      try {
        const [moduleDoc, quizList] = await Promise.all([
          getAdminModule(selectedModuleId),
          listAdminQuizzes(),
        ]);

        if (!active) return;

        const relatedQuizzes = quizList.filter((quiz) =>
          quizBelongsToModule(quiz, selectedModuleId),
        );

        setModuleNumber(moduleDoc.week || 1);
        setModuleName(moduleDoc.title || "");
        setLearningPoints((moduleDoc.learningOutcomes || []).join("\n"));
        setTempInfo(moduleDoc.tempInfo || "");
        setFinalAssessment(moduleDoc.finalTask || "");
        setFinalAssessmentFileName("");
        setShowFinalAssessment(moduleDoc.showFinalAssessment || false);
        setModuleQuizzes(relatedQuizzes);
        setDays(buildDaysFromModule(moduleDoc, relatedQuizzes));
      } catch (err) {
        if (active) setError(err.message || "Failed to load module.");
      } finally {
        if (active) setLoadingModule(false);
      }
    }

    loadModule();
    return () => {
      active = false;
    };
  }, [selectedModuleId]);

  const updateDayCount = (value) => {
    const nextCount = Math.max(0, Number(value) || 0);
    setDays((current) =>
      Array.from({ length: nextCount }, (_, index) => current[index] || makeDay(index)),
    );
  };

  const updateDay = (dayIndex, updater) => {
    setDays((current) =>
      current.map((day, index) => (index === dayIndex ? updater(day) : day)),
    );
  };

  const updateVideo = (dayIndex, videoIndex, value) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      videoUrls: day.videoUrls.map((url, index) =>
        index === videoIndex ? value : url,
      ),
    }));
  };

  const addVideo = (dayIndex) => {
    updateDay(dayIndex, (day) => ({ ...day, videoUrls: [...day.videoUrls, ""] }));
  };

  const removeVideo = (dayIndex, videoIndex) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      videoUrls:
        day.videoUrls.length === 1
          ? [""]
          : day.videoUrls.filter((_, index) => index !== videoIndex),
    }));
  };

  const handleTextUpload = async (file, onContent, onFileName) => {
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      onContent(content);
      onFileName(file.name);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMarkdownUpload = (dayIndex, file) => {
    handleTextUpload(
      file,
      (content) =>
        updateDay(dayIndex, (day) => ({
          ...day,
          markdownContent: content,
        })),
      (fileName) =>
        updateDay(dayIndex, (day) => ({
          ...day,
          markdownFileName: fileName,
        })),
    );
  };

  const updateQuestion = (dayIndex, questionIndex, key, value) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      questions: day.questions.map((question, index) =>
        index === questionIndex ? { ...question, [key]: value } : question,
      ),
    }));
  };

  const updateOption = (dayIndex, questionIndex, optionIndex, value) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      questions: day.questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, currentOptionIndex) =>
                currentOptionIndex === optionIndex ? value : option,
              ),
            }
          : question,
      ),
    }));
  };

  const addQuestion = (dayIndex) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      questions: [...day.questions, makeQuestion()],
    }));
  };

  const removeQuestion = (dayIndex, questionIndex) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      questions:
        day.questions.length === 1
          ? [makeQuestion()]
          : day.questions.filter((_, index) => index !== questionIndex),
    }));
  };

  const preparePayload = () => {
    const trimmedName = moduleName.trim();
    const slug = slugify(trimmedName);
    const outcomes = learningPoints
      .split("\n")
      .map((point) => point.trim().replace(/^[-*]\s+/, ""))
      .filter(Boolean);

    if (!selectedModuleId) {
      throw new Error("Select a module to edit.");
    }

    if (!Number.isInteger(Number(moduleNumber)) || Number(moduleNumber) < 1) {
      throw new Error("Module number must be a positive number.");
    }

    if (!trimmedName) {
      throw new Error("Module name is required.");
    }

    if (!slug) {
      throw new Error("Module name must contain letters or numbers.");
    }



    const preparedDays = days.map((day, dayIndex) => {
      const videoUrl = day.videoUrls.map((url) => url.trim()).filter(Boolean);
      const hasMarkdown = Boolean(day.markdownContent.trim());

      if (videoUrl.length === 0 && !hasMarkdown) {
        throw new Error(
          `Add at least one video link or one markdown file for Day ${dayIndex}.`,
        );
      }

      const questions = day.questions.map((question, questionIndex) => {
        const text = question.question.trim();
        const options = question.options.map((option) => option.trim());
        const correctIndex = Number(question.correctIndex);

        if (!text) {
          throw new Error(
            `Question ${questionIndex + 1} is missing for Day ${dayIndex}.`,
          );
        }

        if (options.some((option) => !option)) {
          throw new Error(
            `All 4 options are required for Day ${dayIndex}, Question ${questionIndex + 1}.`,
          );
        }

        if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
          throw new Error(
            `Choose a correct answer for Day ${dayIndex}, Question ${questionIndex + 1}.`,
          );
        }

        return {
          question: text,
          options,
          correctIndex,
          points: question.points || 10,
        };
      });

      return {
        id: day.id,
        quizId: day.quizId,
        title: `Day ${dayIndex}`,
        contentMarkdown: day.markdownContent,
        videoUrl,
        questions,
      };
    });

    return {
      modulePayload: {
        title: trimmedName,
        slug,
        description: outcomes.slice(0, 2).join(" ") || trimmedName,
        week: Number(moduleNumber),
        learningOutcomes: outcomes,
        difficulty: `${preparedDays.length}-day guided stack`,
        finalTask: finalAssessment.trim(),
        showFinalAssessment,
        tempInfo: tempInfo.trim(),
        isPublished: true,
        chapters: [
          {
            title: `${trimmedName} curriculum`,
            days: preparedDays.map(({ id, quizId, questions, ...day }) => ({
              ...(id ? { _id: id } : {}),
              ...day,
            })),
          },
        ],
      },
      preparedDays,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    let payload;
    try {
      payload = preparePayload();
    } catch (err) {
      setError(err.message);
      return;
    }

    setSaving(true);

    try {
      const updatedModule = await updateAdminModule(selectedModuleId, payload.modulePayload);
      const savedDays = (updatedModule.chapters || []).flatMap(
        (chapter) => chapter.days || [],
      );

      if (savedDays.length !== payload.preparedDays.length) {
        throw new Error("Module was updated, but day IDs were not returned correctly.");
      }

      const savedDaysByOriginalId = new Map(
        savedDays.map((day) => [asId(day._id), day]),
      );
      const savedDayIds = new Set(savedDays.map((day) => asId(day._id)));

      await Promise.all(
        payload.preparedDays.map((day, index) => {
          const savedDay = day.id
            ? savedDaysByOriginalId.get(asId(day.id)) || savedDays[index]
            : savedDays[index];

          if (!savedDay?._id) {
            throw new Error(`Could not match saved Day ${index + 1} to a database id.`);
          }

          const quizPayload = {
            moduleId: updatedModule._id,
            dayId: savedDay._id,
            questions: day.questions,
          };

          if (day.quizId) {
            return updateAdminQuiz(day.quizId, quizPayload);
          }

          return createAdminQuiz(quizPayload);
        }),
      );

      const removedQuizzes = moduleQuizzes.filter(
        (quiz) => !savedDayIds.has(asId(quiz.dayId)),
      );

      await Promise.all(removedQuizzes.map((quiz) => deleteAdminQuiz(quiz._id)));

      const refreshedQuizzes = await listAdminQuizzes();
      const relatedQuizzes = refreshedQuizzes.filter((quiz) =>
        quizBelongsToModule(quiz, updatedModule._id),
      );

      setModules((current) =>
        current.map((module) =>
          module._id === updatedModule._id ? updatedModule : module,
        ),
      );
      setModuleQuizzes(relatedQuizzes);
      setDays(buildDaysFromModule(updatedModule, relatedQuizzes));
      setSuccess(`Module "${updatedModule.title}" was updated.`);
    } catch (err) {
      setError(err.message || "Failed to update module.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Hackstack Admin
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Edit a Module</h1>
            <p className="mt-1 text-sm text-gray-400">
              Select a module, update its learning content, and sync daily quizzes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="rounded-lg border border-gray-800 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-700 hover:bg-gray-900"
          >
            Back to Dashboard
          </button>
        </div>

        {error ? (
          <div className="mb-5 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-5 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        <section className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Module to edit
            </span>
            <select
              value={selectedModuleId}
              onChange={(event) => {
                setSelectedModuleId(event.target.value);
                navigate(`/admin/modules/edit/${event.target.value}`, { replace: true });
              }}
              disabled={loadingModules || modules.length === 0}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            >
              {modules.length === 0 ? <option value="">No modules found</option> : null}
              {modules.map((module) => (
                <option key={module._id} value={module._id}>
                  Module {module.week || "-"}: {module.title}
                </option>
              ))}
            </select>
          </label>
        </section>

        {loadingModule ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-sm text-gray-400">
            Loading module content...
          </div>
        ) : null}

        {!loadingModule && selectedModuleId ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <div className="grid gap-4 md:grid-cols-[160px_1fr_180px]">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Module number
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={moduleNumber}
                    onChange={(event) => setModuleNumber(event.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Name of module
                  </span>
                  <input
                    type="text"
                    value={moduleName}
                    onChange={(event) => setModuleName(event.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  />
                  {slugPreview ? (
                    <span className="mt-1 block text-xs text-gray-500">Slug: {slugPreview}</span>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Number of days
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={dayCount}
                    onChange={(event) => updateDayCount(event.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  What this teaches
                </span>
                <textarea
                  value={learningPoints}
                  onChange={(event) => setLearningPoints(event.target.value)}
                  rows={5}
                  placeholder={`Write one short point per line
Build reusable React components
Manage state with hooks
Connect pages to real APIs`}
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </label>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Temporary info (meets, submission details, etc.)
                </span>
                <textarea
                  value={tempInfo}
                  onChange={(event) => setTempInfo(event.target.value)}
                  rows={3}
                  placeholder="e.g. 💻 Google Meet link: meet.google.com/abc-defg-hij | 📅 Submit capstone by Sunday 10 PM."
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </label>
            </section>

            {days.map((day, dayIndex) => (
              <motion.section
                key={`${day.id || "new"}-${dayIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-gray-800 bg-gray-900 p-5"
              >
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      Day {dayIndex}
                    </p>
                    <h2 className="text-lg font-bold">Videos, reading, and quiz</h2>
                  </div>
                  <div className="rounded-full bg-gray-950 px-3 py-1 text-xs text-gray-400">
                    {day.questions.length} question{day.questions.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-200">YouTube videos</h3>
                    <button
                      type="button"
                      onClick={() => addVideo(dayIndex)}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Add video
                    </button>
                  </div>

                  {day.videoUrls.map((url, videoIndex) => (
                    <div key={videoIndex} className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(event) => updateVideo(dayIndex, videoIndex, event.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                      />
                      <button
                        type="button"
                        onClick={() => removeVideo(dayIndex, videoIndex)}
                        className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 transition hover:border-red-700 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <MarkdownEditor
                    label="Reading markdown"
                    description="Optional when this day has videos. Type the reading content here or upload one .md file."
                    value={day.markdownContent}
                    fileName={day.markdownFileName}
                    placeholder={`## Today's goals
- Learn the core idea
- Try the guided task

> Add notes, links, and instructions here.`}
                    onChange={(value) =>
                      updateDay(dayIndex, (currentDay) => ({
                        ...currentDay,
                        markdownContent: value,
                        markdownFileName: "",
                      }))
                    }
                    minRows={14}
                    onUpload={(file) => handleMarkdownUpload(dayIndex, file)}
                  />
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-200">Quiz questions</h3>
                    <button
                      type="button"
                      onClick={() => addQuestion(dayIndex)}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Add question
                    </button>
                  </div>

                  {day.questions.map((question, questionIndex) => (
                    <div
                      key={questionIndex}
                      className="rounded-lg border border-gray-800 bg-gray-950 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-300">
                          Question {questionIndex + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeQuestion(dayIndex, questionIndex)}
                          className="text-xs font-medium text-gray-500 transition hover:text-red-300"
                        >
                          Remove question
                        </button>
                      </div>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Question
                        </span>
                        <input
                          type="text"
                          value={question.question}
                          onChange={(event) =>
                            updateQuestion(dayIndex, questionIndex, "question", event.target.value)
                          }
                          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                        />
                      </label>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {question.options.map((option, optionIndex) => (
                          <label key={optionIndex} className="block">
                            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Option {optionIndex + 1}
                            </span>
                            <input
                              type="text"
                              value={option}
                              onChange={(event) =>
                                updateOption(
                                  dayIndex,
                                  questionIndex,
                                  optionIndex,
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                            />
                          </label>
                        ))}
                      </div>

                      <label className="mt-3 block max-w-xs">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Right answer
                        </span>
                        <select
                          value={question.correctIndex}
                          onChange={(event) =>
                            updateQuestion(
                              dayIndex,
                              questionIndex,
                              "correctIndex",
                              Number(event.target.value),
                            )
                          }
                          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                        >
                          <option value={0}>Option 1</option>
                          <option value={1}>Option 2</option>
                          <option value={2}>Option 3</option>
                          <option value={3}>Option 4</option>
                        </select>
                      </label>
                    </div>
                  ))}
                </div>
              </motion.section>
            ))}

            <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Optional
                </p>
                <h2 className="mt-1 text-lg font-bold">Final assessment</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Add final instructions, a capstone brief, or submission requirements.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-emerald-500 hover:bg-gray-900 hover:text-white">
                <input
                  type="checkbox"
                  checked={showFinalAssessment}
                  onChange={(e) => setShowFinalAssessment(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-gray-900"
                />
                Show final assessment to users
              </label>
            </div>
              <MarkdownEditor
                label="Final assessment markdown"
                description="Optional. Type markdown here or upload a .md file."
                value={finalAssessment}
                fileName={finalAssessmentFileName}
                placeholder={`## Final Assessment

Build and submit a project that demonstrates this module.

### Requirements
- Include a GitHub repository
- Include a live demo link`}
                minRows={12}
                onChange={(value) => {
                  setFinalAssessment(value);
                  setFinalAssessmentFileName("");
                }}
                onUpload={(file) =>
                  handleTextUpload(file, setFinalAssessment, setFinalAssessmentFileName)
                }
              />
            </section>

            <div className="sticky bottom-0 border-t border-gray-800 bg-gray-950/95 py-4 backdrop-blur">
              <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Saving updates the module and syncs one quiz for each day.
                </p>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900 disabled:text-emerald-200"
                >
                  {saving ? "Saving module..." : "Save changes"}
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
