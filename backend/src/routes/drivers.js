const express = require('express');
const router = express.Router();
const {
  getAvailableDrivers,
  toggleAvailability,
  getDriverDashboard,
  updateLocation,
} = require('../controllers/driverController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/available', protect, getAvailableDrivers);
router.get('/dashboard', protect, requireRole('driver'), getDriverDashboard);
router.patch('/availability', protect, requireRole('driver'), toggleAvailability);
router.patch('/location', protect, requireRole('driver'), updateLocation);

module.exports = router;
