import { useState, useEffect } from 'react';
import { Calendar, Activity, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

interface AuditLog {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    details: string | null;
    createdAt: string;
    user: {
        name: string;
        role: string;
        email: string;
    };
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterEntity, setFilterEntity] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchLogs();
    }, [page, filterEntity, filterAction]);

    const fetchLogs = async () => {
        setIsLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', '50');
            if (filterEntity) params.append('entityType', filterEntity);
            if (filterAction) params.append('action', filterAction);

            const response = await axios.get(`/api/audit-logs?${params.toString()}`);
            setLogs(response.data.data);
            setTotalPages(response.data.pagination.totalPages);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load audit logs');
        } finally {
            setIsLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        if (action.includes('CREATE')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-800 border-blue-200';
        if (action.includes('DELETE')) return 'bg-red-100 text-red-800 border-red-200';
        if (action.includes('IMPORT')) return 'bg-purple-100 text-purple-800 border-purple-200';
        return 'bg-slate-100 text-slate-800 border-slate-200';
    };

    const renderDetails = (detailsStr: string | null) => {
        if (!detailsStr) return <span className="text-slate-400 italic">No details</span>;
        try {
            const parsed = JSON.parse(detailsStr);
            const keys = Object.keys(parsed);
            if (keys.length === 0) return <span className="text-slate-400 italic">No details</span>;

            return (
                <div className="text-xs space-y-0.5">
                    {keys.slice(0, 3).map(k => (
                        <div key={k} className="flex gap-1 overflow-hidden">
                            <span className="font-medium text-slate-600 truncate max-w-[80px]">{k}:</span>
                            <span className="text-slate-500 truncate flex-1" title={String(parsed[k])}>{String(parsed[k])}</span>
                        </div>
                    ))}
                    {keys.length > 3 && <span className="text-slate-400 text-[10px] italic">+{keys.length - 3} more...</span>}
                </div>
            );
        } catch (e) {
            return <span className="truncate max-w-[200px]" title={detailsStr}>{detailsStr}</span>;
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Activity className="w-6 h-6 text-indigo-600" />
                        System Audit Logs
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Track cross-platform system activities and changes.
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 border border-red-100">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-sm">Failed to load logs</h4>
                        <p className="text-sm border-t border-red-200 mt-2 pt-2">{error}</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-1 w-full gap-3">
                        <select
                            value={filterEntity}
                            onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
                            className="bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-40"
                        >
                            <option value="">All Entities</option>
                            <option value="CLIENT">Clients</option>
                            <option value="POLICY">Policies</option>
                            <option value="RENEWAL">Renewals</option>
                            <option value="DOCUMENT">Documents</option>
                            <option value="PAYMENT">Payments</option>
                        </select>
                        <select
                            value={filterAction}
                            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                            className="bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-40"
                        >
                            <option value="">All Actions</option>
                            <option value="CREATE">Creates</option>
                            <option value="UPDATE">Updates</option>
                            <option value="DELETE">Deletes</option>
                            <option value="IMPORT">Imports</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4 w-48">Timestamp</th>
                                <th className="py-3 px-4">User</th>
                                <th className="py-3 px-4 text-center">Action</th>
                                <th className="py-3 px-4">Entity</th>
                                <th className="py-3 px-4 min-w-[200px]">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="relative">
                                                <div className="w-8 h-8 border-4 border-indigo-100 rounded-full animate-pulse blur-[1px]"></div>
                                                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute inset-0 mix-blend-multiply"></div>
                                            </div>
                                            <span className="font-medium animate-pulse">Loading audit trail...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-500 bg-slate-50/50">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="bg-white p-3 rounded-full shadow-sm mb-2 border border-slate-100">
                                                <Activity className="w-6 h-6 text-slate-300" />
                                            </div>
                                            <p className="font-medium">No system activity found</p>
                                            <p className="text-xs text-slate-400">Try adjusting your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{format(new Date(log.createdAt), 'MMM dd, yyyy')}</span>
                                                <span className="text-xs text-slate-400 ml-1">{format(new Date(log.createdAt), 'HH:mm')}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{log.user.name}</span>
                                                <span className="text-xs text-slate-400 truncate max-w-[150px]">{log.user.email}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-700">{log.entityType}</span>
                                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 w-max tracking-tighter mt-1" title="Entity ID">
                                                    {log.entityId.substring(0, 18)}...
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 w-1/3">
                                            <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 max-h-[80px] overflow-y-auto custom-scrollbar group-hover:bg-white transition-colors">
                                                {renderDetails(log.details)}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-500">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex gap-2 text-sm font-semibold">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
