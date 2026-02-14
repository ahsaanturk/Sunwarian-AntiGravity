import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

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
  custom_message: String,
  whatsapp_community: String
});

const NoteSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  text: String,
  isGlobal: Boolean,
  locationId: String
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
    // Prepare bulk operations
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));