import mongoose from 'mongoose';

// reuse connection between function invocations
let cachedDb = null;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    throw new Error('Please define the MONGO_URI environment variable inside .env.local');
}

const connectToDatabase = async () => {
    if (cachedDb) return cachedDb;

    const opts = {
        bufferCommands: false, // Disable Mongoose buffering
    };

    const db = await mongoose.connect(MONGO_URI, opts);
    cachedDb = db;
    return db;
};

// Define Schemas (Copy from server.js)
const UserSchema = new mongoose.Schema({
    visitorId: { type: String, unique: true },
    isInstalled: Boolean,
    platform: String,
    locationId: String,
    language: String,
    firstSeen: Date,
    lastSeen: Date,
    visitCount: Number,
    ip: String,
    userAgent: String,
    screenResolution: String,
    referrer: String
});

const DailyStatSchema = new mongoose.Schema({
    date: { type: String, unique: true }, // YYYY-MM-DD
    totalHits: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    installCount: { type: Number, default: 0 }
});

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const DailyStatModel = mongoose.models.DailyStat || mongoose.model('DailyStat', DailyStatSchema);

export default connectToDatabase;
