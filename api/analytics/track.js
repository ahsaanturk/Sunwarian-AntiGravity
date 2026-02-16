import connectToDatabase, { UserModel, DailyStatModel } from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectToDatabase();

        const {
            visitorId,
            isInstalled,
            platform,
            locationId,
            language,
            ip: reqIp, // Usually passed by client or we get from header
            userAgent: reqUa,
            screenResolution,
            referrer
        } = req.body;

        // Get IP and UserAgent from headers if not in body (Vercel specific)
        const ip = reqIp || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = reqUa || req.headers['user-agent'];
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Update/Create User Profile
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

        // Logic: If user visited yesterday and comes back today, they are a "Unique Visitor" for today.
        // We assume frontend sends 'isNewSession' flag for a fresh session visit
        if (req.body.isNewSession) {
            daily.uniqueVisitors += 1;
        }

        if (isInstalled) daily.installCount += 1;

        await daily.save();

        res.status(200).json({ success: true });
    } catch (e) {
        console.error("Analytics Error:", e);
        res.status(500).json({ error: e.message });
    }
}
