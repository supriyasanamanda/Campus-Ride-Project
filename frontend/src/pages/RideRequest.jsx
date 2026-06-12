import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function RideRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    pickup: { address: '', coordinates: [0, 0] },
    destination: { address: '', coordinates: [0, 0] },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.pickup.address || !form.destination.address) {
      setError('Please enter both pickup and destination');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/rides', form);
      navigate('/passenger');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request ride');
    } finally {
      setLoading(false);
    }
  };

  const setAddress = (field, value) =>
    setForm({ ...form, [field]: { ...form[field], address: value } });

  // Common campus locations for quick fill
  const campusSpots = [
    'Main Gate', 'Library', 'Convocation Hall', 'Thomason Building',
    'Sports Complex', 'New SAC', 'Roorkee Station', 'Solani Aqueduct',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <button onClick={() => navigate('/passenger')} className="text-indigo-600 text-sm mb-4 hover:underline">
          ← Back
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Request a Ride</h2>

        {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📍 Pickup Location</label>
            <input
              value={form.pickup.address}
              onChange={(e) => setAddress('pickup', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Main Gate"
              list="campus-spots-pickup"
            />
            <datalist id="campus-spots-pickup">
              {campusSpots.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🎯 Destination</label>
            <input
              value={form.destination.address}
              onChange={(e) => setAddress('destination', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Library"
              list="campus-spots-dest"
            />
            <datalist id="campus-spots-dest">
              {campusSpots.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>

          {/* Quick route suggestions */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Quick routes:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Main Gate', 'Library'],
                ['New SAC', 'Thomason Building'],
                ['Library', 'Sports Complex'],
                ['Main Gate', 'Convocation Hall'],
              ].map(([from, to]) => (
                <button
                  key={from + to}
                  type="button"
                  onClick={() => setForm({
                    pickup: { address: from, coordinates: [0, 0] },
                    destination: { address: to, coordinates: [0, 0] },
                  })}
                  className="text-left text-xs border border-gray-200 rounded-lg px-2 py-1.5 hover:border-indigo-400 hover:bg-indigo-50 transition"
                >
                  {from} → {to}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg py-3 text-sm transition disabled:opacity-60"
          >
            {loading ? 'Requesting...' : '🛺 Request Ride'}
          </button>
        </form>
      </div>
    </div>
  );
}
