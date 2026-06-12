import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import RatingModal from '../components/RatingModal';

const STATUS_COLORS = {
  requested: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function PassengerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [ratingRide, setRatingRide] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRides = async () => {
    try {
      const { data } = await api.get('/rides/my');
      setRides(data);
      const active = data.find((r) => ['requested', 'accepted', 'in_progress'].includes(r.status));
      setActiveRide(active || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRides(); }, []);

  const { emit } = useSocket({
    'ride:accepted': (ride) => {
      setActiveRide(ride);
      setRides((prev) => prev.map((r) => (r._id === ride._id ? ride : r)));
    },
    'ride:status_update': (ride) => {
      setRides((prev) => prev.map((r) => (r._id === ride._id ? ride : r)));
      if (['requested', 'accepted', 'in_progress'].includes(ride.status)) {
        setActiveRide(ride);
      } else {
        setActiveRide(null);
        if (ride.status === 'completed') setRatingRide(ride);
      }
    },
  });

  // Join ride room for live updates when there's an active ride
  useEffect(() => {
    if (activeRide) emit('ride:join', { rideId: activeRide._id });
  }, [activeRide?._id]);

  const cancelRide = async (rideId) => {
    try {
      await api.patch(`/rides/${rideId}/status`, { status: 'cancelled', reason: 'Cancelled by passenger' });
      fetchRides();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛺</span>
          <span className="font-bold text-gray-900">CampusRide</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Hi, {user?.name}</span>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">Logout</button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Active ride banner */}
        {activeRide ? (
          <div className="bg-indigo-600 text-white rounded-2xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-lg">Active Ride</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium bg-white/20`}>
                {activeRide.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-indigo-100 mb-1">📍 {activeRide.pickup.address}</p>
            <p className="text-sm text-indigo-100 mb-3">🎯 {activeRide.destination.address}</p>
            {activeRide.driver && (
              <p className="text-sm font-medium">
                Driver: {activeRide.driver.user?.name} · {activeRide.driver.vehicleNumber}
              </p>
            )}
            {activeRide.status === 'requested' && (
              <button
                onClick={() => cancelRide(activeRide._id)}
                className="mt-3 text-sm bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg transition"
              >
                Cancel Ride
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/passenger/request')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-2xl py-4 text-base shadow-md transition"
          >
            🛺 Request a Ride
          </button>
        )}

        {/* Ride history */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Ride History</h2>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : rides.length === 0 ? (
            <p className="text-gray-400 text-sm">No rides yet. Request your first ride!</p>
          ) : (
            <div className="space-y-3">
              {rides.map((ride) => (
                <div key={ride._id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {ride.pickup.address} → {ride.destination.address}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(ride.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[ride.status]}`}>
                      {ride.status.replace('_', ' ')}
                    </span>
                  </div>
                  {ride.status === 'completed' && !ride.rating && (
                    <button
                      onClick={() => setRatingRide(ride)}
                      className="mt-2 text-xs text-indigo-600 hover:underline"
                    >
                      ⭐ Rate this ride
                    </button>
                  )}
                  {ride.rating && (
                    <p className="mt-2 text-xs text-gray-500">
                      You rated: {'⭐'.repeat(ride.rating.score)} — {ride.rating.feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {ratingRide && (
        <RatingModal
          ride={ratingRide}
          onClose={() => setRatingRide(null)}
          onSubmit={() => { setRatingRide(null); fetchRides(); }}
        />
      )}
    </div>
  );
}
