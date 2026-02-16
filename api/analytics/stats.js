import connectToDatabase, { UserModel, DailyStatModel } from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectToDatabase();

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

        res.status(200).json({
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
}
