import mongoose from 'mongoose';

// reuse connection between function invocations
let cachedDb = null;

const MONGO_URI = process.env.MONGO_URI;

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

// Prevent overwriting model if already compiled
const LocationModel = mongoose.models.Location || mongoose.model('Location', LocationSchema);

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const opts = {
    bufferCommands: false,
  };

  const db = await mongoose.connect(MONGO_URI, opts);
  cachedDb = db;
  return db;
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await connectToDatabase();

    if (req.method === 'GET') {
      const data = await LocationModel.find({}, '-_id -__v -timings._id');
      return res.status(200).json(data);
    }

    else if (req.method === 'POST') {
      const { password, data } = req.body;

      if (password !== 'AhsaanGlobal786') {
        return res.status(403).json({ error: "Unauthorized: Wrong Admin Password" });
      }

      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Invalid data format" });
      }

      // 1. Delete locations that are NOT in the incoming data (Cleanup)
      const incomingIds = data.map(l => l.id);
      await LocationModel.deleteMany({ id: { $nin: incomingIds } });

      // 2. Bulk Write Operation
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

      return res.status(200).json({ success: true, message: "Data saved to MongoDB (BulkWrite)" });
    }

    else {
      return res.status(405).json({ error: "Method not allowed" });
    }

  } catch (e) {
    console.error("API Error:", e);
    return res.status(500).json({ error: e.message });
  }
}