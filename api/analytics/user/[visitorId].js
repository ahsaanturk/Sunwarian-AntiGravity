import connectToDatabase, { UserModel } from '../db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectToDatabase();

        // In Vercel dynamic routes, the param matches the filename [visitorId].js
        const { visitorId } = req.query;

        if (!visitorId) {
            return res.status(400).json({ error: "Missing visitorId" });
        }

        const user = await UserModel.findOne({ visitorId });
        if (!user) return res.status(404).json({ error: "User not found" });

        res.status(200).json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
