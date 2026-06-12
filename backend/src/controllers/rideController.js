const Ride = require('../models/Ride');
const Driver = require('../models/Driver');

// POST /api/rides  - Passenger requests a ride
const requestRide = async (req, res) => {
  try {
    const { pickup, destination } = req.body;

    // Check if passenger already has an active ride
    const activeRide = await Ride.findOne({
      passenger: req.user._id,
      status: { $in: ['requested', 'accepted', 'in_progress'] },
    });
    if (activeRide) return res.status(400).json({ message: 'You already have an active ride' });

    const ride = await Ride.create({
      passenger: req.user._id,
      pickup,
      destination,
    });

    await ride.populate('passenger', 'name phone');

    // Notify all online drivers via Socket.IO
    req.io.to('drivers_room').emit('ride:new_request', ride);

    res.status(201).json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/rides/available  - Drivers fetch pending ride requests
const getAvailableRides = async (req, res) => {
  try {
    const rides = await Ride.find({ status: 'requested' })
      .populate('passenger', 'name phone')
      .sort({ createdAt: -1 });
    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/rides/:id/accept  - Driver accepts a ride
const acceptRide = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return res.status(404).json({ message: 'Driver profile not found' });

    // Atomic update: only accept if still 'requested'
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, status: 'requested' },
      { status: 'accepted', driver: driver._id, acceptedAt: new Date() },
      { new: true }
    )
      .populate('passenger', 'name phone')
      .populate({ path: 'driver', populate: { path: 'user', select: 'name phone' } });

    if (!ride) return res.status(409).json({ message: 'Ride no longer available' });

    // Notify the passenger
    req.io.to(`user_${ride.passenger._id}`).emit('ride:accepted', ride);
    // Remove from all drivers' pending list
    req.io.to('drivers_room').emit('ride:taken', { rideId: ride._id });

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/rides/:id/status  - Update ride status
const updateRideStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['in_progress', 'completed', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const ride = await Ride.findById(req.params.id)
      .populate('passenger', 'name phone')
      .populate({ path: 'driver', populate: { path: 'user', select: 'name phone' } });

    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    ride.status = status;
    if (status === 'in_progress') ride.startedAt = new Date();
    if (status === 'completed') {
      ride.completedAt = new Date();
      // Update driver stats
      await Driver.findByIdAndUpdate(ride.driver._id, { $inc: { totalRides: 1 } });
    }
    if (status === 'cancelled') {
      ride.cancelledAt = new Date();
      ride.cancelReason = req.body.reason || '';
    }

    await ride.save();

    // Broadcast status update
    req.io.to(`user_${ride.passenger._id}`).emit('ride:status_update', ride);
    req.io.to('drivers_room').emit('ride:status_update', ride);

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/rides/my  - Passenger's ride history
const getMyRides = async (req, res) => {
  try {
    const rides = await Ride.find({ passenger: req.user._id })
      .populate({ path: 'driver', populate: { path: 'user', select: 'name phone' } })
      .populate('rating')
      .sort({ createdAt: -1 });
    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/rides/driver  - Driver's ride history + active ride
const getDriverRides = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return res.status(404).json({ message: 'Driver profile not found' });

    const rides = await Ride.find({ driver: driver._id })
      .populate('passenger', 'name phone')
      .populate('rating')
      .sort({ createdAt: -1 });
    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { requestRide, getAvailableRides, acceptRide, updateRideStatus, getMyRides, getDriverRides };
