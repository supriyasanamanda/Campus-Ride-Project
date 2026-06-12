const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema(
  {
    passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
    pickup: {
      address: { type: String, required: true },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    destination: {
      address: { type: String, required: true },
      coordinates: { type: [Number], default: [0, 0] },
    },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'],
      default: 'requested',
    },
    fare: { type: Number, default: 0 },
    distance: { type: Number, default: 0 }, // in km
    requestedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, default: '' },
    rating: { type: mongoose.Schema.Types.ObjectId, ref: 'Rating', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ride', rideSchema);
