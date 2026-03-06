import { useEffect, useState } from 'react';
import {
    ShieldCheck, Users, TrendingUp,
    IndianRupee, BarChart3, PieChart, ArrowUpRight
} from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

type PolicyByType = {
    type: string;
    _count: number;
    _sum: { premium: number | null };
};

type ReportsData = {
    policyByType: PolicyByType[];
    totalPremium: number;
    totalPremiumPaid: number;
    totalPolicies: number;
    activePolicies: number;
    totalClients: number;
    totalLeads: number;
    closedWon: number;
    closedLost: number;
    conversionRate: number;
    monthlyPremium: Record<string, number>;
};

const PIPELINE_STATUSES = ['NEW', 'CONTACTED', 'QUOTE_SENT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
const PIPELINE_COLORS: Record<string, string> = {
    'NEW': 'bg-blue-500',
    'CONTACTED': 'bg-purple-500',
    'QUOTE_SENT': 'bg-orange-500',
    'NEGOTIATION': 'bg-yellow-500',
    'CLOSED_WON': 'bg-emerald-500',
    'CLOSED_LOST': 'bg-red-500',
};
const PIPELINE_BG: Record<string, string> = {
    'NEW': 'bg-blue-100 text-blue-700',
    'CONTACTED': 'bg-purple-100 text-purple-700',
    'QUOTE_SENT': 'bg-orange-100 text-orange-700',
    'NEGOTIATION': 'bg-yellow-100 text-yellow-700',
    'CLOSED_WON': 'bg-emerald-100 text-emerald-700',
    'CLOSED_LOST': 'bg-red-100 text-red-700',
};

const TYPE_COLORS: Record<string, string> = {
    'Life': 'bg-blue-500',
    'Health': 'bg-emerald-500',
    'Vehicle': 'bg-orange-500',
    'Home': 'bg-purple-500',
    'Other': 'bg-slate-400',
    'Other_Gen': 'bg-slate-400',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ReportsPage() {
    const [data, setData] = useState<ReportsData | null>(null);
    const [pipeline, setPipeline] = useState<{ status: string; _count: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const [reportsRes, pipelineRes] = await Promise.all([
                    axios.get('/api/dashboard/reports'),
                    axios.get('/api/dashboard/pipeline'),
                ]);
                setData(reportsRes.data);
                setPipeline(pipelineRes.data);
            } catch (error) {
                console.error("Error fetching reports:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto flex items-center justify-center py-32">
                <div className="flex items-center gap-3 text-slate-500">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Loading analytics...
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="max-w-7xl mx-auto text-center py-32 text-slate-500">
                Failed to load reports data.
            </div>
        );
    }

    // Prepare monthly data
    const monthlyEntries = Object.entries(data.monthlyPremium).sort(([a], [b]) => a.localeCompare(b));
    const maxMonthly = Math.max(...monthlyEntries.map(([, v]) => v), 1);

    // Prepare policy type data

    // Pipeline data
    const sortedPipeline = PIPELINE_STATUSES.map(status => {
        const item = pipeline.find(p => p.status === status);
        return { status, count: item?._count || 0 };
    });
    const totalPipelineLeads = sortedPipeline.reduce((s, p) => s + p.count, 0);

    const collectionRate = data.totalPremium > 0 ? Math.round((data.totalPremiumPaid / data.totalPremium) * 100) : 0;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales Reports</h1>
                    <p className="text-sm text-slate-500 mt-1">Analyze your performance, revenue growth, and pipeline health.</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Premium Revenue */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow-lg shadow-blue-600/20">
                    <div className="flex items-center justify-between mb-3">
                        <IndianRupee className="w-5 h-5 opacity-80" />
                        <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                    <p className="text-sm font-medium opacity-80">Total Premium Revenue</p>
                    <h3 className="text-2xl font-bold mt-1">₹{data.totalPremium.toLocaleString('en-IN')}</h3>
                    <div className="mt-3 text-xs opacity-70">
                        Collected: ₹{data.totalPremiumPaid.toLocaleString('en-IN')} ({collectionRate}%)
                    </div>
                </div>

                {/* Active Policies */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <ArrowUpRight className="w-3 h-3" />
                            {data.totalPolicies > 0 ? Math.round((data.activePolicies / data.totalPolicies) * 100) : 0}%
                        </span>
                    </div>
                    <p className="text-sm font-medium text-slate-500">Active Policies</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{data.activePolicies}<span className="text-sm font-normal text-slate-400 ml-1">/ {data.totalPolicies}</span></h3>
                </div>

                {/* Total Clients */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <Users className="w-5 h-5 text-purple-600" />
                        </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500">Total Clients</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{data.totalClients}</h3>
                </div>

                {/* Lead Conversion */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-orange-600" />
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-orange-600">
                            {data.closedWon} won
                        </span>
                    </div>
                    <p className="text-sm font-medium text-slate-500">Lead Conversion Rate</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{data.conversionRate}%<span className="text-sm font-normal text-slate-400 ml-1">of {data.totalLeads}</span></h3>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Policy Distribution by Type */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-slate-400" />
                            Policies by Type
                        </h2>
                        <span className="text-sm text-slate-400">{data.totalPolicies} total</span>
                    </div>
                    <div className="p-5 space-y-4">
                        {data.policyByType.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">No policy data yet.</p>
                        ) : (
                            data.policyByType.map(item => {
                                const pct = Math.round((item._count / data.totalPolicies) * 100);
                                return (
                                    <div key={item.type} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className={clsx("w-3 h-3 rounded-sm", TYPE_COLORS[item.type] || 'bg-slate-400')}></div>
                                                <span className="font-medium text-slate-700">{item.type}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-slate-500">{item._count} policies</span>
                                                <span className="font-semibold text-slate-700 w-12 text-right">{pct}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={clsx("h-full rounded-full transition-all duration-700", TYPE_COLORS[item.type] || 'bg-slate-400')}
                                                style={{ width: `${pct}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-xs text-slate-400 text-right">
                                            ₹{(item._sum.premium || 0).toLocaleString('en-IN')} premium
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Lead Pipeline Funnel */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-slate-400" />
                            Lead Pipeline Breakdown
                        </h2>
                        <span className="text-sm text-slate-400">{totalPipelineLeads} leads</span>
                    </div>
                    <div className="p-5 space-y-3">
                        {sortedPipeline.map(item => {
                            const pct = totalPipelineLeads > 0 ? Math.round((item.count / totalPipelineLeads) * 100) : 0;
                            return (
                                <div key={item.status} className="flex items-center gap-3">
                                    <span className={clsx("text-xs font-bold px-2.5 py-1 rounded-md w-28 text-center shrink-0", PIPELINE_BG[item.status])}>
                                        {item.status.replace(/_/g, ' ')}
                                    </span>
                                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={clsx("h-full rounded-full transition-all duration-700", PIPELINE_COLORS[item.status])}
                                            style={{ width: `${Math.max(pct, item.count > 0 ? 3 : 0)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 w-8 text-right">{item.count}</span>
                                    <span className="text-xs text-slate-400 w-10 text-right">{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Monthly Premium Collection */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-5 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-slate-400" />
                        Monthly Premium Collection
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">New policies created per month (last 6 months)</p>
                </div>
                <div className="p-6">
                    {monthlyEntries.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-8">No monthly data available yet.</p>
                    ) : (
                        <div className="h-56 flex items-end gap-3 justify-between">
                            {monthlyEntries.map(([key, value]) => {
                                const heightPct = (value / maxMonthly) * 100;
                                const [year, month] = key.split('-');
                                const monthLabel = MONTH_NAMES[parseInt(month) - 1] || month;
                                return (
                                    <div key={key} className="flex flex-col items-center gap-2 flex-1 min-w-[40px]">
                                        <span className="text-xs font-bold text-slate-700">₹{(value / 1000).toFixed(0)}k</span>
                                        <div
                                            className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-700 min-h-[4px] shadow-sm"
                                            style={{ height: `${Math.max(heightPct, 3)}%` }}
                                        ></div>
                                        <div className="text-center">
                                            <span className="text-xs font-medium text-slate-600 block">{monthLabel}</span>
                                            <span className="text-[10px] text-slate-400">{year}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
