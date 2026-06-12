import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_COLORS = {
  requested: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRides, setIncomingRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/drivers/dashboard');
      setDashboard(data);
      setIsOnline(data.driver?.isOnline || false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const { emit } = useSocket({
    'ride:new_request': (ride) => {
      setIncomingRides((prev) => [ride, ...prev]);
    },
    'ride:taken': ({ rideId }) => {
      setIncomingRides((prev) => prev.filter((r) => r._id !== rideId));
    },
    'ride:status_update': () => { fetchDashboard(); },
  });

  const toggleOnline = async () => {
    setToggling(true);
    try {
      const newStatus = !isOnline;
      await api.patch('/drivers/availability', { isOnline: newStatus });
      setIsOnline(newStatus);
      emit('driver:set_online', { isOnline: newStatus });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setToggling(false);
    }
  };

  const acceptRide = async (rideId) => {
    try {
      const { data } = await api.patch(`/rides/${rideId}/accept`);
      setIncomingRides((prev) => prev.filter((r) => r._id !== rideId));
      setDashboard((prev) => ({ ...prev, activeRide: data }));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not accept ride');
      setIncomingRides((prev) => prev.filter((r) => r._id !== rideId));
    }
  };

  const updateRideStatus = async (rideId, status) => {
    try {
      await api.patch(`/rides/${rideId}/status`, { status });
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400">Loading dashboard...</p>
    </div>
  );

  const { stats, activeRide, recentRides, chartData } = dashboard || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛺</span>
          <span className="font-bold text-gray-900">Driver Panel</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">Logout</button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Online toggle */}
        <div className="bg-white rounded-2xl border p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Availability</p>
            <p className="text-sm text-gray-500">{isOnline ? 'You are online — accepting rides' : 'You are offline'}</p>
          </div>
          <button
            onClick={toggleOnline}
            disabled={toggling}
            className={`px-6 py-2.5 rounded-full font-medium text-sm transition ${
              isOnline
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {toggling ? '...' : isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Rides', value: stats?.totalRides || 0, icon: '🛺' },
            { label: "Today's Rides", value: stats?.completedToday || 0, icon: '📅' },
            { label: 'Avg Rating', value: stats?.averageRating ? `${stats.averageRating} ⭐` : 'N/A', icon: '⭐' },
            { label: 'Total Ratings', value: stats?.totalRatings || 0, icon: '💬' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white rounded-xl border p-4 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Active ride */}
        {activeRide && (
          <div className="bg-indigo-600 text-white rounded-2xl p-5">
            <p className="font-bold mb-2">Active Ride</p>
            <p className="text-sm text-indigo-100">📍 {activeRide.pickup?.address}</p>
            <p className="text-sm text-indigo-100 mb-2">🎯 {activeRide.destination?.address}</p>
            <p className="text-sm">Passenger: {activeRide.passenger?.name}</p>
            <div className="flex gap-2 mt-3">
              {activeRide.status === 'accepted' && (
                <button
                  onClick={() => updateRideStatus(activeRide._id, 'in_progress')}
                  className="bg-white/20 hover:bg-white/30 text-sm px-4 py-1.5 rounded-lg transition"
                >
                  Start Ride
                </button>
              )}
              {activeRide.status === 'in_progress' && (
                <button
                  onClick={() => updateRideStatus(activeRide._id, 'completed')}
                  className="bg-green-400 hover:bg-green-500 text-white text-sm px-4 py-1.5 rounded-lg transition"
                >
                  Complete Ride ✓
                </button>
              )}
            </div>
          </div>
        )}

        {/* Incoming ride requests */}
        {incomingRides.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Incoming Requests <span className="text-indigo-600">({incomingRides.length})</span>
            </h3>
            <div className="space-y-3">
              {incomingRides.map((ride) => (
                <div key={ride._id} className="bg-white rounded-xl border-2 border-indigo-200 p-4">
                  <p className="font-medium text-gray-900 text-sm mb-1">
                    {ride.pickup?.address} → {ride.destination?.address}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">Passenger: {ride.passenger?.name}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRide(ride._id)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => setIncomingRides((prev) => prev.filter((r) => r._id !== ride._id))}
                      className="flex-1 border border-gray-300 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly rides chart */}
        {chartData && chartData.length > 0 && (
          <div className="bg-white rounded-2xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Rides — Last 7 Days</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(d) => `Date: ${d}`} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Rides" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent rides table */}
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Rides</h3>
          {!recentRides || recentRides.length === 0 ? (
            <p className="text-gray-400 text-sm">No rides yet.</p>
          ) : (
            <div className="space-y-3">
              {recentRides.map((ride) => (
                <div key={ride._id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {ride.pickup?.address} → {ride.destination?.address}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(ride.createdAt).toLocaleDateString('en-IN')} · {ride.passenger?.name}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[ride.status]}`}>
                    {ride.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
