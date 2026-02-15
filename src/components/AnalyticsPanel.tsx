import React, { useEffect, useState } from 'react';
import { fetchAnalytics } from '../services/analyticsService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Stats {
    overall: {
        totalUsers: number;
        installedUsers: number;
        installRate: string;
    };
    history: {
        date: string;
        totalHits: number;
        uniqueVisitors: number;
        newUsers: number;
        installCount: number;
    }[];
    platforms: { _id: string; count: number }[];
    recentUsers: {
        visitorId: string;
        ip: string;
        platform: string;
        isInstalled: boolean;
        lastSeen: string;
        country?: string; // Future proof
        userAgent?: string;
    }[];
    metrics?: {
        lifetime: { visits: number; visitors: number; installs: number };
        today: { totalHits: number; uniqueVisitors: number; newUsers: number; installCount: number };
        week: { totalHits: number; uniqueVisitors: number; newUsers: number; installCount: number };
        month: { totalHits: number; uniqueVisitors: number; newUsers: number; installCount: number };
    };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AnalyticsPanel: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(false); // Default false, wait for user action
    const [loadedOnce, setLoadedOnce] = useState(false);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await fetchAnalytics();
            setStats(data);
            setLoadedOnce(true);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Control Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h3 className="font-bold text-gray-800">Analytics Dashboard</h3>
                    <p className="text-xs text-gray-400">Data provided by MongoDB</p>
                </div>
                <button
                    onClick={loadStats}
                    disabled={loading}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm shadow-md transition-all ${loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}
                >
                    <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                    {loading ? 'Loading...' : (loadedOnce ? 'Refresh Data' : 'Load Analytics')}
                </button>
            </div>

            {!loadedOnce && !loading && (
                <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-chart-pie text-4xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-400">Analytics Paused</h3>
                    <p className="text-gray-400 text-sm mb-6">Click the button above to load user data.</p>
                </div>
            )}

            {loading && !loadedOnce && (
                <div className="p-8 text-center text-gray-500 py-20">
                    <i className="fas fa-circle-notch fa-spin text-3xl text-indigo-500 mb-4"></i>
                    <p>Fetching data from server...</p>
                </div>
            )}

            {stats && (
                <div className="animate-fade-in space-y-6">
                    {/* Enhanced KPI Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Lifetime Stats */}
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-xl shadow-lg text-white">
                            <p className="text-xs opacity-75 uppercase font-bold tracking-wider mb-1">Lifetime Visits</p>
                            <h3 className="text-3xl font-bold">{stats.metrics?.lifetime?.visits?.toLocaleString() || 0}</h3>
                            <div className="mt-2 text-xs opacity-75 flex items-center justify-between">
                                <span>Total Page Loads</span>
                                <i className="fas fa-eye"></i>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 rounded-xl shadow-lg text-white">
                            <p className="text-xs opacity-75 uppercase font-bold tracking-wider mb-1">Lifetime Visitors</p>
                            <h3 className="text-3xl font-bold">{stats.metrics?.lifetime?.visitors?.toLocaleString() || 0}</h3>
                            <div className="mt-2 text-xs opacity-75 flex items-center justify-between">
                                <span>Unique People</span>
                                <i className="fas fa-users"></i>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-xl shadow-lg text-white">
                            <p className="text-xs opacity-75 uppercase font-bold tracking-wider mb-1">Total Installs</p>
                            <h3 className="text-3xl font-bold">{stats.metrics?.lifetime?.installs?.toLocaleString() || 0}</h3>
                            <div className="mt-2 text-xs opacity-75 flex items-center justify-between">
                                <span>App Installations</span>
                                <i className="fas fa-download"></i>
                            </div>
                        </div>
                    </div>

                    {/* Period Comparison Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                            <h4 className="font-bold text-gray-700 text-sm">
                                <i className="fas fa-calendar-alt text-indigo-500 mr-2"></i> Period Performance
                            </h4>
                        </div>
                        <div className="grid grid-cols-4 divide-x divide-gray-100 text-center">
                            <div className="p-4">
                                <p className="text-xs text-gray-400 uppercase font-bold mb-2">Metric</p>
                                <div className="space-y-3 text-sm font-medium text-gray-600 text-left pl-4">
                                    <p>Visits (Hits)</p>
                                    <p>New Visitors</p>
                                    <p>Installs</p>
                                </div>
                            </div>
                            <div className="p-4 bg-blue-50/30">
                                <p className="text-xs text-blue-500 uppercase font-bold mb-2">Today (24h)</p>
                                <div className="space-y-3 font-bold text-gray-800">
                                    <p>{stats.metrics?.today?.totalHits || 0}</p>
                                    <p>{stats.metrics?.today?.newUsers || 0}</p>
                                    <p>{stats.metrics?.today?.installCount || 0}</p>
                                </div>
                            </div>
                            <div className="p-4">
                                <p className="text-xs text-purple-500 uppercase font-bold mb-2">This Week (7d)</p>
                                <div className="space-y-3 font-bold text-gray-800">
                                    <p>{stats.metrics?.week?.totalHits || 0}</p>
                                    <p>{stats.metrics?.week?.newUsers || 0}</p>
                                    <p>{stats.metrics?.week?.installCount || 0}</p>
                                </div>
                            </div>
                            <div className="p-4">
                                <p className="text-xs text-orange-500 uppercase font-bold mb-2">This Month (30d)</p>
                                <div className="space-y-3 font-bold text-gray-800">
                                    <p>{stats.metrics?.month?.totalHits || 0}</p>
                                    <p>{stats.metrics?.month?.newUsers || 0}</p>
                                    <p>{stats.metrics?.month?.installCount || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Line Chart */}
                        <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <i className="fas fa-chart-line text-blue-500"></i> Traffic Trend (30 Days)
                            </h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stats.history}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(val) => val.slice(5)} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontSize: '12px' }}
                                        />
                                        <Line type="monotone" dataKey="totalHits" stroke="#94a3b8" strokeWidth={2} dot={false} name="Total Hits" />
                                        <Line type="monotone" dataKey="uniqueVisitors" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6 }} name="Unique Visitors" />
                                        <Line type="monotone" dataKey="newUsers" stroke="#a855f7" strokeWidth={2} dot={false} name="New Users" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Platform Pie Chart */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <i className="fas fa-mobile-alt text-emerald-500"></i> Platforms
                            </h4>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.platforms}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={5}
                                            dataKey="count"
                                            nameKey="_id"
                                        >
                                            {stats.platforms.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center mt-2">
                                {stats.platforms.map((p, i) => (
                                    <div key={p._id} className="flex items-center gap-1 text-xs text-gray-500">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                                        {p._id || 'Unknown'} ({p.count})
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recent Users Table */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <i className="fas fa-history text-purple-500"></i> Recent Activity (Last 50)
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-500">
                                <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="px-4 py-3 rounded-tl-lg">User</th>
                                        <th className="px-4 py-3">Details</th>
                                        <th className="px-4 py-3">Platform</th>
                                        <th className="px-4 py-3">Last Seen</th>
                                        <th className="px-4 py-3 rounded-tr-lg">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {stats.recentUsers?.map((user) => (
                                        <tr key={user.visitorId} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-indigo-600">
                                                {user.visitorId.slice(0, 8)}...
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-700">{user.ip || 'Unknown IP'}</span>
                                                    <span className="text-[10px] text-gray-400 truncate max-w-[150px]" title={user.userAgent}>{user.userAgent || 'Unknown Browser'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {user.platform === 'Android' && <i className="fab fa-android text-green-500 mr-2"></i>}
                                                {user.platform === 'iOS' && <i className="fab fa-apple text-gray-800 mr-2"></i>}
                                                {user.platform === 'Windows' && <i className="fab fa-windows text-blue-500 mr-2"></i>}
                                                {user.platform === 'Mac' && <i className="fab fa-apple text-gray-500 mr-2"></i>}
                                                {user.platform === 'Web' && <i className="fas fa-globe text-gray-400 mr-2"></i>}
                                                {user.platform}
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                {new Date(user.lastSeen).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                {user.isInstalled ? (
                                                    <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold">INSTALLED</span>
                                                ) : (
                                                    <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px]">BROWSER</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!stats.recentUsers || stats.recentUsers.length === 0) && (
                                        <tr><td colSpan={5} className="text-center py-4">No recent activity found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPanel;
