# 🛺 CampusRide — Real-Time Campus Ride Management Platform

A full-stack ride management platform built for IIT Roorkee's e-rickshaw network. Connects passengers and drivers in real-time using WebSockets.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Real-time | Socket.IO (WebSockets) |
| Database | MongoDB + Mongoose |
| Auth | JWT (JSON Web Tokens) |
| Charts | Recharts |
| Maps (optional) | React-Leaflet + OpenStreetMap |

## Prerequisites — Install These First

### 1. Node.js (v18 or higher)
- Download from: https://nodejs.org
- Verify: `node --version`

### 2. MongoDB
**Option A — MongoDB Atlas (cloud, recommended for beginners)**
1. Go to https://mongodb.com/atlas and create a free account
2. Create a free cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string (looks like `mongodb+srv://user:pass@cluster.mongodb.net/campus-ride`)
5. Paste it as `MONGODB_URI` in `backend/.env`

**Option B — Local MongoDB**
- Download from: https://www.mongodb.com/try/download/community
- Install and start the service
- Use `MONGODB_URI=mongodb://localhost:27017/campus-ride`

### 3. Git (for cloning)
- Download from: https://git-scm.com

## Setup Instructions

### Step 1 — Clone and open in VS Code
```bash
git clone <your-repo-url>
cd campus-ride
code .
```

### Step 2 — Setup Backend

Open a terminal in VS Code (`Ctrl + `` ` ``):

```bash
cd backend
npm install
```

Edit `backend/.env` and set your MongoDB URI:
```
PORT=5000
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASS@cluster.mongodb.net/campus-ride
JWT_SECRET=change_this_to_a_long_random_string_123456
CLIENT_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev
```

You should see: `MongoDB connected` and `Server running on port 5000`

### Step 3 — Setup Frontend

Open a **second terminal** in VS Code:

```bash
cd frontend
npm install
npm run dev
```

Visit: http://localhost:5173

## Running the App

You need **two terminals** running simultaneously:

| Terminal | Directory | Command |
|----------|-----------|---------|
| Terminal 1 | `backend/` | `npm run dev` |
| Terminal 2 | `frontend/` | `npm run dev` |

## Feature List

### Mandatory Features ✅
- [x] Passenger & Driver registration / login (JWT)
- [x] Driver availability toggle (online/offline)
- [x] Ride request with pickup + destination
- [x] Driver sees incoming ride requests in real-time
- [x] Accept / ignore ride (atomic — only one driver can accept)
- [x] Full ride lifecycle: Requested → Accepted → In Progress → Completed / Cancelled
- [x] Real-time updates via Socket.IO
- [x] Driver dashboard with stats, charts, ride history
- [x] Passenger ride history
- [x] Ratings & feedback (1–5 stars + text)
- [x] Average rating calculation

### Optional Features 🗺️
- [x] Campus location suggestions (datalist)
- [x] Weekly rides bar chart (Recharts)
- [ ] Live map (Leaflet — structure ready, add coordinates)
- [ ] Scheduled rides
- [ ] UPI/QR payment simulation
- [ ] Demand analytics / forecasting

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Get logged-in user |
| POST | /api/rides | Request a ride |
| GET  | /api/rides/available | Get pending rides (driver) |
| GET  | /api/rides/my | Passenger's ride history |
| GET  | /api/rides/driver | Driver's ride history |
| PATCH | /api/rides/:id/accept | Accept a ride |
| PATCH | /api/rides/:id/status | Update ride status |
| GET  | /api/drivers/available | Get online drivers |
| PATCH | /api/drivers/availability | Toggle online/offline |
| GET  | /api/drivers/dashboard | Driver stats + charts |
| POST | /api/ratings | Rate a completed ride |

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `ride:new_request` | Server → Drivers | New ride requested |
| `ride:accepted` | Server → Passenger | Driver accepted ride |
| `ride:taken` | Server → Drivers | Ride no longer available |
| `ride:status_update` | Server → All | Status changed |
| `driver:availability_changed` | Server → All | Driver went online/offline |
| `driver:set_online` | Client → Server | Driver toggles status |
| `driver:location_update` | Client → Server | Driver location ping |

## Project Structure

```
campus-ride/
├── backend/
│   ├── server.js              # Entry point
│   ├── package.json
│   ├── .env
│   └── src/
│       ├── config/db.js
│       ├── models/            User.js, Driver.js, Ride.js, Rating.js
│       ├── routes/            auth.js, rides.js, drivers.js, ratings.js
│       ├── controllers/       authController, rideController, driverController, ratingController
│       ├── middleware/        auth.js
│       └── socket/            socketHandlers.js
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── services/api.js
        ├── context/AuthContext.jsx
        ├── hooks/useSocket.js
        └── pages/             Login, Register, PassengerDashboard, DriverDashboard, RideRequest
```
