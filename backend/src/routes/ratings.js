const express = require('express');
const router = express.Router();
const { createRating, getDriverRatings } = require('../controllers/ratingController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/', protect, requireRole('passenger'), createRating);
router.get('/driver', protect, requireRole('driver'), getDriverRatings);

module.exports = router;
