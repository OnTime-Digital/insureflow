import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft, User, Calendar, IndianRupee,
    FileText, Activity, AlertTriangle, Plus, Edit, Trash2,
    Check, Download, Eye
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import clsx from 'clsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5005';

const getDocUrl = (url: string) => {
    if (!url) return '#';
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

type PolicyData = any;

export default function PolicyDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [policy, setPolicy] = useState<PolicyData>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'renewals' | 'payments' | 'commissions'>('overview');

    // Hardcoded role for Phase 6 implementation. In production, this comes from an Auth Context.
    const CURRENT_USER_ROLE = 'ADMIN';

    // Modals & Actions state
    const [isAddingDoc, setIsAddingDoc] = useState(false);
    const [isAddingPayment, setIsAddingPayment] = useState(false);
    const [isMarkingRenewed, setIsMarkingRenewed] = useState<{ renewalId: string } | null>(null);

    // Form states
    const [docForm, setDocForm] = useState({ type: 'Policy PDF', url: '', visibility: 'INTERNAL', file: null as File | null });
    const [paymentForm, setPaymentForm] = useState({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), mode: 'UPI', note: '' });
    const [renewForm, setRenewForm] = useState({ newExpiryDate: '', newPremium: '', remark: '' });

    const fetchPolicy = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/policies/${id}`);
            setPolicy(res.data);

            // Default renew form
            if (res.data) {
                const nextExp = new Date(res.data.expiryDate);
                nextExp.setFullYear(nextExp.getFullYear() + 1);
                setRenewForm({
                    newExpiryDate: format(nextExp, 'yyyy-MM-dd'),
                    newPremium: res.data.premium.toString(),
                    remark: 'Standard Renewal'
                });
            }
        } catch (error) {
            console.error("Error fetching policy", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicy();
    }, [id]);

    const handleUploadDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let finalUrl = docForm.url;
            if (docForm.file) {
                const fd = new FormData();
                fd.append('document', docForm.file);
                const uploadRes = await axios.post('/api/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                finalUrl = uploadRes.data.url;
            }

            if (!finalUrl) return alert("Please provide a file or URL");

            await axios.post('/api/policy-documents', {
                policyId: id,
                type: docForm.type,
                url: finalUrl,
                visibility: docForm.visibility
            });
            setIsAddingDoc(false);
            setDocForm({ type: 'Policy PDF', url: '', visibility: 'INTERNAL', file: null });
            fetchPolicy();
        } catch (error) {
            console.error(error);
            alert("Upload failed");
        }
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/payments', {
                policyId: id,
                amount: parseFloat(paymentForm.amount),
                date: paymentForm.date,
                mode: paymentForm.mode,
                note: paymentForm.note
            });
            setIsAddingPayment(false);
            setPaymentForm({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), mode: 'UPI', note: '' });
            fetchPolicy();
        } catch (error) {
            console.error(error);
            alert("Payment failed");
        }
    };

    const handleMarkRenewed = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isMarkingRenewed) return;
        try {
            await axios.post(`/api/renewals/${isMarkingRenewed.renewalId}/renew`, renewForm);
            setIsMarkingRenewed(null);
            fetchPolicy();
        } catch (error) {
            console.error(error);
            alert("Renewal failed");
        }
    };

    const handleDeleteDoc = async (docId: string) => {
        if (!window.confirm("Delete this document?")) return;
        try {
            await axios.delete(`/api/policy-documents/${docId}`);
            fetchPolicy();
        } catch (e) { }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading policy details...</div>;
    }

    if (!policy) {
        return <div className="p-8 text-center text-red-500 font-bold">Policy not found</div>;
    }

    const daysToExpiry = differenceInDays(new Date(policy.expiryDate), new Date());
    const isExpired = daysToExpiry < 0;
    const isDueSoon = daysToExpiry <= 30 && daysToExpiry >= 0;

    let extrasObj = {};
    try {
        if (policy.extras) extrasObj = typeof policy.extras === 'string' ? JSON.parse(policy.extras) : policy.extras;
    } catch (e) { }

    return (
        <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/policies')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{policy.policyNo || 'Unnumbered Policy'}</h1>
                            <span className={clsx("px-2 py-0.5 rounded text-xs font-bold",
                                policy.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" :
                                    policy.status === 'EXPIRED' ? "bg-red-100 text-red-700" :
                                        policy.status === 'MATURITY' ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-700"
                            )}>
                                {policy.status}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                            <span>{policy.type} Insurance</span> &bull; <span>{policy.insurer}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link to={`/policies/edit/${id}`} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl bg-white hover:bg-slate-50 text-sm font-semibold shadow-sm flex items-center gap-2">
                        <Edit className="w-4 h-4" /> Edit
                    </Link>
                </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-center shadow-sm">
                    <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1.5"><User className="w-4 h-4" /> Client</div>
                    <Link to={`/clients/${policy.clientId}`} className="text-lg font-bold text-blue-600 hover:underline">{policy.client.name}</Link>
                    <div className="text-xs text-slate-400 mt-0.5">{policy.client.mobile || policy.client.email}</div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-center shadow-sm">
                    <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Expiry Date</div>
                    <div className="text-lg font-bold text-slate-900">{format(new Date(policy.expiryDate), 'dd MMM yyyy')}</div>
                    <div className="text-xs mt-0.5 font-medium">
                        {isExpired ? <span className="text-red-500">Expired {Math.abs(daysToExpiry)} days ago</span> :
                            isDueSoon ? <span className="text-orange-500">Due in {daysToExpiry} days</span> :
                                <span className="text-emerald-500">Active ({daysToExpiry} days left)</span>}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-center shadow-sm">
                    <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1.5"><IndianRupee className="w-4 h-4" /> Annual Premium</div>
                    <div className="text-lg font-bold text-slate-900">₹{policy.premium.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Start: {format(new Date(policy.startDate), 'dd MMM yyyy')}</div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-center shadow-sm">
                    <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1.5"><Activity className="w-4 h-4" /> Payment Status</div>
                    <div className={clsx("text-lg font-bold",
                        policy.paymentStatus === 'PAID' ? "text-emerald-600" :
                            policy.paymentStatus === 'PARTIAL' ? "text-orange-500" : "text-red-600"
                    )}>
                        {policy.paymentStatus}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                        Paid: ₹{(policy.premiumPaid || 0).toLocaleString('en-IN')} / Balance: ₹{(policy.premium - (policy.premiumPaid || 0)).toLocaleString('en-IN')}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="flex gap-6 overflow-x-auto custom-scrollbar">
                    {['overview', 'documents', 'renewals', 'payments', ...(CURRENT_USER_ROLE === 'ADMIN' ? ['commissions'] : [])].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={clsx(
                                "pb-3 text-sm font-semibold transition-colors capitalize border-b-2 whitespace-nowrap",
                                activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                            )}
                        >
                            {tab}
                            {tab === 'documents' && <span className="ml-2 bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">{policy.policyDocuments?.length || 0}</span>}
                            {tab === 'renewals' && <span className="ml-2 bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">{policy.renewals?.length || 0}</span>}
                            {tab === 'payments' && <span className="ml-2 bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">{policy.payments?.length || 0}</span>}
                            {tab === 'commissions' && <span className="ml-2 bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">{policy.commissions?.length || 0}</span>}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 min-h-[400px] shadow-sm">

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in fade-in">
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Policy Structure</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div><div className="text-xs text-slate-500 mb-1">Insurer</div><div className="font-semibold text-slate-800">{policy.insurer}</div></div>
                                <div><div className="text-xs text-slate-500 mb-1">Type</div><div className="font-semibold text-slate-800">{policy.type}</div></div>
                                <div><div className="text-xs text-slate-500 mb-1">Start Date</div><div className="font-semibold text-slate-800">{format(new Date(policy.startDate), 'PP')}</div></div>
                                <div><div className="text-xs text-slate-500 mb-1">End Date</div><div className="font-semibold text-slate-800">{format(new Date(policy.expiryDate), 'PP')}</div></div>

                                {policy.type === 'Life' && policy.earnedPremium !== null && (
                                    <div><div className="text-xs text-slate-500 mb-1">Earned Premium (EP)</div><div className="font-semibold text-emerald-600">₹{policy.earnedPremium?.toLocaleString('en-IN')}</div></div>
                                )}

                                {policy.premiumMode && (
                                    <div><div className="text-xs text-slate-500 mb-1">Premium Mode</div><div className="font-semibold text-slate-800">{policy.premiumMode.replace(/_/g, ' ')}</div></div>
                                )}

                                {policy.ppt && (
                                    <div><div className="text-xs text-slate-500 mb-1">PPT (Premium Pay Terms)</div><div className="font-semibold text-slate-800">{policy.ppt} Years</div></div>
                                )}

                                {policy.pt && (
                                    <div><div className="text-xs text-slate-500 mb-1">PT (Policy Terms)</div><div className="font-semibold text-slate-800">{policy.pt} Years</div></div>
                                )}

                                {policy.epAmount && (
                                    <div><div className="text-xs text-slate-500 mb-1">EP Amount</div><div className="font-semibold text-emerald-600">₹{policy.epAmount?.toLocaleString('en-IN')}</div></div>
                                )}

                                {policy.assignedUser && (
                                    <div className="col-span-1">
                                        <div className="text-xs text-slate-500 mb-1">Assigned To</div>
                                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                                            <User className="w-4 h-4 text-slate-400" />
                                            {policy.assignedUser.name}
                                        </div>
                                    </div>
                                )}

                                {policy.reference && (
                                    <div className="col-span-2 md:col-span-3">
                                        <div className="text-xs text-slate-500 mb-1">Referred By</div>
                                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                                            <User className="w-4 h-4 text-slate-400" />
                                            {policy.reference.name} <span className="text-slate-500 font-normal">({policy.reference.type})</span>
                                            {policy.reference.code && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">{policy.reference.code}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {Object.keys(extrasObj).length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">{policy.type} Specifics</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {policy.vehicleNo && <div><div className="text-xs text-slate-500 mb-1">Vehicle No</div><div className="font-mono font-bold text-slate-800">{policy.vehicleNo}</div></div>}
                                    {Object.entries(extrasObj).map(([k, v]) => (
                                        <div key={k}><div className="text-xs text-slate-500 mb-1 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</div><div className="font-semibold text-slate-800">{String(v)}</div></div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {policy.notes && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Internal Notes</h3>
                                <p className="text-slate-700 bg-amber-50/50 p-4 border border-amber-100 rounded-lg text-sm whitespace-pre-wrap">{policy.notes}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* DOCUMENTS TAB */}
                {activeTab === 'documents' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Attached Documents</h3>
                            <button onClick={() => setIsAddingDoc(!isAddingDoc)} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1.5">
                                <Plus className="w-4 h-4" /> Add File
                            </button>
                        </div>

                        {isAddingDoc && (
                            <form onSubmit={handleUploadDocument} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-end animate-in slide-in-from-top-2">
                                <label className="space-y-1 flex-1 min-w-[150px]">
                                    <span className="text-xs font-semibold text-slate-700">Type</span>
                                    <select value={docForm.type} onChange={e => setDocForm({ ...docForm, type: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20">
                                        <option>Policy PDF</option><option>RC Book</option><option>PAN Card</option><option>Aadhaar</option><option>Proposal Form</option><option>Other</option>
                                    </select>
                                </label>
                                <label className="space-y-1 flex-[2] min-w-[200px]">
                                    <span className="text-xs font-semibold text-slate-700">File or Link URL</span>
                                    <div className="flex gap-2">
                                        <input type="file" onChange={e => setDocForm({ ...docForm, file: e.target.files?.[0] || null })} className="max-w-[160px] text-sm text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 bg-white border border-slate-200 rounded-md" />
                                        <input type="url" placeholder="https://..." value={docForm.url} onChange={e => setDocForm({ ...docForm, url: e.target.value })} className="flex-1 w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                </label>
                                <button type="submit" className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors">Upload</button>
                                <button type="button" onClick={() => setIsAddingDoc(false)} className="px-3 py-2 text-slate-500 text-sm font-semibold hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                            </form>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {policy.policyDocuments?.map((doc: any) => (
                                <div key={doc.id} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-3 group hover:border-blue-300 transition-colors bg-white">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FileText className="w-5 h-5" /></div>
                                            <div>
                                                <div className="font-semibold text-slate-800 text-sm">{doc.type || doc.customTags || 'Document'}</div>
                                                <div className="text-xs text-slate-400">{doc.createdAt ? format(new Date(doc.createdAt), 'PP') : ''}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteDoc(doc.id)} className="text-slate-400 hover:text-red-500 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    <div className="flex gap-2">
                                        <a href={getDocUrl(doc.url)} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2 bg-slate-50 hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-200 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
                                            <Eye className="w-3.5 h-3.5" /> View
                                        </a>
                                        <a href={getDocUrl(doc.url)} download className="flex-1 text-center py-2 bg-slate-50 hover:bg-emerald-50 text-emerald-600 border border-slate-200 hover:border-emerald-200 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
                                            <Download className="w-3.5 h-3.5" /> Download
                                        </a>
                                    </div>
                                </div>
                            ))}
                            {policy.policyDocuments?.length === 0 && <div className="col-span-full py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">No documents found.</div>}
                        </div>
                    </div>
                )}

                {/* PAYMENTS TAB */}
                {activeTab === 'payments' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Payment Ledger</h3>
                                <p className="text-sm text-slate-500">Total Premium: ₹{policy.premium} | Paid: ₹{policy.premiumPaid || 0} | Due: ₹{policy.premium - (policy.premiumPaid || 0)}</p>
                            </div>
                            {policy.paymentStatus !== 'PAID' && (
                                <button onClick={() => setIsAddingPayment(!isAddingPayment)} className="text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1.5 border border-emerald-100">
                                    <Plus className="w-4 h-4" /> Record Payment
                                </button>
                            )}
                        </div>

                        {isAddingPayment && (
                            <form onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 items-end animate-in slide-in-from-top-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Amount (₹)</label>
                                    <input required type="number" min="1" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Date</label>
                                    <input required type="date" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Mode</label>
                                    <select value={paymentForm.mode} onChange={e => setPaymentForm({ ...paymentForm, mode: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                                        <option>UPI</option><option>Bank Transfer</option><option>Cash</option><option>Cheque</option><option>Card</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Reference / Note</label>
                                    <input type="text" value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Ref No..." />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="w-full py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">Save</button>
                                    <button type="button" onClick={() => setIsAddingPayment(false)} className="w-full py-2 border border-slate-200 bg-white text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
                                </div>
                            </form>
                        )}

                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                                    <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Mode</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3">Ref/Note</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {policy.payments?.map((pt: any) => (
                                        <tr key={pt.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4 font-medium text-slate-800">{format(new Date(pt.date), 'dd MMM yyyy')}</td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-semibold">{pt.mode}</span></td>
                                            <td className="px-6 py-4 font-bold text-emerald-600">₹{pt.amount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">{pt.note || '-'}</td>
                                        </tr>
                                    ))}
                                    {(!policy.payments || policy.payments.length === 0) && <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No payment records found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* RENEWALS TAB */}
                {activeTab === 'renewals' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Renewal Pipeline</h3>
                            {/* <button className="text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-orange-100 border border-orange-100 transition-colors flex items-center gap-1.5"><Plus className="w-4 h-4"/> Manual Reminder</button> */}
                        </div>

                        <div className="space-y-4">
                            {policy.renewals?.filter((r: any) => r.status !== 'RENEWED' && r.status !== 'LOST').map((ren: any) => (
                                <div key={ren.id} className="bg-white border-2 border-orange-100 rounded-xl p-5 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-bold text-slate-800">Renewal Task</h4>
                                                <span className="bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase border border-orange-200">{ren.status}</span>
                                            </div>
                                            <div className="text-sm text-slate-500">Due: <span className="font-semibold text-slate-700">{format(new Date(ren.dueDate), 'PPP')}</span></div>
                                            {ren.comment && <div className="text-sm mt-3 bg-slate-50 p-2 rounded border border-slate-100 inline-block">Latest Comment: {ren.comment}</div>}
                                            {ren.nextFollowUp && <div className="text-xs text-orange-600 mt-2 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Follow-up on {format(new Date(ren.nextFollowUp), 'PPP')}</div>}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button onClick={() => setIsMarkingRenewed({ renewalId: ren.id })} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 border border-slate-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex justify-center items-center gap-2">
                                                <Check className="w-4 h-4" /> Mark as Renewed
                                            </button>
                                        </div>
                                    </div>

                                    {/* Renew Flow Expandable Form */}
                                    {isMarkingRenewed?.renewalId === ren.id && (
                                        <form onSubmit={handleMarkRenewed} className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-4 bg-slate-50 -mx-5 -mb-5 p-5">
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-700">New Expiry Date <span className="text-red-500">*</span></label>
                                                <input required type="date" value={renewForm.newExpiryDate} onChange={e => setRenewForm({ ...renewForm, newExpiryDate: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-700">New Premium Amount <span className="text-red-500">*</span></label>
                                                <input required type="number" step="0.01" min="1" value={renewForm.newPremium} onChange={e => setRenewForm({ ...renewForm, newPremium: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-700">Internal Remark / Quote Ref</label>
                                                <input type="text" value={renewForm.remark} onChange={e => setRenewForm({ ...renewForm, remark: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Discount provided..." />
                                            </div>
                                            <div className="col-span-full flex gap-3 pt-2">
                                                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 text-sm shadow-sm transition-colors flex items-center gap-1.5"><Check className="w-4 h-4" /> Confirm Renewal</button>
                                                <button type="button" onClick={() => setIsMarkingRenewed(null)} className="px-5 py-2 bg-white text-slate-600 font-semibold rounded-lg hover:bg-slate-50 border border-slate-200 text-sm shadow-sm transition-colors">Cancel</button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            ))}
                            {policy.renewals?.filter((r: any) => r.status !== 'RENEWED' && r.status !== 'LOST').length === 0 && (
                                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">No active renewal tasks. System auto-creates them 30 days before expiry.</div>
                            )}
                        </div>

                        {/* Renewal History List */}
                        <div className="mt-8 pt-8 border-t border-slate-200">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Past Renewals History</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {policy.renewals?.filter((r: any) => r.status === 'RENEWED').map((ren: any) => (
                                    <div key={ren.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50 grayscale hover:grayscale-0 transition-all opacity-75 hover:opacity-100">
                                        <div className="text-xs font-semibold text-slate-500 mb-1">Old Task ID: {ren.id.substring(0, 8)}</div>
                                        <div className="text-sm font-bold text-slate-800">Renewed successfully</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

                {/* COMMISSIONS TAB */}
                {activeTab === 'commissions' && CURRENT_USER_ROLE === 'ADMIN' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                <IndianRupee className="w-5 h-5 text-emerald-600" /> Linked Commissions
                            </h3>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                                    <tr>
                                        <th className="px-6 py-3">Amount</th>
                                        <th className="px-6 py-3">Type / Rate</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Date Info</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {policy.commissions?.map((comm: any) => (
                                        <tr key={comm.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4 font-bold text-emerald-600">₹{comm.amount.toLocaleString('en-IN')}</td>
                                            <td className="px-6 py-4 text-slate-700">
                                                {comm.type === 'PERCENT' ? `${comm.rate}%` : `Flat ₹${comm.rate}`}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={clsx("px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase border",
                                                    comm.status === 'PENDING' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                        comm.status === 'RECEIVED' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                            "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                )}>
                                                    {comm.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs flex flex-col gap-1">
                                                <div>Created: {format(new Date(comm.createdAt), 'dd MMM yyyy')}</div>
                                                {comm.receivedDate && <div>Rcvd: {format(new Date(comm.receivedDate), 'dd MMM yyyy')}</div>}
                                                {comm.paidOutDate && <div>Paid: {format(new Date(comm.paidOutDate), 'dd MMM yyyy')}</div>}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!policy.commissions || policy.commissions.length === 0) && (
                                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No commissions linked to this policy.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
