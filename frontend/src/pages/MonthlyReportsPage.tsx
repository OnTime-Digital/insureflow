import { useState, useEffect } from 'react';
import {
    Calendar, Download, FileSpreadsheet, TrendingUp,
    Users, ShieldCheck, Clock, IndianRupee
} from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';
import { format, subMonths } from 'date-fns';

type MonthlyData = {
    month: string;
    summary: {
        newPoliciesCount: number;
        totalPremium: number;
        totalPremiumPaid: number;
        newClientsCount: number;
        newLeadsCount: number;
        leadsConverted: number;
        renewalsDue: number;
        renewalsCompleted: number;
        renewalsLost: number;
        totalCommission: number;
        commissionReceived: number;
        commissionPending: number;
    };
    policyByType: Record<string, { count: number; premium: number }>;
    policies: any[];
};

export default function MonthlyReportsPage() {
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [data, setData] = useState<MonthlyData | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = async (month: string) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/monthly-reports?month=${month}`);
            setData(res.data);
        } catch (err) {
            console.error('Error fetching report:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(selectedMonth); }, [selectedMonth]);

    const handleExport = async () => {
        try {
            const res = await axios.get(`/api/monthly-reports/export?month=${selectedMonth}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `monthly_report_${selectedMonth}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    // Generate month options (current + past 12 months)
    const monthOptions = Array.from({ length: 13 }, (_, i) => {
        const d = subMonths(new Date(), i);
        return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
    });

    const s = data?.summary;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Monthly Reports</h1>
                    <p className="text-sm text-slate-500 mt-1">Generate and export monthly business summaries.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
                        >
                            {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={() => handleExport()}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64 gap-2 text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Generating report...
                </div>
            ) : s ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-semibold text-slate-400 uppercase">New Policies</span>
                            </div>
                            <p className="text-2xl font-extrabold text-slate-900">{s.newPoliciesCount}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <IndianRupee className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-semibold text-slate-400 uppercase">Premium</span>
                            </div>
                            <p className="text-2xl font-extrabold text-emerald-700">₹{s.totalPremium.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-violet-500" />
                                <span className="text-xs font-semibold text-slate-400 uppercase">New Clients</span>
                            </div>
                            <p className="text-2xl font-extrabold text-slate-900">{s.newClientsCount}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-orange-500" />
                                <span className="text-xs font-semibold text-slate-400 uppercase">Renewals Due</span>
                            </div>
                            <p className="text-2xl font-extrabold text-slate-900">{s.renewalsDue}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{s.renewalsCompleted} completed • {s.renewalsLost} lost</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-cyan-500" />
                                <span className="text-xs font-semibold text-slate-400 uppercase">Leads</span>
                            </div>
                            <p className="text-2xl font-extrabold text-slate-900">{s.newLeadsCount}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{s.leadsConverted} converted</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <IndianRupee className="w-4 h-4 text-amber-500" />
                                <span className="text-xs font-semibold text-slate-400 uppercase">Commission</span>
                            </div>
                            <p className="text-2xl font-extrabold text-amber-700">₹{s.totalCommission.toLocaleString('en-IN')}</p>
                            <p className="text-xs text-slate-400 mt-0.5">₹{s.commissionReceived.toLocaleString('en-IN')} received</p>
                        </div>
                    </div>

                    {/* Policy Type Breakdown */}
                    {data.policyByType && Object.keys(data.policyByType).length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <h2 className="text-base font-bold text-slate-900 mb-4">Policy Type Breakdown</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {Object.entries(data.policyByType).map(([type, info]) => (
                                    <div key={type} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <p className="text-sm font-bold text-slate-700">{type}</p>
                                        <p className="text-xl font-extrabold text-slate-900 mt-1">{info.count}</p>
                                        <p className="text-xs text-slate-400">₹{info.premium.toLocaleString('en-IN')} premium</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Policies Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                                <h2 className="text-base font-bold text-slate-900">Policies Created This Month</h2>
                            </div>
                            <span className="text-xs font-bold text-slate-400">{data.policies.length} policies</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Policy No</th>
                                        <th className="px-6 py-3">Client</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Insurer</th>
                                        <th className="px-6 py-3">Premium</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.policies.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No policies created this month.</td></tr>
                                    ) : data.policies.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-3 font-mono text-xs text-slate-600">{p.policyNo}</td>
                                            <td className="px-6 py-3 font-semibold text-slate-900">{p.clientName || '—'}</td>
                                            <td className="px-6 py-3">{p.type}</td>
                                            <td className="px-6 py-3">{p.insurer}</td>
                                            <td className="px-6 py-3 font-semibold">₹{p.premium.toLocaleString('en-IN')}</td>
                                            <td className="px-6 py-3">
                                                <span className={clsx("px-2 py-0.5 rounded-full text-xs font-bold",
                                                    p.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" :
                                                        p.status === 'EXPIRED' ? "bg-red-100 text-red-700" :
                                                            "bg-slate-100 text-slate-600"
                                                )}>{p.status}</span>
                                            </td>
                                            <td className="px-6 py-3 text-xs text-slate-400">{format(new Date(p.createdAt), 'dd MMM yyyy')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-12 text-slate-400">Select a month to generate the report.</div>
            )}
        </div>
    );
}
