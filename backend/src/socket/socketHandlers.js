const Driver = require('../models/Driver');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const registerSocketHandlers = (io) => {
  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`Socket connected: ${socket.user.name} (${socket.user.role})`);

    // Join personal room for targeted events
    socket.join(`user_${socket.user._id}`);

    // Drivers join the shared drivers room
    if (socket.user.role === 'driver') {
      socket.join('drivers_room');
      // Save socket ID to driver profile
      await Driver.findOneAndUpdate({ user: socket.user._id }, { socketId: socket.id });
    }

    // Driver goes online / offline via socket
    socket.on('driver:set_online', async ({ isOnline }) => {
      const driver = await Driver.findOneAndUpdate(
        { user: socket.user._id },
        { isOnline },
        { new: true }
      );
      if (driver) {
        io.emit('driver:availability_changed', { driverId: driver._id, isOnline });
        socket.emit('driver:status_confirmed', { isOnline });
      }
    });

    // Driver broadcasts live location
    socket.on('driver:location_update', async ({ lat, lng, rideId }) => {
      await Driver.findOneAndUpdate(
        { user: socket.user._id },
        { currentLocation: { type: 'Point', coordinates: [lng, lat] } }
      );
      // Broadcast to the passenger on this ride
      if (rideId) {
        socket.to(`ride_${rideId}`).emit('driver:location', { lat, lng });
      }
    });

    // Passenger joins a ride room for live tracking
    socket.on('ride:join', ({ rideId }) => {
      socket.join(`ride_${rideId}`);
    });

    socket.on('ride:leave', ({ rideId }) => {
      socket.leave(`ride_${rideId}`);
    });

    // Typing / ping (optional real-time feature)
    socket.on('ping', () => socket.emit('pong'));

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.user?.name}`);
      if (socket.user?.role === 'driver') {
        await Driver.findOneAndUpdate({ user: socket.user._id }, { socketId: '' });
      }
    });
  });
};

module.exports = { registerSocketHandlers };
