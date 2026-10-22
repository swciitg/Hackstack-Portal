const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/authMiddleware');
const progressCtrl = require('../controllers/progressController');

const router = express.Router();

// GET /progress/me -> Current user's progress records.
router.get('/me', auth, progressCtrl.getMyProgress);

// GET /progress -> List all progress records (consider adding auth).
router.get('/', progressCtrl.listProgress);

router.get('/:id/certificate', auth, progressCtrl.getCertificateEligibility);

// GET /progress/:id -> Get one progress record by id (consider adding auth).
router.get('/:id', progressCtrl.getProgress);

// PATCH /progress/:id -> Update a progress record (auth required).
router.patch('/:id', auth, progressCtrl.updateProgress);

module.exports = router;
