const mongoose = require('mongoose');
const User = require('../models/User');
const Module = require('../models/Module');
const Progress = require('../models/Progress');
const Quiz = require('../models/Quiz');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

/**
 * GET /admin/progress-editor/users
 * Returns all users with a summary of progress per module.
 * Requires adminAuth + adminDeleteAuth.
 */
exports.listUsersWithProgress = async (req, res) => {
  try {
    const users = await User.find()
      .populate('registeredModules', 'title slug chapters')
      .sort({ createdAt: -1 });

    const allProgress = await Progress.find();
    const progressMap = new Map();
    for (const prog of allProgress) {
      progressMap.set(`${prog.userId}_${prog.moduleId}`, prog);
    }

    const result = users.map((user) => {
      const modulesProgress = (user.registeredModules || []).map((mod) => {
        const prog = progressMap.get(`${user._id}_${mod._id}`);
        const totalDays = (mod.chapters || []).reduce(
          (acc, ch) => acc + (ch.days || []).length,
          0
        );
        const daysCompleted = prog ? (prog.completedDays || []).length : 0;
        let moduleScore = 0;
        if (prog && prog.quizScores) {
          const seenDays = new Set();
          for (const qs of prog.quizScores) {
            const dayIdStr = qs.dayId ? qs.dayId.toString() : null;
            if (dayIdStr && !seenDays.has(dayIdStr)) {
              seenDays.add(dayIdStr);
              moduleScore += qs.score || 0;
            } else if (!dayIdStr) {
              moduleScore += qs.score || 0;
            }
          }
        }

        return {
          moduleId: mod._id,
          title: mod.title,
          slug: mod.slug,
          daysCompleted,
          totalDays,
          moduleScore,
          moduleCompleted: prog ? prog.moduleCompleted : false,
        };
      });

      const totalScore = modulesProgress.reduce((s, m) => s + m.moduleScore, 0);

      return {
        _id: user._id,
        googleId: user.googleId,
        name: user.name,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        college: user.college,
        year: user.year,
        rollNumber: user.rollNumber,
        programme: user.programme,
        countryCode: user.countryCode,
        mobileNumber: user.mobileNumber,
        profileCompleted: user.profileCompleted,
        totalScore,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        registeredModules: user.registeredModules.map((m) => ({
          _id: m._id,
          title: m.title,
          slug: m.slug,
        })),
        modulesProgress,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users with progress.', error: error.message });
  }
};

/**
 * GET /admin/progress-editor/users/:userId
 * Returns full progress data for a single user across all modules they are registered in.
 * Includes module structure (chapters → days with titles and IDs) so the UI can render day-by-day editing.
 */
exports.getUserProgress = async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid user id.' });
  }

  try {
    const user = await User.findById(userId).populate(
      'registeredModules',
      'title slug chapters difficulty week'
    );
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const progressRecords = await Progress.find({ userId });
    const progressMap = new Map();
    for (const prog of progressRecords) {
      progressMap.set(prog.moduleId.toString(), prog);
    }

    // Fetch all quizzes for modules this user is in, to show quiz metadata per day
    const moduleIds = (user.registeredModules || []).map((m) => m._id);
    const quizzes = await Quiz.find({ moduleId: { $in: moduleIds } });
    const quizByDayId = new Map();
    for (const q of quizzes) {
      if (q.dayId) quizByDayId.set(q.dayId.toString(), q);
    }

    const modulesProgress = (user.registeredModules || []).map((mod) => {
      const prog = progressMap.get(mod._id.toString());

      const completedDayIds = new Set(
        (prog?.completedDays || []).map((id) => id.toString())
      );
      const attemptedQuizIds = new Set(
        (prog?.attemptedQuizIds || []).map((id) => id.toString())
      );

      // Build a map of dayId → quizScore entry for this user
      const quizScoreByDayId = new Map();
      for (const qs of prog?.quizScores || []) {
        if (qs.dayId) quizScoreByDayId.set(qs.dayId.toString(), qs);
      }

      // Build structured chapters with per-day metadata
      let globalDayIndex = 0;
      const chapters = (mod.chapters || []).map((chapter) => ({
        _id: chapter._id,
        title: chapter.title,
        days: (chapter.days || []).map((day) => {
          const dayIdStr = day._id.toString();
          const quiz = quizByDayId.get(dayIdStr);
          const quizEntry = quizScoreByDayId.get(dayIdStr);
          const entry = {
            _id: day._id,
            title: day.title,
            dayIndex: globalDayIndex,
            isCompleted: completedDayIds.has(dayIdStr),
            hasQuiz: !!quiz,
            quizId: quiz ? quiz._id : null,
            quizAttempted: quiz ? attemptedQuizIds.has(quiz._id.toString()) : false,
            quizScore: quizEntry ? quizEntry.score : null,
            userAnswers: quizEntry ? quizEntry.userAnswers : [],
            quizMaxScore: quiz
              ? (quiz.questions || []).reduce((s, q) => s + (q.points || 0), 0)
              : null,
            quizQuestions: quiz ? quiz.questions : [],
          };
          globalDayIndex += 1;
          return entry;
        }),
      }));

      return {
        moduleId: mod._id,
        title: mod.title,
        slug: mod.slug,
        week: mod.week,
        difficulty: mod.difficulty,
        progressId: prog ? prog._id : null,
        moduleCompleted: prog ? prog.moduleCompleted : false,
        chapters,
      };
    });

    res.json({
      _id: user._id,
      googleId: user.googleId,
      name: user.name,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      college: user.college,
      year: user.year,
      rollNumber: user.rollNumber,
      programme: user.programme,
      countryCode: user.countryCode,
      mobileNumber: user.mobileNumber,
      profileCompleted: user.profileCompleted,
      totalScore: user.totalScore,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      modulesProgress,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user progress.', error: error.message });
  }
};

/**
 * PATCH /admin/progress-editor/users/:userId/modules/:moduleId
 * Full replacement of a user's progress for one module.
 * Body: { completedDays, quizScores, attemptedQuizIds, moduleCompleted }
 * Also recalculates User.totalScore across all modules.
 */
exports.updateUserModuleProgress = async (req, res) => {
  const { userId, moduleId } = req.params;

  if (!isValidObjectId(userId) || !isValidObjectId(moduleId)) {
    return res.status(400).json({ message: 'Invalid userId or moduleId.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const mod = await Module.findById(moduleId);
    if (!mod) return res.status(404).json({ message: 'Module not found.' });

    const isEnrolled = (user.registeredModules || []).some(
      (mId) => mId.toString() === moduleId.toString()
    );
    if (!isEnrolled) {
      return res.status(400).json({ message: 'User is not registered for this module.' });
    }

    const { completedDays, quizScores, attemptedQuizIds, moduleCompleted } = req.body;

    // Upsert the progress record
    const updatePayload = {};
    if (Array.isArray(completedDays)) updatePayload.completedDays = completedDays;
    if (Array.isArray(quizScores)) updatePayload.quizScores = quizScores;
    if (Array.isArray(attemptedQuizIds)) updatePayload.attemptedQuizIds = attemptedQuizIds;
    if (typeof moduleCompleted === 'boolean') updatePayload.moduleCompleted = moduleCompleted;

    const updatedProgress = await Progress.findOneAndUpdate(
      { userId, moduleId },
      { $set: updatePayload },
      { new: true, upsert: true, runValidators: true }
    );

    // Recalculate totalScore across ALL progress records for this user
    const allProgress = await Progress.find({ userId });
    let newTotalScore = 0;
    for (const prog of allProgress) {
      const seenDays = new Set();
      for (const qs of prog.quizScores || []) {
        const dayIdStr = qs.dayId ? qs.dayId.toString() : null;
        if (dayIdStr && !seenDays.has(dayIdStr)) {
          seenDays.add(dayIdStr);
          newTotalScore += qs.score || 0;
        } else if (!dayIdStr) {
          newTotalScore += qs.score || 0;
        }
      }
    }

    await User.findByIdAndUpdate(userId, { totalScore: newTotalScore });

    try {
      const syncLeaderboards = require('../utils/leaderboardSync');
      await syncLeaderboards();
    } catch (syncErr) {
      console.error('Failed to sync leaderboards on admin progress update:', syncErr);
    }

    res.json({
      message: 'Progress updated successfully.',
      progress: updatedProgress,
      newTotalScore,
    });
  } catch (error) {
    res.status(400).json({ message: 'Failed to update progress.', error: error.message });
  }
};

/**
 * GET /admin/progress-editor/modules
 * Returns all modules with per-user progress summary for a "By Module" view.
 */
exports.listModulesWithProgress = async (req, res) => {
  try {
    const modules = await Module.find().sort({ week: 1, createdAt: 1 });
    const allProgress = await Progress.find().populate('userId', 'username email avatarUrl');

    const result = modules.map((mod) => {
      const modProgRecords = allProgress.filter(
        (p) => p.moduleId.toString() === mod._id.toString()
      );
      const totalDays = (mod.chapters || []).reduce(
        (acc, ch) => acc + (ch.days || []).length,
        0
      );

      const usersProgress = modProgRecords
        .filter((p) => p.userId) // guard against orphaned records
        .map((prog) => {
          let moduleScore = 0;
          if (prog.quizScores) {
            const seenDays = new Set();
            for (const qs of prog.quizScores) {
              const dayIdStr = qs.dayId ? qs.dayId.toString() : null;
              if (dayIdStr && !seenDays.has(dayIdStr)) {
                seenDays.add(dayIdStr);
                moduleScore += qs.score || 0;
              } else if (!dayIdStr) {
                moduleScore += qs.score || 0;
              }
            }
          }
          return {
            userId: prog.userId._id,
            username: prog.userId.username,
            email: prog.userId.email,
            avatarUrl: prog.userId.avatarUrl,
            progressId: prog._id,
            daysCompleted: (prog.completedDays || []).length,
            moduleScore,
            moduleCompleted: prog.moduleCompleted,
          };
        });

      return {
        moduleId: mod._id,
        title: mod.title,
        slug: mod.slug,
        week: mod.week,
        difficulty: mod.difficulty,
        totalDays,
        enrolledCount: usersProgress.length,
        usersProgress,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch modules with progress.', error: error.message });
  }
};
