import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { IndianRupee, Search, Filter, CheckCircle, Clock, X } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

type Commission = {
    id: string;
    policyId: string;
    referenceId: string;
    premium: number;
    type: string;
    rate: number | null;
    amount: number;
    status: string;
    receivedDate: string | null;
    paidOutDate: string | null;
    remarks: string | null;
    createdAt: string;
    policy: {
        policyNo: string;
        type: string;
        insurer: string;
        premium: number;
        client: { name: string };
    };
    reference: {
        name: string;
        type: string;
    };
};

export default function CommissionsPage() {
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterReferenceType, setFilterReferenceType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [statusModal, setStatusModal] = useState<{ isOpen: boolean, commission: Commission | null }>({ isOpen: false, commission: null });
    const [statusData, setStatusData] = useState({ status: '', remarks: '' });

    const fetchCommissions = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterStatus) params.append('status', filterStatus);

            const res = await axios.get(`/api/commissions?${params.toString()}`);
            setCommissions(res.data);
        } catch (error) {
            console.error('Error fetching commissions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCommissions();
    }, [filterStatus]);

    const handleStatusUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!statusModal.commission || !statusData.status) return;

        try {
            await axios.put(`/api/commissions/${statusModal.commission.id}/status`, statusData);
            setStatusModal({ isOpen: false, commission: null });
            fetchCommissions();
        } catch (error) {
            console.error('Failed to update status', error);
            alert("Failed to update status.");
        }
    };

    const openStatusModal = (comm: Commission) => {
        setStatusModal({ isOpen: true, commission: comm });
        setStatusData({ status: comm.status, remarks: comm.remarks || '' });
    };

    const filteredCommissions = commissions.filter((c: Commission) => {
        const matchesType = filterReferenceType ? c.reference.type === filterReferenceType : true;
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = c.policy.client.name.toLowerCase().includes(searchLower) ||
            c.policy.policyNo.toLowerCase().includes(searchLower) ||
            c.reference.name.toLowerCase().includes(searchLower);
        return matchesType && matchesSearch;
    });

    const totalCalculated = filteredCommissions.reduce((acc: number, curr: Commission) => acc + curr.amount, 0);
    const totalPaidOut = filteredCommissions.filter((c: Commission) => c.status === 'PAID_OUT').reduce((acc: number, curr: Commission) => acc + curr.amount, 0);
    const totalPending = filteredCommissions.filter((c: Commission) => c.status === 'PENDING').reduce((acc: number, curr: Commission) => acc + curr.amount, 0);

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <IndianRupee className="w-6 h-6 text-emerald-600" /> Commissions
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Track and manage commissions from insurers and payouts to referrers.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <IndianRupee className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Total Calculated</div>
                        <div className="text-2xl font-bold text-slate-900">₹{totalCalculated.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Pending Receipt/Payout</div>
                        <div className="text-2xl font-bold text-slate-900">₹{totalPending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Total Paid Out</div>
                        <div className="text-2xl font-bold text-slate-900">₹{totalPaidOut.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by client, policy no, or referrer..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                    />
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none shadow-sm font-medium"
                        >
                            <option value="">Status: All</option>
                            <option value="PENDING">Pending</option>
                            <option value="RECEIVED">Received from Insurer</option>
                            <option value="PAID_OUT">Paid to Referrer</option>
                        </select>
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                            value={filterReferenceType}
                            onChange={e => setFilterReferenceType(e.target.value)}
                            className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none shadow-sm font-medium"
                        >
                            <option value="">Referrer Type: All</option>
                            <option value="EMPLOYEE">Employees</option>
                            <option value="AGENT">Agents</option>
                            <option value="CLIENT">Clients</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Policy & Client</th>
                                <th className="px-4 py-3">Referrer</th>
                                <th className="px-4 py-3">Premium</th>
                                <th className="px-4 py-3">Commission</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right w-[100px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            Loading commissions...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCommissions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <IndianRupee className="w-8 h-8 text-slate-300" />
                                            <p>No commissions found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCommissions.map((comm: Commission) => (
                                    <tr key={comm.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <Link to={`/policies/${comm.policyId}`} className="font-bold text-blue-600 hover:underline">
                                                {comm.policy.client.name}
                                            </Link>
                                            <div className="text-xs text-slate-500 mt-0.5">{comm.policy.type} &bull; {comm.policy.policyNo}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">{comm.policy.insurer}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-800">{comm.reference.name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{comm.reference.type}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-900">₹{comm.premium.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                            <div className="text-xs font-medium text-slate-500 mt-0.5">
                                                {comm.type === 'PERCENT' ? `${comm.rate}%` : `Flat ₹${comm.rate}`}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-emerald-600 text-base">₹{comm.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={clsx("px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase border",
                                                comm.status === 'PENDING' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                    comm.status === 'RECEIVED' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                        "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            )}>
                                                {comm.status.replace('_', ' ')}
                                            </span>
                                            {comm.status !== 'PENDING' && (
                                                <div className="text-[10px] text-slate-500 mt-1.5 font-medium">
                                                    {comm.status === 'RECEIVED' ? 'Received: ' : 'Paid: '}
                                                    {format(new Date(comm.status === 'RECEIVED' ? comm.receivedDate! : comm.paidOutDate!), 'dd MMM yyyy')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right w-[100px]">
                                            <button
                                                onClick={() => openStatusModal(comm)}
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                            >
                                                Update Status
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Status Update Modal */}
            {statusModal.isOpen && statusModal.commission && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Update Commission Status</h3>
                                <p className="text-sm text-slate-500 mt-0.5">{statusModal.commission.policy.client.name} - ₹{statusModal.commission.amount.toLocaleString('en-IN')}</p>
                            </div>
                            <button onClick={() => setStatusModal({ isOpen: false, commission: null })} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleStatusUpdate} className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">Status</label>
                                <select
                                    value={statusData.status}
                                    onChange={e => setStatusData({ ...statusData, status: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none font-medium"
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="RECEIVED">Received from Insurer</option>
                                    <option value="PAID_OUT">Paid Out to Referrer</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Remarks (Optional)</label>
                                <textarea
                                    value={statusData.remarks}
                                    onChange={e => setStatusData({ ...statusData, remarks: e.target.value })}
                                    rows={3}
                                    placeholder="Add any payment reference numbers or notes..."
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setStatusModal({ isOpen: false, commission: null })} className="flex-1 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-xl font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-sm transition-colors">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
