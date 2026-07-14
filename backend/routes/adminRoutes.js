const express = require('express');
// adminAuth: reads ONLY from Authorization: Bearer header (never cookies).
// This guarantees admin sessions cannot bleed into the user frontend.
const adminAuth = require('../middleware/adminAuthMiddleware');

const modulesCtrl = require('../controllers/moduleController');
const quizzesCtrl = require('../controllers/quizController');
const progressCtrl = require('../controllers/progressController');
const usersCtrl = require('../controllers/userController');
const adminProgressCtrl = require('../controllers/adminProgressController');

const router = express.Router();

const User = require('../models/User');
const Module = require('../models/Module');
const Quiz = require('../models/Quiz');
const Progress = require('../models/Progress');

const adminDeleteAuth = (req, res, next) => {
  if (!req.admin || !req.admin.canDelete) {
    return res.status(403).json({ message: 'Forbidden. You do not have permission to perform delete operations.' });
  }
  next();
};

// Admin stats route
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalModules = await Module.countDocuments();

    // Only count quizzes whose parent module still exists (exclude orphans from deleted modules)
    const existingModuleIds = await Module.distinct('_id');
    const activeQuizzes = await Quiz.countDocuments({ moduleId: { $in: existingModuleIds } });

    res.json({
      totalUsers,
      totalModules,
      activeQuizzes
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admin stats.', error: error.message });
  }
});

// Admin modules routes
router.get('/modules', adminAuth, modulesCtrl.listModules);
router.get('/modules/:id', adminAuth, modulesCtrl.getModule);
router.post('/modules', adminAuth, modulesCtrl.createModule);
router.put('/modules/:id', adminAuth, modulesCtrl.updateModule);
router.delete('/modules/:id', adminAuth, adminDeleteAuth, modulesCtrl.deleteModule);

// Admin quizzes routes
router.get('/quizzes', adminAuth, quizzesCtrl.listQuizzes);
router.get('/quizzes/:id', adminAuth, quizzesCtrl.getQuiz);
router.post('/quizzes', adminAuth, quizzesCtrl.createQuiz);
router.patch('/quizzes/:id', adminAuth, quizzesCtrl.updateQuiz);
router.delete('/quizzes/:id', adminAuth, adminDeleteAuth, quizzesCtrl.deleteQuiz);

// Admin progress routes
router.get('/progress', adminAuth, progressCtrl.listProgress);
router.get('/progress/:id', adminAuth, progressCtrl.getProgress);
router.patch('/progress/:id', adminAuth, progressCtrl.updateProgress);

// Admin Progress Editor routes (canDelete only)
router.get('/progress-editor/users', adminAuth, adminDeleteAuth, adminProgressCtrl.listUsersWithProgress);
router.get('/progress-editor/users/:userId', adminAuth, adminDeleteAuth, adminProgressCtrl.getUserProgress);
router.patch('/progress-editor/users/:userId/modules/:moduleId', adminAuth, adminDeleteAuth, adminProgressCtrl.updateUserModuleProgress);
router.get('/progress-editor/modules', adminAuth, adminDeleteAuth, adminProgressCtrl.listModulesWithProgress);

// Admin users routes
router.get('/users-progress', adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .populate('registeredModules', 'title slug chapters')
      .sort({ createdAt: -1 });

    const allProgress = await Progress.find();

    const progressMap = new Map();
    for (const prog of allProgress) {
      progressMap.set(`${prog.userId.toString()}_${prog.moduleId.toString()}`, prog);
    }

    const summary = users.map(user => {
      let dynamicTotalScore = 0;

      // Compute total score across all progress documents of this user, taking only the first score per unique dayId
      for (const prog of allProgress) {
        if (prog.userId.toString() === user._id.toString() && prog.quizScores) {
          const seenDays = new Set();
          for (const item of prog.quizScores) {
            const dayIdStr = item.dayId ? item.dayId.toString() : null;
            if (dayIdStr && !seenDays.has(dayIdStr)) {
              seenDays.add(dayIdStr);
              dynamicTotalScore += (item.score || 0);
            }
          }
        }
      }

      const userModules = (user.registeredModules || []).map(mod => {
        const progKey = `${user._id.toString()}_${mod._id.toString()}`;
        const prog = progressMap.get(progKey);

        const daysCompletedCount = prog ? (prog.completedDays || []).length : 0;
        
        let moduleScore = 0;
        if (prog && prog.quizScores) {
          const seenDays = new Set();
          for (const item of prog.quizScores) {
            const dayIdStr = item.dayId ? item.dayId.toString() : null;
            if (dayIdStr && !seenDays.has(dayIdStr)) {
              seenDays.add(dayIdStr);
              moduleScore += (item.score || 0);
            }
          }
        }

        const totalDaysCount = (mod.chapters || []).reduce((acc, chap) => acc + (chap.days || []).length, 0);

        return {
          moduleId: mod._id,
          title: mod.title,
          slug: mod.slug,
          daysCompleted: daysCompletedCount,
          totalDays: totalDaysCount,
          moduleScore: moduleScore
        };
      });

      return {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        college: user.college,
        year: user.year,
        totalScore: dynamicTotalScore,
        modulesProgress: userModules
      };
    });

    // Sort summary dynamically by totalScore descending (decreasing score)
    summary.sort((a, b) => b.totalScore - a.totalScore);

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users progress.', error: error.message });
  }
});

router.get('/users', adminAuth, usersCtrl.listUsers);
router.get('/users/:id', adminAuth, usersCtrl.getUser);
router.patch('/users/:id', adminAuth, usersCtrl.updateUser);
router.delete('/users/:id', adminAuth, adminDeleteAuth, usersCtrl.deleteUser);

module.exports = router;
