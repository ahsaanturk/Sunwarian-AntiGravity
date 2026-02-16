import connectToDatabase, { UserModel } from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectToDatabase();

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

        res.status(200).json({
            users,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
