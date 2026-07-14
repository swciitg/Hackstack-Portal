const mongoose = require('mongoose');
const Notification = require('../models/Notification');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// Admin: list all notifications (active or inactive)
exports.adminListNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admin notifications.', error: error.message });
  }
};

// Admin: create a notification
exports.adminCreateNotification = async (req, res) => {
  try {
    const { content, active } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Notification content is required.' });
    }
    const notification = await Notification.create({ content, active: active !== false });
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create notification.', error: error.message });
  }
};

// Admin: update/toggle a notification (e.g. active status, content)
exports.adminToggleNotification = async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid notification id.' });
  }

  try {
    const { content, active } = req.body;
    const updatePayload = {};
    if (content !== undefined) updatePayload.content = content;
    if (active !== undefined) updatePayload.active = active;

    const notification = await Notification.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true, runValidators: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    res.json(notification);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update notification.', error: error.message });
  }
};

// Admin: delete a notification
exports.adminDeleteNotification = async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid notification id.' });
  }

  try {
    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    res.json({ message: 'Notification deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete notification.', error: error.message });
  }
};

// User: fetch active notifications
exports.listActiveNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ active: true }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch active notifications.', error: error.message });
  }
};
