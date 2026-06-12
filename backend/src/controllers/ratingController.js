const Rating = require('../models/Rating');
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');

// POST /api/ratings
const createRating = async (req, res) => {
  try {
    const { rideId, score, feedback } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'completed') return res.status(400).json({ message: 'Can only rate completed rides' });
    if (ride.rating) return res.status(400).json({ message: 'Ride already rated' });
    if (String(ride.passenger) !== String(req.user._id))
      return res.status(403).json({ message: 'Only the passenger can rate this ride' });

    const rating = await Rating.create({
      ride: rideId,
      passenger: req.user._id,
      driver: ride.driver,
      score,
      feedback,
    });

    // Link rating to ride
    ride.rating = rating._id;
    await ride.save();

    // Update driver's average rating
    const driver = await Driver.findById(ride.driver);
    const newTotal = driver.totalRatings + 1;
    const newAvg = ((driver.averageRating * driver.totalRatings) + score) / newTotal;
    driver.averageRating = Math.round(newAvg * 10) / 10;
    driver.totalRatings = newTotal;
    await driver.save();

    res.status(201).json(rating);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/ratings/driver  - Driver's received ratings
const getDriverRatings = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const ratings = await Rating.find({ driver: driver._id })
      .populate('passenger', 'name')
      .sort({ createdAt: -1 });
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createRating, getDriverRatings };
