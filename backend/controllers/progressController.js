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
      // Removed 'email' to prevent leaking sensitive user data
      .populate('userId', 'username avatarUrl college')
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
      // Removed 'email' to prevent leaking sensitive user data
      .populate('userId', 'username avatarUrl college')
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
    // Fetch the progress record first to verify ownership
    const progress = await Progress.findById(req.params.id);
    if (!progress) return res.status(404).json({ message: 'Progress record not found.' });

    // Enforce ownership: users can only update their own progress
    if (progress.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only update your own progress.' });
    }

    // WHITELIST: Extract only safe fields that the client is allowed to update manually
    const { currentChapterId, currentDayId } = req.body;
    
    const safeUpdateData = {};
    if (currentChapterId !== undefined) safeUpdateData.currentChapterId = currentChapterId;
    if (currentDayId !== undefined) safeUpdateData.currentDayId = currentDayId;

    // Update progress record using the safe whitelist object
    const updatedProgress = await Progress.findByIdAndUpdate(
      req.params.id, 
      { $set: safeUpdateData }, 
      { new: true, runValidators: true }
    );
    
    res.json(updatedProgress);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update progress record.', error: error.message });
  }
};