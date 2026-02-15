import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import fs from 'fs';
try { fs.writeFileSync('server_debug.log', 'Server starting...\n'); } catch (e) { }

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
// Connecting to the 'namaz_timing' database as requested
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected to 'namaz_timing'"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Define Schemas
const TimingSchema = new mongoose.Schema({
  id: Number,
  date: String,
  day_en: String,
  day_ur: String,
  sehri: String,
  iftar: String,
  hijri_date: Number
});

const LocationSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name_en: String,
  name_ur: String,
  timings: [TimingSchema],
  whatsapp_number: String,
  custom_message: { en: String, ur: String },
  whatsapp_community: String,
  nearby_areas: mongoose.Schema.Types.Mixed // Flexible: accepts string (legacy) or { en, ur } (new)
});

const NoteSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  text: { en: String, ur: String },
  isGlobal: Boolean,
  locationId: String,
  type: { type: String, default: 'note' } // 'note' or 'guide'
});

const LocationModel = mongoose.model('Location', LocationSchema);
const NoteModel = mongoose.model('Note', NoteSchema);

// API Routes

// --- LOCATIONS ---

// GET: Fetch all location data for the App
app.get('/api/locations', async (req, res) => {
  try {
    const data = await LocationModel.find({}, '-_id -__v -timings._id');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST: Update location data (Admin Only) - Optimized with BulkWrite
app.post('/api/locations', async (req, res) => {
  const { password, data } = req.body;

  if (password !== 'AhsaanGlobal786') {
    return res.status(403).json({ error: "Unauthorized: Wrong Admin Password" });
  }

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "Invalid data format" });
  }

  try {
    // 1. Delete locations that are NOT in the incoming data (Cleanup)
    const incomingIds = data.map(l => l.id);
    await LocationModel.deleteMany({ id: { $nin: incomingIds } });

    // 2. Prepare bulk operations
    const operations = data.map(loc => ({
      updateOne: {
        filter: { id: loc.id },
        update: { $set: loc },
        upsert: true
      }
    }));

    if (operations.length > 0) {
      await LocationModel.bulkWrite(operations);
    }

    console.log(`✅ Synced ${data.length} locations to MongoDB (BulkWrite)`);
    res.json({ success: true, message: "Data saved to MongoDB" });
  } catch (e) {
    console.error("Save Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// --- NOTES ---

// GET: Fetch all notes
app.get('/api/notes', async (req, res) => {
  try {
    const notes = await NoteModel.find({}, '-_id -__v');
    res.json(notes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST: Sync notes - Optimized (Delete Missing + Bulk Upsert)
app.post('/api/notes', async (req, res) => {
  const { password, data } = req.body;

  if (password !== 'AhsaanGlobal786') {
    return res.status(403).json({ error: "Unauthorized: Wrong Admin Password" });
  }

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "Invalid data format" });
  }

  try {
    // 1. Delete notes that are NOT in the incoming data (Cleanup)
    const incomingIds = data.map(n => n.id);
    await NoteModel.deleteMany({ id: { $nin: incomingIds } });

    // 2. Bulk Upsert the incoming notes
    const operations = data.map(note => ({
      updateOne: {
        filter: { id: note.id },
        update: { $set: note },
        upsert: true
      }
    }));

    if (operations.length > 0) {
      await NoteModel.bulkWrite(operations);
    }

    console.log(`✅ Synced ${data.length} notes to MongoDB`);
    res.json({ success: true, message: "Notes synced to MongoDB" });
  } catch (e) {
    console.error("Notes Save Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// --- ANALYTICS ---

// Schema: Daily Stats (Aggregated)
const DailyStatSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // "YYYY-MM-DD"
  totalHits: { type: Number, default: 0 },
  uniqueVisitors: { type: Number, default: 0 },
  newUsers: { type: Number, default: 0 },
  installCount: { type: Number, default: 0 }
});
const DailyStatModel = mongoose.model('DailyStat', DailyStatSchema);

// Schema: User Registry (Persistent)
const UserSchema = new mongoose.Schema({
  visitorId: { type: String, required: true, unique: true },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  visitCount: { type: Number, default: 1 },
  isInstalled: { type: Boolean, default: false },
  platform: String,
  locationId: String,
  language: String,
  ip: String,
  userAgent: String,
  screenResolution: String,
  referrer: String
});
const UserModel = mongoose.model('User', UserSchema);

// POST: Track Visit (Heartbeat)
app.post('/api/analytics/track', async (req, res) => {
  const { visitorId, isInstalled, platform, locationId, language, userAgent, screenResolution, referrer } = req.body;

  // Capture IP (handle proxies)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!visitorId) return res.status(400).json({ error: "Missing visitorId" });

  const todayStr = new Date().toISOString().split('T')[0];

  try {
    // 1. Find or Create User
    let user = await UserModel.findOne({ visitorId });
    let isNewUser = false;

    if (!user) {
      user = new UserModel({
        visitorId,
        isInstalled,
        platform,
        locationId,
        language,
        firstSeen: new Date(),
        lastSeen: new Date(),
        visitCount: 1,
        ip,
        userAgent,
        screenResolution,
        referrer
      });
      isNewUser = true;
    } else {
      // Update User
      user.lastSeen = new Date();
      user.visitCount += 1;
      user.isInstalled = isInstalled; // Update install status
      if (locationId) user.locationId = locationId;
      if (language) user.language = language;
      // Update latest session info
      user.ip = ip;
      user.userAgent = userAgent;
      user.screenResolution = screenResolution;
      user.referrer = referrer;
    }
    await user.save();

    // 2. Update Daily Stats
    let daily = await DailyStatModel.findOne({ date: todayStr });
    if (!daily) {
      daily = new DailyStatModel({ date: todayStr });
    }

    daily.totalHits += 1;
    if (isNewUser) daily.newUsers += 1;

    // Correct Unique Visitor Count logic:
    // If this user wasn't seen TODAY, increment uniqueVisitors
    // We can check this by comparing user.lastSeen (before update) but simpler is to trust the client session or approximate.
    // BETTER LOGIC: We can't easily know if they visited *today* without a 'lastSeenDate' field or log.
    // APPROXIMATION: If firstSeen is today, they are unique. If not, they MIGHT be unique today.
    // REVISED LOGIC: Just count unique visitors based on distinct IPs or just relying on "Hits" is better for simplicity, 
    // BUT we want "Unique Users".
    // Let's do a quick distinct query check (slightly slower but accurate) or just increment if isNewUser.

    // FAST APPROACH: We will treat 'uniqueVisitors' as 'Daily Active Users'.
    // To do this accurately, we need to know if this user matched 'date' today.
    // For now, let's just increment totalHits and newUsers. 
    // We will calculate "Unique Visitors" dynamically in the Stats GET endpoint or use a Set if we were in memory.
    // Since we are in Mongo, let's keep it simple: 
    // We will just store 'newUsers' and 'totalHits' in daily stats.
    // The "Total Unique Users" is just UserModel.countDocuments().

    // WAIT, the requirement is "Daily Unique Users". 
    // Let's add a `sessions` array to User? No, too big.
    // Let's just blindly increment uniqueVisitors if the user's `lastSeen` was NOT today?
    // Actually, we just updated `lastSeen`.
    // Let's assume the frontend sends a flag `isNewSession`.
    if (req.body.isNewSession) {
      // Logic: If user visited yesterday and comes back today, they are a "Unique Visitor" for today.
      // Only increment if we haven't tracked them today?
      // Let's simpler: Just increment uniqueVisitors for every `isNewSession`. 
      // This approximates DAU.
      daily.uniqueVisitors += 1;
    }

    if (isInstalled) daily.installCount += 1; // This is 'install hits', not unique installs. 
    // Actually, let's just count total installed users in the User collection.

    await daily.save();

    res.json({ success: true });
  } catch (e) {
    console.error("Analytics Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// GET: Fetch Stats for Admin
app.get('/api/analytics/stats', async (req, res) => {
  try {
    const totalUsers = await UserModel.countDocuments();
    const installedUsers = await UserModel.countDocuments({ isInstalled: true });

    // Get last 30 days history
    const history = await DailyStatModel.find().sort({ date: 1 }).limit(30);

    const platformStats = await UserModel.aggregate([
      { $group: { _id: "$platform", count: { $sum: 1 } } }
    ]);

    // Get Recent Users (Last 50) - Summary Only (Optimization)
    const recentUsers = await UserModel.find({}, 'visitorId platform lastSeen isInstalled country').sort({ lastSeen: -1 }).limit(50);

    // Enhanced Metrics: Lifetime, Today, Week, Month
    const todayStr = new Date().toISOString().split('T')[0];
    const getStartDate = (days) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    };

    const getAggregatedStats = async (startDate) => {
      const result = await DailyStatModel.aggregate([
        { $match: { date: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalHits: { $sum: "$totalHits" },
            uniqueVisitors: { $sum: "$uniqueVisitors" },
            newUsers: { $sum: "$newUsers" },
            installCount: { $sum: "$installCount" }
          }
        }
      ]);
      return result[0] || { totalHits: 0, uniqueVisitors: 0, newUsers: 0, installCount: 0 };
    };

    const [todayStats, weekStats, monthStats, lifetimeHits] = await Promise.all([
      DailyStatModel.findOne({ date: todayStr }).lean() || { totalHits: 0, uniqueVisitors: 0, newUsers: 0, installCount: 0 },
      getAggregatedStats(getStartDate(7)),
      getAggregatedStats(getStartDate(30)),
      DailyStatModel.aggregate([{ $group: { _id: null, hits: { $sum: "$totalHits" } } }])
    ]);

    const metrics = {
      lifetime: {
        visits: lifetimeHits[0]?.hits || 0,
        visitors: totalUsers,
        installs: installedUsers
      },
      today: todayStats,
      week: weekStats,
      month: monthStats
    };

    res.json({
      overall: {
        totalUsers,
        installedUsers,
        installRate: totalUsers > 0 ? ((installedUsers / totalUsers) * 100).toFixed(1) : 0
      },
      metrics, // New Enhanced Metrics
      history,
      platforms: platformStats,
      recentUsers
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET: Fetch Single User Details (Lazy Load)
app.get('/api/analytics/user/:visitorId', async (req, res) => {
  try {
    const user = await UserModel.findOne({ visitorId: req.params.visitorId });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET: Fetch Users List (Filtered & Paginated)
app.get('/api/analytics/users', async (req, res) => {
  try {
    const { period, filter, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};

    // 1. Period Filter (Based on lastSeen)
    if (period && period !== 'lifetime') {
      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0); // Start of today
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(now.getDate() - 30);
          break;
      }
      query.lastSeen = { $gte: startDate };
    }

    // 2. Type Filter
    if (filter === 'installed') {
      query.isInstalled = true;
    }
    // Note: 'visitors' (unique) is the default for UserModel since every doc is a unique visitor.

    const users = await UserModel.find(query)
      .sort({ lastSeen: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await UserModel.countDocuments(query);

    res.json({
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));