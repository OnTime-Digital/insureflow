import { useState, useEffect } from 'react';
import axios from 'axios';
import { format, differenceInDays } from 'date-fns';
import { RefreshCcw, PhoneCall, AlertTriangle, Check, XCircle, CreditCard } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type Renewal = {
    id: string;
    dueDate: string;
    status: string;
    comment?: string;
    nextFollowUp?: string;
    lostReason?: string;
    policy: {
        id: string;
        type: string;
        policyNo: string;
        premium: number;
        client: {
            id: string;
            name: string;
            mobile: string | null;
            email: string | null;
        };
    };
};

export default function RenewalsPage() {
    const [renewals, setRenewals] = useState<Renewal[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState('month'); // today, week, month, all
    const [filterStatus, setFilterStatus] = useState('');

    const [actionModal, setActionModal] = useState<{ isOpen: boolean, renewal: Renewal | null, type: string }>({ isOpen: false, renewal: null, type: '' });
    const [actionData, setActionData] = useState({ comment: '', nextFollowUp: '', lostReason: '' });

    useAuth(); // keep auth context active

    const fetchRenewals = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterDate !== 'all') params.append('dateFilter', filterDate);
            if (filterStatus) params.append('status', filterStatus);

            const res = await axios.get(`/api/renewals?${params.toString()}`);
            setRenewals(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRenewals();
    }, [filterDate, filterStatus]);

    const handleActionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const ren = actionModal.renewal;
        if (!ren) return;

        try {
            if (actionModal.type === 'FOLLOWUP' || actionModal.type === 'CALLED') {
                // Determine new status if transitioning from NEW
                const nextStatus = actionModal.type === 'CALLED' ? 'CALLED' : ren.status;

                await axios.put(`/api/renewals/${ren.id}/status`, { status: nextStatus });
                await axios.post(`/api/renewals/${ren.id}/followup`, {
                    comment: actionData.comment,
                    nextFollowUp: actionData.nextFollowUp
                });
            } else if (actionModal.type === 'PAYMENT_PENDING' || actionModal.type === 'INTERESTED') {
                await axios.put(`/api/renewals/${ren.id}/status`, { status: actionModal.type });
                if (actionData.comment) {
                    await axios.post(`/api/renewals/${ren.id}/followup`, { comment: actionData.comment });
                }
            } else if (actionModal.type === 'LOST') {
                await axios.put(`/api/renewals/${ren.id}/status`, { status: 'LOST', lostReason: actionData.lostReason });
            }

            setActionModal({ isOpen: false, renewal: null, type: '' });
            setActionData({ comment: '', nextFollowUp: '', lostReason: '' });
            fetchRenewals();
        } catch (error) {
            console.error(error);
            alert("Action failed.");
        }
    };

    const openAction = (ren: Renewal, type: string) => {
        setActionModal({ isOpen: true, renewal: ren, type });
        setActionData({ comment: '', nextFollowUp: '', lostReason: '' });
    };

    const visibleRenewals = renewals.filter(r => filterStatus ? r.status === filterStatus : (r.status !== 'RENEWED' && r.status !== 'LOST'));

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <RefreshCcw className="w-6 h-6 text-blue-600" /> Renewals Pipeline
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Track and follow up on upcoming policy expirations.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-center">
                <select value={filterDate} onChange={e => setFilterDate(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 font-medium">
                    <option value="today">Due Today</option>
                    <option value="week">Due This Week</option>
                    <option value="month">Due This Month</option>
                    <option value="all">All Upcoming (Within 30/90d)</option>
                </select>

                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Active Pipeline (Excl. Renewed/Lost)</option>
                    <option value="NEW">New</option>
                    <option value="CALLED">Called / Contacted</option>
                    <option value="INTERESTED">Interested</option>
                    <option value="PAYMENT_PENDING">Payment Pending</option>
                    <option value="RENEWED">Renewed (Won)</option>
                    <option value="LOST">Lost</option>
                </select>

            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Client & Policy</th>
                            <th className="px-6 py-4">Status & Next Step</th>
                            <th className="px-6 py-4">Due Date</th>
                            <th className="px-6 py-4">Premium & Ref</th>
                            <th className="px-6 py-4 text-right">Pipeline Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
                        ) : visibleRenewals.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No renewals found in this pipeline view.</td></tr>
                        ) : (
                            visibleRenewals.map(ren => {
                                const daysToExpiry = differenceInDays(new Date(ren.dueDate), new Date());
                                const isOverdue = daysToExpiry < 0;

                                return (
                                    <tr key={ren.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <Link to={`/policies/${ren.policy.id}`} className="font-bold text-blue-600 hover:underline text-base">
                                                {ren.policy.client.name}
                                            </Link>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                <span>{ren.policy.type}</span> &bull; <span className="font-mono">{ren.policy.policyNo}</span>
                                            </div>
                                            <div className="text-xs font-medium text-slate-600 mt-0.5">{ren.policy.client.mobile}</div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase shadow-sm border",
                                                    ren.status === 'NEW' ? "bg-slate-100 text-slate-600 border-slate-200" :
                                                        ren.status === 'CALLED' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                            ren.status === 'INTERESTED' ? "bg-purple-50 text-purple-700 border-purple-200" :
                                                                ren.status === 'PAYMENT_PENDING' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                                    "bg-slate-100 text-slate-700"
                                                )}>
                                                    {ren.status.replace('_', ' ')}
                                                </span>
                                                {ren.nextFollowUp && (
                                                    <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" /> Follow-up {format(new Date(ren.nextFollowUp), 'MMM dd')}
                                                    </span>
                                                )}
                                                {!ren.nextFollowUp && ren.comment && (
                                                    <span className="text-xs text-slate-400 truncate max-w-[200px]" title={ren.comment}>Last: {ren.comment}</span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className={clsx("font-semibold", isOverdue ? "text-red-600" : "text-slate-800")}>
                                                {format(new Date(ren.dueDate), 'dd MMM yyyy')}
                                            </div>
                                            <div className="text-xs mt-0.5">
                                                {isOverdue ? <span className="font-bold text-red-500">Overdue {-daysToExpiry}d</span> :
                                                    daysToExpiry === 0 ? <span className="font-bold text-orange-500">DUE TODAY</span> :
                                                        <span className="text-slate-500">In {daysToExpiry}d</span>
                                                }
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-900">₹{ren.policy.premium.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button onClick={() => openAction(ren, 'CALLED')} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Log Call / Note">
                                                    <PhoneCall className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => openAction(ren, 'FOLLOWUP')} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Schedule Follow-up">
                                                    <AlertTriangle className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => openAction(ren, 'PAYMENT_PENDING')} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Mark Payment Pending">
                                                    <CreditCard className="w-4 h-4" />
                                                </button>
                                                <Link to={`/policies/${ren.policy.id}`} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm border border-emerald-100 ml-2" title="Go to Policy to Mark Renewed">
                                                    <Check className="w-3.5 h-3.5" /> Renew
                                                </Link>
                                                <button onClick={() => openAction(ren, 'LOST')} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1" title="Mark as Lost">
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Action Dialog */}
            {actionModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">
                                {actionModal.type === 'CALLED' ? 'Log Call' :
                                    actionModal.type === 'FOLLOWUP' ? 'Schedule Follow-up' :
                                        actionModal.type === 'PAYMENT_PENDING' ? 'Set Payment Pending' :
                                            actionModal.type === 'LOST' ? 'Mark as Lost' : 'Action'}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">For {actionModal.renewal?.policy.client.name} - {actionModal.renewal?.policy.policyNo}</p>
                        </div>

                        <form onSubmit={handleActionSubmit} className="p-5 space-y-4 bg-slate-50/50">
                            {actionModal.type === 'LOST' ? (
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700">Reason for Losing <span className="text-red-500">*</span></label>
                                    <textarea required value={actionData.lostReason} onChange={e => setActionData({ ...actionData, lostReason: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500/20" rows={3} placeholder="Price too high, went to competitor..." />
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-slate-700">Comment / Remarks {actionModal.type === 'PAYMENT_PENDING' ? '(Optional)' : '*'}</label>
                                        <textarea required={actionModal.type !== 'PAYMENT_PENDING'} value={actionData.comment} onChange={e => setActionData({ ...actionData, comment: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20" rows={2} placeholder="Summary of conversation..." />
                                    </div>
                                    {(actionModal.type === 'FOLLOWUP' || actionModal.type === 'CALLED') && (
                                        <div className="space-y-1">
                                            <label className="text-sm font-semibold text-slate-700">Next Follow-up Date (Optional)</label>
                                            <input type="date" value={actionData.nextFollowUp} onChange={e => setActionData({ ...actionData, nextFollowUp: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" min={format(new Date(), 'yyyy-MM-dd')} />
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setActionModal({ isOpen: false, renewal: null, type: '' })} className="flex-1 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-xl font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                                <button type="submit" className={clsx("flex-1 py-2.5 text-white rounded-xl font-bold shadow-sm transition-colors",
                                    actionModal.type === 'LOST' ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                                )}>Save Action</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
