import React, { useEffect, useState } from 'react';
import { fetchAnalytics, fetchUserDetail, fetchUserList } from '../services/analyticsService';
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

    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [loadingUser, setLoadingUser] = useState(false);

    const handleViewUser = async (visitorId: string) => {
        setLoadingUser(true);
        try {
            console.log("Fetching details for:", visitorId);
            const userData = await fetchUserDetail(visitorId);
            console.log("User Data Received:", userData);
            setSelectedUser(userData);
        } catch (e) {
            console.error("Failed to load user details", e);
        } finally {
            setLoadingUser(false);
        }
    };

    const closeUserModal = () => {
        setSelectedUser(null);
    };

    // --- Interactive List Logic ---
    const [activeView, setActiveView] = useState<'dashboard' | 'list'>('dashboard');
    const [listFilter, setListFilter] = useState<{ filter?: string, period?: string, title: string }>({ title: 'Users' });
    const [userList, setUserList] = useState<any[]>([]);
    const [listLoading, setListLoading] = useState(false);
    const [listPage, setListPage] = useState(1);
    const [listTotalPages, setListTotalPages] = useState(1);

    const loadUserList = async (page = 1) => {
        setListLoading(true);
        try {
            const data = await fetchUserList(page, 20, listFilter.filter, listFilter.period);
            if (data.users) {
                setUserList(data.users);
                setListTotalPages(data.totalPages);
                setListPage(data.page);
            }
        } catch (e) {
            console.error("Failed to fetch user list", e);
        } finally {
            setListLoading(false);
        }
    };

    useEffect(() => {
        if (activeView === 'list') {
            loadUserList(1);
        }
    }, [activeView, listFilter]);

    const handleCardClick = (filter: string | undefined, period: string | undefined, title: string) => {
        setListFilter({ filter, period, title });
        setActiveView('list');
    };

    if (activeView === 'list') {
        return (
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 animate-fade-in">
                {/* Header */}
                <div className="bg-gray-50/50 p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <button
                            onClick={() => setActiveView('dashboard')}
                            className="text-gray-500 hover:text-emerald-600 font-bold text-xs flex items-center gap-2 mb-1 transition-colors"
                        >
                            <i className="fas fa-arrow-left"></i> Back to Dashboard
                        </button>
                        <h2 className="text-xl font-bold text-gray-800">{listFilter.title}</h2>
                    </div>
                    <button onClick={() => loadUserList(listPage)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm">
                        <i className={`fas fa-sync-alt text-xs ${listLoading ? 'animate-spin' : ''}`}></i>
                    </button>
                </div>

                {/* List Content */}
                <div className="p-0">
                    {listLoading ? (
                        <div className="p-12 text-center text-gray-400">
                            <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                            <p className="text-xs">Loading users...</p>
                        </div>
                    ) : userList.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <i className="fas fa-users-slash text-2xl mb-2"></i>
                            <p className="text-xs">No users found for this criteria.</p>
                        </div>
                    ) : (
                        <div>
                            <div className="divide-y divide-gray-50">
                                {userList.map((user: any) => (
                                    <div
                                        key={user.visitorId}
                                        onClick={() => handleViewUser(user.visitorId)}
                                        className="p-4 hover:bg-emerald-50/30 transition-colors cursor-pointer flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${user.isInstalled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {user.platform === 'iOS' ? <i className="fab fa-apple"></i> :
                                                    user.platform === 'Android' ? <i className="fab fa-android"></i> :
                                                        <i className="fas fa-globe"></i>}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-700 font-mono">
                                                    {user.visitorId.slice(0, 8)}...
                                                    {user.isInstalled && <i className="fas fa-check-circle text-emerald-500 ml-1 text-[10px]" title="Installed"></i>}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    {new Date(user.lastSeen).toLocaleDateString()} • {new Date(user.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[10px] font-bold text-gray-600">{user.visitCount} visits</p>
                                                {user.locationId && <p className="text-[10px] text-gray-400 uppercase">{user.locationId}</p>}
                                            </div>
                                            <i className="fas fa-chevron-right text-gray-200 group-hover:text-emerald-400 transition-colors text-xs"></i>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {listTotalPages > 1 && (
                                <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <button
                                        disabled={listPage === 1}
                                        onClick={() => loadUserList(listPage - 1)}
                                        className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-[10px] font-bold text-gray-400">Page {listPage} of {listTotalPages}</span>
                                    <button
                                        disabled={listPage === listTotalPages}
                                        onClick={() => loadUserList(listPage + 1)}
                                        className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Reusing existing Detail Modal logic */}
                {selectedUser && (
                    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={closeUserModal}>
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800">User Details</h3>
                                <button onClick={closeUserModal} className="text-gray-400 hover:text-red-500"><i className="fas fa-times"></i></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${selectedUser.isInstalled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                        {selectedUser.platform === 'iOS' ? <i className="fab fa-apple"></i> :
                                            selectedUser.platform === 'Android' ? <i className="fab fa-android"></i> :
                                                <i className="fas fa-globe"></i>}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Visitor ID</p>
                                        <p className="font-mono text-sm font-bold text-gray-800">{selectedUser.visitorId}</p>
                                        <div className="flex gap-2 mt-1">
                                            {selectedUser.isInstalled && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Installed App</span>}
                                            <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{selectedUser.visitCount} Sessions</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">First Seen</p>
                                        <p className="text-xs font-bold text-gray-700">{new Date(selectedUser.firstSeen).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Last Active</p>
                                        <p className="text-xs font-bold text-gray-700">{new Date(selectedUser.lastSeen).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Location</p>
                                        <p className="text-xs font-bold text-gray-700">{selectedUser.locationId || 'Unknown'}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Language</p>
                                        <p className="text-xs font-bold text-gray-700 uppercase">{selectedUser.language || '?'}</p>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between text-xs border-b border-gray-50 pb-2">
                                        <span className="text-gray-400">IP Address</span>
                                        <span className="font-mono text-gray-600">{selectedUser.ip || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between text-xs border-b border-gray-50 pb-2">
                                        <span className="text-gray-400">Screen Resolution</span>
                                        <span className="font-mono text-gray-600">{selectedUser.screenResolution || 'N/A'}</span>
                                    </div>
                                    <div className="block text-xs">
                                        <span className="text-gray-400 block mb-1">User Agent</span>
                                        <p className="font-mono text-gray-500 bg-gray-50 p-2 rounded-lg break-all leading-tight">{selectedUser.userAgent || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

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
                    {/* KPI Cards - CLICKABLE */}
                    <div className="grid grid-cols-3 gap-3">
                        <div
                            onClick={() => handleCardClick(undefined, 'lifetime', 'All Users (Lifetime)')}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all active:scale-95"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                                <i className="fas fa-users text-sm"></i>
                            </div>
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Lifetime Visitors</h3>
                            <p className="text-xl font-black text-gray-800 font-mono mt-1">{stats?.metrics?.lifetime?.visitors || 0}</p>
                        </div>
                        <div
                            onClick={() => handleCardClick('installed', 'lifetime', 'Installed Users')}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all active:scale-95"
                        >
                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                                <i className="fas fa-download text-sm"></i>
                            </div>
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Active Installs</h3>
                            <div className="flex flex-col items-center mt-1">
                                <p className="text-xl font-black text-emerald-600 font-mono">{stats?.metrics?.lifetime?.installs || 0}</p>
                                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 rounded ml-1">
                                    {stats?.overall?.installRate}% Rate
                                </span>
                            </div>
                        </div>
                        <div
                            onClick={() => handleCardClick(undefined, undefined, 'Total Page Hits')}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:border-purple-300 hover:shadow-md transition-all active:scale-95"
                        >
                            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                                <i className="fas fa-eye text-sm"></i>
                            </div>
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Total Hits</h3>
                            <p className="text-xl font-black text-gray-800 font-mono mt-1">{stats?.metrics?.lifetime?.visits || 0}</p>
                        </div>
                    </div>

                    {/* Period Comparisons - CLICKABLE */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">Period Performance</h3>
                            <span className="text-[10px] px-2 py-1 bg-gray-100 text-gray-500 rounded-full font-bold">Live</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                            <div
                                onClick={() => handleCardClick(undefined, 'today', 'Users Active Today')}
                                className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center font-bold text-xs">24h</div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">Today</p>
                                        <p className="text-[10px] text-gray-400">Active users in last 24h</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-gray-800 font-mono">{stats?.metrics?.today?.uniqueVisitors || 0}</p>
                                    <p className="text-[10px] text-emerald-500 font-bold">+{stats?.metrics?.today?.newUsers || 0} New</p>
                                </div>
                            </div>
                            <div
                                onClick={() => handleCardClick(undefined, 'week', 'Users Active This Week')}
                                className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-xs">7D</div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">Last 7 Days</p>
                                        <p className="text-[10px] text-gray-400">Weekly active users</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-gray-800 font-mono">{stats?.metrics?.week?.uniqueVisitors || 0}</p>
                                    <p className="text-[10px] text-emerald-500 font-bold">+{stats?.metrics?.week?.newUsers || 0} New</p>
                                </div>
                            </div>
                            <div
                                onClick={() => handleCardClick(undefined, 'month', 'Users Active This Month')}
                                className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center font-bold text-xs">30D</div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">Last 30 Days</p>
                                        <p className="text-[10px] text-gray-400">Monthly active users</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-gray-800 font-mono">{stats?.metrics?.month?.uniqueVisitors || 0}</p>
                                    <p className="text-[10px] text-emerald-500 font-bold">+{stats?.metrics?.month?.newUsers || 0} New</p>
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
                                        <th className="px-4 py-3">Platform</th>
                                        <th className="px-4 py-3">Last Seen</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 rounded-tr-lg text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {stats.recentUsers?.map((user) => (
                                        <tr key={user.visitorId} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-indigo-600">
                                                {user.visitorId.slice(0, 8)}...
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
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleViewUser(user.visitorId)}
                                                    className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1 rounded text-xs font-bold transition-colors"
                                                >
                                                    {loadingUser ? 'Loading...' : 'View Details'}
                                                </button>
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

                    {/* User Detail Modal */}
                    {selectedUser && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={closeUserModal}>
                            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                                <div className="bg-indigo-600 p-6 text-white flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold">User Details</h3>
                                        <p className="text-indigo-200 text-xs font-mono mt-1">{selectedUser.visitorId}</p>
                                    </div>
                                    <button onClick={closeUserModal} className="bg-white/20 hover:bg-white/30 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Total Visits</p>
                                            <p className="font-bold text-gray-800 text-lg">{selectedUser.visitCount}</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Status</p>
                                            <p className="font-bold text-gray-800">
                                                {selectedUser.isInstalled ?
                                                    <span className="text-emerald-600">Installed App</span> :
                                                    <span className="text-gray-500">Browser User</span>
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Platform & Device</p>
                                            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 break-words">
                                                <p><span className="font-bold">OS:</span> {selectedUser.platform}</p>
                                                <p><span className="font-bold">Resolution:</span> {selectedUser.screenResolution || 'Unknown'}</p>
                                                <p className="mt-2 text-xs opacity-75">{selectedUser.userAgent || 'No User Agent Data'}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Location & Language</p>
                                            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                                                <p><span className="font-bold">Location ID:</span> {selectedUser.locationId || 'Default'}</p>
                                                <p><span className="font-bold">Language:</span> {selectedUser.language === 'ur' ? 'Urdu' : 'English'}</p>
                                                <p><span className="font-bold">IP Address:</span> {selectedUser.ip || 'Unknown'}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Timestamps</p>
                                            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                                                <p><span className="font-bold">First Seen:</span> {new Date(selectedUser.firstSeen).toLocaleString()}</p>
                                                <p><span className="font-bold">Last Seen:</span> {new Date(selectedUser.lastSeen).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Referrer</p>
                                            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 break-words">
                                                {selectedUser.referrer || 'Direct / None'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                                    <button onClick={closeUserModal} className="text-indigo-600 font-bold text-sm hover:underline">
                                        Close Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnalyticsPanel;
