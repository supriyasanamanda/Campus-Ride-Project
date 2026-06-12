const Driver = require('../models/Driver');
const Ride = require('../models/Ride');

// GET /api/drivers/available
const getAvailableDrivers = async (_req, res) => {
  try {
    const drivers = await Driver.find({ isOnline: true, isVerified: true }).populate(
      'user',
      'name phone'
    );
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/drivers/availability
const toggleAvailability = async (req, res) => {
  try {
    const { isOnline } = req.body;
    const driver = await Driver.findOneAndUpdate(
      { user: req.user._id },
      { isOnline },
      { new: true }
    ).populate('user', 'name phone');

    if (!driver) return res.status(404).json({ message: 'Driver profile not found' });

    req.io.emit('driver:availability_changed', { driverId: driver._id, isOnline });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/drivers/dashboard
const getDriverDashboard = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return res.status(404).json({ message: 'Driver profile not found' });

    const rides = await Ride.find({ driver: driver._id })
      .populate('passenger', 'name')
      .populate('rating')
      .sort({ createdAt: -1 });

    const completed = rides.filter((r) => r.status === 'completed');
    const cancelled = rides.filter((r) => r.status === 'cancelled');
    const active = rides.find((r) => ['accepted', 'in_progress'].includes(r.status));

    // Rides per day (last 7 days)
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      last7.push({
        date: dayStr,
        count: completed.filter((r) => r.completedAt?.toISOString().startsWith(dayStr)).length,
      });
    }

    res.json({
      driver,
      stats: {
        totalRides: driver.totalRides,
        completedToday: completed.filter(
          (r) => r.completedAt?.toDateString() === new Date().toDateString()
        ).length,
        cancelledTotal: cancelled.length,
        averageRating: driver.averageRating,
        totalRatings: driver.totalRatings,
      },
      activeRide: active || null,
      recentRides: rides.slice(0, 10),
      chartData: last7,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/drivers/location
const updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await Driver.findOneAndUpdate(
      { user: req.user._id },
      { currentLocation: { type: 'Point', coordinates: [lng, lat] } }
    );
    res.json({ message: 'Location updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAvailableDrivers, toggleAvailability, getDriverDashboard, updateLocation };
