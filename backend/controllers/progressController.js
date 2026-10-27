const mongoose = require('mongoose');
const Progress = require('../models/Progress');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

exports.getMyProgress = async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.user._id })
      .populate('moduleId', 'title slug difficulty')
      .sort({ updatedAt: -1 });

    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your progress.', error: error.message });
  }
};

exports.listProgress = async (req, res) => {
  try {
    const progress = await Progress.find()
      .populate('userId', 'username email')
      .populate('moduleId', 'title slug')
      .sort({ createdAt: -1 });

    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch progress records.', error: error.message });
  }
};

exports.getProgress = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid progress id.' });
  }

  try {
    const progress = await Progress.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('moduleId', 'title slug');

    if (!progress) return res.status(404).json({ message: 'Progress record not found.' });
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch progress record.', error: error.message });
  }
};




exports.updateProgress = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid progress id.' });
  }

  try {
    const progress = await Progress.findById(req.params.id);

    if (!progress) {
      return res.status(404).json({ message: 'Progress record not found.' });
    }

    if (progress.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Access denied. You can only update your own progress.',
      });
    }

    const { completedDays } = req.body;

    if (!Array.isArray(completedDays)) {
      return res.status(400).json({
        message: 'completedDays must be an array.',
      });
    }

    const Module = require('../models/Module');
    const module = await Module.findById(progress.moduleId);

    if (!module) {
      return res.status(404).json({ message: 'Module not found.' });
    }

    const validDayIds = (module.chapters || []).flatMap((chapter) =>
      (chapter.days || []).map((day) => day._id.toString())
    );

    const uniqueCompletedDays = [...new Set(completedDays.map(String))];

    const hasInvalidDay = uniqueCompletedDays.some(
      (dayId) =>
        !isValidObjectId(dayId) || !validDayIds.includes(dayId)
    );

    if (hasInvalidDay) {
      return res.status(400).json({
        message: 'One or more completed days do not belong to this module.',
      });
    }


    const isComplete =
      validDayIds.length > 0 &&
      validDayIds.every((dayId) => uniqueCompletedDays.includes(dayId));

    progress.completedDays = uniqueCompletedDays;
    progress.moduleCompleted = isComplete;

    if (isComplete && !progress.completedAt) {
      progress.completedAt = new Date();
    } else if (!isComplete) {
      progress.completedAt = null;
    }

    await progress.save();

    return res.json(progress);
  } catch (error) {
    return res.status(400).json({
      message: 'Failed to update progress record.',
      error: error.message,
    });
  }
};

exports.getCertificateEligibility = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid progress id.' });
  }

  try {
    const progress = await Progress.findById(req.params.id)
      .populate('moduleId', 'title slug week chapters')
      .populate('userId', 'name username');

    if (!progress) {
      return res.status(404).json({ message: 'Progress record not found.' });
    }

    // A learner can only request their own certificate.
    if (
      !progress.userId ||
      !progress.userId._id ||
      progress.userId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const module = progress.moduleId;

    if (!module) {
      return res.status(404).json({ message: 'Module not found.' });
    }

    const validDayIds = (module.chapters || []).flatMap((chapter) =>
      (chapter.days || []).map((day) => day._id.toString())
    );

    const completedDayIds = new Set(
      (progress.completedDays || []).map((id) => id.toString())
    );

    const isComplete =
      validDayIds.length > 0 &&
      validDayIds.every((dayId) => completedDayIds.has(dayId));

    if (
      !isComplete ||
      progress.moduleCompleted !== true ||
      !progress.completedAt ||
      Number.isNaN(new Date(progress.completedAt).getTime())
    ) {
      return res.status(403).json({
        message: 'Complete every day in this module to earn your certificate.',
      });
    }

    return res.json({
      eligible: true,
      certificate: {
        recipientName:
          progress.userId.name?.trim() ||
          progress.userId.username?.trim() ||
          'HackStack Learner',
        moduleTitle: module.title,
        moduleSlug: module.slug,
        week: module.week,
        completedAt: progress.completedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to verify certificate eligibility.',
      error: error.message,
    });
  }
};
