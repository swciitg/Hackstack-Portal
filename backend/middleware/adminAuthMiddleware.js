const jwt = require('jsonwebtoken');

/**
 * Admin-specific auth middleware.
 *
 * Admin authentication is entirely credential-based (username + password against
 * environment variables). There is NO MongoDB User record for admins.
 *
 * This middleware:
 *  - Only reads from the "Authorization: Bearer <token>" header (never cookies)
 *  - Verifies the JWT signature
 *  - Confirms the "isAdmin: true" claim in the payload
 *  - Does NOT perform any database lookup
 *
 * This guarantees admin sessions are completely isolated from the user frontend,
 * which relies on HttpOnly cookies tied to Google OAuth user records.
 */
const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Admin authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.isAdmin) {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    const username = decoded.username;

    const allowedEmails = (process.env.ALLOWED_ADMIN_GOOGLE_EMAILS || '')
      .toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const isRootAdmin = (username && username === process.env.ADMIN_USERNAME) ||
                        (username && allowedEmails.includes(username.toLowerCase()));

    // Bypass database lookup if it is the root admin
    if (isRootAdmin) {
      req.admin = { username, isAdmin: true, canDelete: true };
      return next();
    }

    // Query the database whitelist to ensure the user is still whitelisted
    const AdminWhitelist = require('../models/AdminWhitelist');
    const whitelistRecord = await AdminWhitelist.findOne({
      email: username ? username.toLowerCase() : ''
    });

    if (!whitelistRecord) {
      return res.status(401).json({ message: 'Not authorized. Admin access has been revoked.' });
    }

    // Attach latest info using the database record
    req.admin = { username, isAdmin: true, canDelete: !!whitelistRecord.canDelete };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed.' });
  }
};

module.exports = adminAuth;
