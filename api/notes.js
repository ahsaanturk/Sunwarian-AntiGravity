import mongoose from 'mongoose';

// reuse connection between function invocations
let cachedDb = null;

const MONGO_URI = "mongodb+srv://nehmatullah:1122@learn.usn1zoo.mongodb.net/namaz_timing?retryWrites=true&w=majority";

const NoteSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  text: String,
  isGlobal: Boolean,
  locationId: String
});

// Prevent overwriting model if already compiled
const NoteModel = mongoose.models.Note || mongoose.model('Note', NoteSchema);

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
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await connectToDatabase();

    if (req.method === 'GET') {
      const notes = await NoteModel.find({}, '-_id -__v');
      return res.status(200).json(notes);
    } 
    
    else if (req.method === 'POST') {
      const { password, data } = req.body;

      if (password !== 'AhsaanGlobal786') {
        return res.status(403).json({ error: "Unauthorized: Wrong Admin Password" });
      }

      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Invalid data format" });
      }

      // Replace strategy: Delete all and insert new list to ensure deletions propagate
      await NoteModel.deleteMany({});
      await NoteModel.insertMany(data);

      return res.status(200).json({ success: true, message: "Notes synced to MongoDB" });
    } 
    
    else {
      return res.status(405).json({ error: "Method not allowed" });
    }

  } catch (e) {
    console.error("API Error:", e);
    return res.status(500).json({ error: e.message });
  }
}