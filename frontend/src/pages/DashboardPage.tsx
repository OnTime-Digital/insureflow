import {
    ShieldCheck, Users, Clock, UserPlus,
    Plus, IndianRupee, Filter, TrendingUp,
    ArrowRight, Bell, CalendarDays, Sparkles
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useEffect, useState } from "react";
import axios from "axios";
import { format, differenceInDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, startOfQuarter, endOfQuarter } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type RecentPolicy = {
    id: string;
    policyNo: string;
    type: string;
    status: string;
    premium: number;
    createdAt: string;
    client: { id: string; name: string; email: string | null };
};

type PipelineItem = {
    status: string;
    _count: number;
};

const PIPELINE_LABELS: Record<string, string> = {
    'NEW': 'New',
    'CONTACTED': 'Contacted',
    'QUOTE_SENT': 'Quote Sent',
    'NEGOTIATION': 'Negotiation',
    'CLOSED_WON': 'Closed Won',
    'CLOSED_LOST': 'Closed Lost',
};

const PIPELINE_HEX: Record<string, string> = {
    'NEW': '#3b82f6',
    'CONTACTED': '#a855f7',
    'QUOTE_SENT': '#f97316',
    'NEGOTIATION': '#eab308',
    'CLOSED_WON': '#10b981',
    'CLOSED_LOST': '#ef4444',
};

