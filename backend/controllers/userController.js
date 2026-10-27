const mongoose = require("mongoose");
const User = require("../models/User");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

exports.listUsers = async (req, res) => {
  try {
    // Select only safe fields, explicitly excluding private data
    const users = await User.find()
      .select("-email -mobileNumber -rollNumber -googleId")
      .populate("registeredModules", "title slug")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch users.", error: error.message });
  }
};

exports.getUser = async (req, res) => {
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ message: "Invalid user id." });

  try {
    // Exclude private data here as well
    const user = await User.findById(req.params.id)
      .select("-email -mobileNumber -rollNumber -googleId")
      .populate("registeredModules", "title slug");
      
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch user.", error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Failed to create user.", error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ message: "Invalid user id." });

  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Failed to update user.", error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ message: "Invalid user id." });

  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ message: "User deleted." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete user.", error: error.message });
  }
};