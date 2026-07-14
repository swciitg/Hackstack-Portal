const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

router.post('/admin/login', authCtrl.adminLogin);
router.get('/google', authCtrl.redirectToGoogle);
router.get('/google/callback', authCtrl.handleGoogleCallback);
router.get('/me', (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `[auth/me] cookie: ${Boolean(req.cookies?.token)} | origin: ${req.get('origin') || 'none'}`
    );
  }
  next();
}, auth, authCtrl.getMe);

router.post('/complete-profile', auth, authCtrl.completeProfile);
router.get('/check-username', authCtrl.checkUsername);
router.get('/colleges', authCtrl.getColleges);

// Clears the HttpOnly session cookie
router.post('/logout', authCtrl.logout);
router.get('/logout', authCtrl.logout);

const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.get('/admin-check', async (req, res) => {
  try {
    const bearerToken = req.headers.authorization?.startsWith("Bearer")
      ? req.headers.authorization.split(" ")[1]
      : null;
    const token = bearerToken || req.cookies?.token;

    if (!token) {
      return res.json({ authorized: false, loginRequired: true });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.json({ authorized: false, loginRequired: true });
    }

    const userId = decoded.id || decoded._id;
    if (!userId) {
      return res.json({ authorized: false, loginRequired: true });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ authorized: false, loginRequired: true });
    }

    // Check if the user's email is whitelisted in the database
    const AdminWhitelist = require('../models/AdminWhitelist');
    const isWhitelisted = await AdminWhitelist.findOne({
      email: user.email.toLowerCase()
    });

    const allowedEmails = (process.env.ALLOWED_ADMIN_GOOGLE_EMAILS || "")
      .toLowerCase()
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const allowedIds = (process.env.ALLOWED_ADMIN_GOOGLE_IDS || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const isEmailAllowed = user.email && allowedEmails.includes(user.email.toLowerCase());
    const isIdAllowed = user.googleId && allowedIds.includes(user.googleId.toString());

    if (isWhitelisted || isEmailAllowed || isIdAllowed) {
      const canDelete = isEmailAllowed || isIdAllowed || (isWhitelisted ? !!isWhitelisted.canDelete : false);
      const adminToken = jwt.sign(
        { isAdmin: true, username: user.email, canDelete },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.json({
        authorized: true,
        token: adminToken,
        user: { username: user.username || user.email, isAdmin: true, canDelete }
      });
    }

    return res.json({
      authorized: false,
      forbidden: true,
      message: "Your Google account is not authorized to access the admin portal."
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

module.exports = router;