const STATUS_ORDER = ['NEW', 'CONTACTED', 'QUOTE_SENT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

export default function DashboardPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        activePolicies: 0,
        totalClients: 0,
        pendingRenewals: 0,
        newLeads: 0,
        totalPremium: 0,
        lifeEpTotal: 0
    });

    const [renewals, setRenewals] = useState<any[]>([]);
    const [recentPolicies, setRecentPolicies] = useState<RecentPolicy[]>([]);
    const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'month' | 'last_month' | 'quarter' | 'year' | 'all' | 'custom'>('month');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const getDateParams = () => {
        if (dateRange === 'month') {
            return { from: startOfMonth(new Date()).toISOString(), to: endOfMonth(new Date()).toISOString() };
        } else if (dateRange === 'last_month') {
            const last = subMonths(new Date(), 1);
            return { from: startOfMonth(last).toISOString(), to: endOfMonth(last).toISOString() };
        } else if (dateRange === 'quarter') {
            return { from: startOfQuarter(new Date()).toISOString(), to: endOfQuarter(new Date()).toISOString() };
        } else if (dateRange === 'year') {
            return { from: startOfYear(new Date()).toISOString(), to: endOfYear(new Date()).toISOString() };
        } else if (dateRange === 'all') {
            return {};
        } else if (dateRange === 'custom' && customFrom && customTo) {
            return { from: new Date(customFrom).toISOString(), to: new Date(customTo).toISOString() };
        }
        return {};
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const dateParams = getDateParams();
                const queryStr = dateParams.from ? `?from=${dateParams.from}&to=${dateParams.to}` : '';
                const [statsRes, renewalsRes, recentRes, pipelineRes] = await Promise.all([
                    axios.get(`/api/dashboard/stats${queryStr}`),
                    axios.get('/api/dashboard/renewals'),
                    axios.get('/api/dashboard/recent-activity'),
                    axios.get('/api/dashboard/pipeline'),
                ]);
                setStats(statsRes.data);
                setRenewals(renewalsRes.data);
                setRecentPolicies(recentRes.data);
                setPipeline(pipelineRes.data);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [dateRange, customFrom, customTo]);

    // Prepare pipeline data sorted by order
    const sortedPipeline = STATUS_ORDER.map(status => {
        const item = pipeline.find(p => p.status === status);
        return {
            status,
            name: PIPELINE_LABELS[status] || status,
            count: item?._count || 0,
            color: PIPELINE_HEX[status] || '#cbd5e1'
        };
    });
    const totalLeadsCount = sortedPipeline.reduce((sum, p) => sum + p.count, 0);

    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getUrgencyInfo = (expiryDate: string) => {
        const days = differenceInDays(new Date(expiryDate), new Date());
        if (days < 0) return { label: 'Expired', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' };
        if (days <= 7) return { label: `${days}d left`, color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' };
        if (days <= 15) return { label: `${days}d left`, color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' };
        return { label: `${days}d left`, color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' };
    };

    // Custom tooltip for Recharts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 px-4 py-3 min-w-[140px]">
                    <p className="text-sm font-bold text-slate-900 mb-1">{label}</p>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: payload[0].payload.color }} />
                        <span className="text-sm text-slate-600">{payload[0].value} leads</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">

            {/* Welcome Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
                <div className="absolute -right-10 -top-10 w-60 h-60 bg-white/5 rounded-full blur-2xl" />
                <div className="absolute -right-5 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-xl" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-5 h-5 text-blue-200" />
                            <span className="text-blue-200 text-sm font-medium">{format(new Date(), 'EEEE, dd MMM yyyy')}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{getGreeting()} 👋</h1>
                        <p className="text-blue-100 mt-1 text-sm sm:text-base">Here's what's happening with your insurance business today.</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <Link to="/clients/new" className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border border-white/20 shadow-sm">
                            <Plus className="w-4 h-4" />
                            New Client
                        </Link>
                        <Link to="/policies/new" className="flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
                            <Plus className="w-4 h-4" />
                            New Policy
                        </Link>
                    </div>
                </div>
            </div>

            {/* Date Range Filter Bar */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Filter:
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setDateRange('month')}
                        className={clsx('px-3 py-1.5 text-xs font-semibold rounded-md transition-colors', dateRange === 'month' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700')}
                    >This Month</button>
                    <button
                        onClick={() => setDateRange('last_month')}
                        className={clsx('px-3 py-1.5 text-xs font-semibold rounded-md transition-colors', dateRange === 'last_month' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700')}
                    >Last Month</button>
                    <button
                        onClick={() => setDateRange('quarter')}
                        className={clsx('px-3 py-1.5 text-xs font-semibold rounded-md transition-colors', dateRange === 'quarter' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700')}
                    >This Quarter</button>
                    <button
                        onClick={() => setDateRange('year')}
                        className={clsx('px-3 py-1.5 text-xs font-semibold rounded-md transition-colors', dateRange === 'year' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700')}
                    >This Year</button>
                    <button
                        onClick={() => setDateRange('all')}
                        className={clsx('px-3 py-1.5 text-xs font-semibold rounded-md transition-colors', dateRange === 'all' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700')}
                    >All Time</button>
                    <button
                        onClick={() => setDateRange('custom')}
                        className={clsx('px-3 py-1.5 text-xs font-semibold rounded-md transition-colors', dateRange === 'custom' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700')}
                    >Custom</button>
                </div>
                {dateRange === 'custom' && (
                    <div className="flex items-center gap-2 ml-2">
                        <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        <span className="text-xs text-slate-400">to</span>
                        <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                )}
            </div>

            {/* Top Metrics Cards — 5 cards */}
            <div className={clsx("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4", loading && "opacity-50 pointer-events-none transition-opacity")}>

                {/* Total Premium Revenue */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-md overflow-hidden text-white relative group">
                    <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="p-5 relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <IndianRupee className="h-5 w-5" />
                            </div>
                            <span className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Total Premium</span>
                        </div>
                        <h3 className="text-2xl font-extrabold">₹{stats.totalPremium.toLocaleString('en-IN')}</h3>
                        <p className="text-emerald-100 text-xs mt-1">Active policies revenue</p>
                    </div>
                </div>

                {/* Life EP Total */}
                <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-md overflow-hidden text-white relative group">
                    <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="p-5 relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <span className="text-violet-100 text-xs font-semibold uppercase tracking-wider">Life EP</span>
                        </div>
                        <h3 className="text-2xl font-extrabold">₹{(stats.lifeEpTotal || 0).toLocaleString('en-IN')}</h3>
                        <p className="text-violet-100 text-xs mt-1">Life earned premium</p>
                    </div>
                </div>

                {/* Active Policies */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow duration-300">
                    <div className="p-5 flex items-start gap-4 flex-1">
                        <div className="p-3 bg-blue-50 rounded-xl shrink-0 group-hover:bg-blue-100 transition-colors">
                            <ShieldCheck className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Policies</p>
                            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.activePolicies.toLocaleString()}</h3>
                        </div>
                    </div>
                    <Link to="/policies" className="bg-slate-50/70 px-5 py-2.5 border-t border-slate-100 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-slate-100 transition-colors flex items-center gap-1">
                        View all <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                {/* Total Clients */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow duration-300">
                    <div className="p-5 flex items-start gap-4 flex-1">
                        <div className="p-3 bg-violet-50 rounded-xl shrink-0 group-hover:bg-violet-100 transition-colors">
                            <Users className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Clients</p>
                            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalClients.toLocaleString()}</h3>
                        </div>
                    </div>
                    <Link to="/clients" className="bg-slate-50/70 px-5 py-2.5 border-t border-slate-100 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-slate-100 transition-colors flex items-center gap-1">
                        View all <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                {/* Pending Renewals */}
                <div className="bg-orange-50/40 rounded-2xl border border-orange-200/60 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow duration-300">
                    <div className="p-5 flex items-start gap-4 flex-1">
                        <div className="p-3 bg-orange-100 rounded-xl shrink-0 group-hover:bg-orange-200 transition-colors">
                            <Clock className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider">Renewals Due</p>
                            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.pendingRenewals}</h3>
                        </div>
                    </div>
                    <div className="bg-orange-100/50 px-5 py-2.5 border-t border-orange-100 text-xs font-semibold text-orange-700 flex items-center gap-1.5">
                        <Bell className="w-3 h-3" /> Action Required
                    </div>
                </div>

                {/* New Leads */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow duration-300">
                    <div className="p-5 flex items-start gap-4 flex-1">
                        <div className="p-3 bg-cyan-50 rounded-xl shrink-0 group-hover:bg-cyan-100 transition-colors">
                            <UserPlus className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New Leads <span className="normal-case text-slate-300">(30d)</span></p>
                            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.newLeads}</h3>
                        </div>
                    </div>
                    <Link to="/leads" className="bg-slate-50/70 px-5 py-2.5 border-t border-slate-100 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-slate-100 transition-colors flex items-center gap-1">
                        View pipeline <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

            </div>

            {/* Middle Row: Pipeline Chart & Renewals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Pipeline Chart Area */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <TrendingUp className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Lead Pipeline</h2>
                                <p className="text-xs text-slate-400">{totalLeadsCount} total leads across all stages</p>
                            </div>
                        </div>
                        <Link to="/reports" className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                            View Report
                        </Link>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-end">
                        {loading ? (
                            <div className="h-72 flex justify-center items-center">
                                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : pipeline.length === 0 ? (
                            <div className="h-72 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-3 p-6 text-center">
                                <div className="p-4 bg-slate-100 rounded-full">
                                    <Filter className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-700">No leads yet</h3>
                                <p className="text-xs text-slate-500 max-w-xs">Your pipeline is currently empty. Add leads to start tracking your sales progress.</p>
                                <Link to="/leads" className="mt-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow-sm">
                                    + Add First Lead
                                </Link>
                            </div>
                        ) : (
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sortedPipeline} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                                            dy={8}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            allowDecimals={false}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={1200} animationEasing="ease-out">
                                            {sortedPipeline.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                    {/* Pipeline legend */}
                    {!loading && pipeline.length > 0 && (
                        <div className="px-6 pb-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-50 pt-4">
                            {sortedPipeline.map(item => (
                                <div key={item.status} className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-xs text-slate-500">{item.name}</span>
                                    <span className="text-xs font-bold text-slate-700">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Upcoming Renewals List */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <CalendarDays className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Upcoming Renewals</h2>
                            <p className="text-xs text-slate-400">Next 30 days</p>
                        </div>
                    </div>
                    <div className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[360px]">

                        {loading ? (
                            <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
                        ) : renewals.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="inline-flex p-3 bg-emerald-50 rounded-full mb-3">
                                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                </div>
                                <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                                <p className="text-xs text-slate-400 mt-1">No urgent renewals in the next 30 days.</p>
                            </div>
                        ) : (
                            renewals.map((policy: any) => {
                                const urgency = getUrgencyInfo(policy.expiryDate);
                                return (
                                    <div key={policy.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => navigate(`/policies/${policy.id}`)}>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={clsx("w-2 h-2 rounded-full shrink-0", urgency.color)} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{policy.client?.name || 'Unknown Client'}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{policy.type} • {format(new Date(policy.expiryDate), 'dd MMM yyyy')}</p>
                                            </div>
                                        </div>
                                        <span className={clsx("text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ml-2", urgency.textColor, urgency.bgColor)}>
                                            {urgency.label}
                                        </span>
                                    </div>
                                );
                            })
                        )}

                    </div>
                    <div className="p-4 border-t border-slate-100 text-center">
                        <Link to="/renewals" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1">
                            View all renewals <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Recent Policies — Full Width */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <ShieldCheck className="w-4 h-4 text-slate-600" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900">Recent Policies</h2>
                    </div>
                    <Link to="/policies" className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        View all <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                <div className="overflow-hidden">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Client</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Premium</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400"><div className="flex justify-center items-center gap-2"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>Loading...</div></td></tr>
                            ) : recentPolicies.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">No policies yet.</td></tr>
                            ) : (
                                recentPolicies.map((p) => {
                                    const initials = p.client.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                                    const bgColors = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-pink-100 text-pink-700', 'bg-cyan-100 text-cyan-700', 'bg-purple-100 text-purple-700'];
                                    const colorIdx = p.client.name.charCodeAt(0) % bgColors.length;
                                    return (
                                        <tr key={p.id} className="hover:bg-blue-50/30 cursor-pointer transition-colors" onClick={() => navigate(`/policies/${p.id}`)}>
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0", bgColors[colorIdx])}>
                                                    {initials}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{p.client.name}</p>
                                                    <p className="text-xs text-slate-400">{p.client.email || p.policyNo}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-slate-900">{p.type}</p>
                                                <p className="text-xs text-slate-400">#{p.policyNo}</p>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-700">
                                                ₹{p.premium.toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={clsx("px-2.5 py-1 rounded-full text-xs font-bold",
                                                    p.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" :
                                                        p.status === 'PENDING' ? "bg-orange-100 text-orange-700" :
                                                            p.status === 'MATURITY' ? "bg-blue-100 text-blue-700" :
                                                                "bg-slate-100 text-slate-600"
                                                )}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-xs">{format(new Date(p.createdAt), 'dd MMM yyyy')}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
