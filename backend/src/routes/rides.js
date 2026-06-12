const express = require('express');
const router = express.Router();
const {
  requestRide,
  getAvailableRides,
  acceptRide,
  updateRideStatus,
  getMyRides,
  getDriverRides,
} = require('../controllers/rideController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/', protect, requireRole('passenger'), requestRide);
router.get('/available', protect, requireRole('driver'), getAvailableRides);
router.get('/my', protect, requireRole('passenger'), getMyRides);
router.get('/driver', protect, requireRole('driver'), getDriverRides);
router.patch('/:id/accept', protect, requireRole('driver'), acceptRide);
router.patch('/:id/status', protect, updateRideStatus);

module.exports = router;
