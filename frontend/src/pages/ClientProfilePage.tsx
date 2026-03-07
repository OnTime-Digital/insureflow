import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, User, Mail,
    FileText, Trash2, Plus, Download, Upload, X,
    MessageCircle, PhoneCall, Loader2,
    Edit, Save, Copy, Shield, Activity, Smartphone,
    CheckCircle2, Image as ImageIcon, File, FileBadge
} from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';
import { format } from 'date-fns';

interface ClientData {
    id: string;
    name: string;
    email: string | null;
    mobile: string | null;

    notes: string | null;
    address: string | null;
    dob: string | null;
    referenceSource: string | null;
    reference: { name: string; type: string; code: string | null } | null;
    createdAt: string;
    activePolicyCount: number;
    nextRenewalDate: string | null;
    policies: any[];
    documents: any[];
}

interface Activity {
    id: string;
    type: string;
    notes: string;
    followupDate: string | null;
    createdAt: string;
    user: { name: string };
    renewal?: { id: string; dueDate: string; policy: { policyNo: string; type: string } } | null;
}

export default function ClientProfilePage() {
    const { id } = useParams<{ id: string }>();
    const [client, setClient] = useState<ClientData | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    // Activity form
    const [showActivityForm, setShowActivityForm] = useState(false);
    const [activityForm, setActivityForm] = useState({ type: 'CALL', notes: '', followupDate: '' });
    const [savingActivity, setSavingActivity] = useState(false);

    // Document upload
    const [showDocUpload, setShowDocUpload] = useState(false);
    const [docForm, setDocForm] = useState({ type: 'KYC', customTags: '' });
    const [docFile, setDocFile] = useState<File | null>(null);
    const [docUrl, setDocUrl] = useState('');
    const [docUploadMode, setDocUploadMode] = useState<'file' | 'link'>('file');
    const [uploadingDoc, setUploadingDoc] = useState(false);

    // Client edit state
    const [isEditingClient, setIsEditingClient] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', email: '', mobile: '', notes: '' });
    const [savingEdit, setSavingEdit] = useState(false);

    useEffect(() => {
        if (id) {
            fetchClient();
            fetchActivities();
        }
    }, [id]);

    const fetchClient = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/clients/${id}`);
            setClient(res.data);
        } catch (error) {
            console.error('Failed to fetch client:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivities = async () => {
        try {
            const res = await axios.get('/api/activities', { params: { clientId: id } });
            setActivities(res.data);
        } catch (error) {
            console.error('Failed to fetch activities:', error);
        }
    };

    const handleAddActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingActivity(true);
        try {
            await axios.post('/api/activities', {
                clientId: id,
                type: activityForm.type,
                notes: activityForm.notes,
                followupDate: activityForm.followupDate || null
            });
            setActivityForm({ type: 'CALL', notes: '', followupDate: '' });
            setShowActivityForm(false);
            fetchActivities();
        } catch (error) {
            console.error('Failed to add activity:', error);
            alert('Failed to add activity.');
        } finally {
            setSavingActivity(false);
        }
    };

    const handleDeleteActivity = async (actId: string) => {
        if (!confirm('Delete this activity?')) return;
        try {
            await axios.delete(`/api/activities/${actId}`);
            setActivities(prev => prev.filter(a => a.id !== actId));
        } catch (error) {
            console.error('Failed to delete activity:', error);
        }
    };

    const handleUploadDoc = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploadingDoc(true);
        try {
            let finalUrl = docUrl;
            if (docUploadMode === 'file' && docFile) {
                const fd = new FormData();
                fd.append('document', docFile);
                const uploadRes = await axios.post('/api/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                finalUrl = uploadRes.data.url;
            }
            if (!finalUrl) {
                alert('Please select a file or provide a URL.');
                setUploadingDoc(false);
                return;
            }
            await axios.post('/api/documents', {
                clientId: id,
                type: docForm.type,
                url: finalUrl,
                customTags: docForm.customTags
            });
            setShowDocUpload(false);
            setDocForm({ type: 'KYC', customTags: '' });
            setDocFile(null);
            setDocUrl('');
            fetchClient();
        } catch (error) {
            console.error('Failed to upload document:', error);
            alert('Failed to upload document.');
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleDeleteDoc = async (docId: string) => {
        if (!confirm('Delete this document?')) return;
        try {
            await axios.delete(`/api/documents/${docId}`);
            fetchClient();
        } catch (error) {
            console.error('Failed to delete document:', error);
        }
    };

    const handleOpenEditClient = () => {
        if (!client) return;
        setEditForm({
            name: client.name || '',
            email: client.email || '',
            mobile: client.mobile || '',
            notes: client.notes || ''
        });
        setIsEditingClient(true);
    };

    const handleSaveEditClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setSavingEdit(true);
        try {
            await axios.put(`/api/clients/${id}`, editForm);
            setIsEditingClient(false);
            fetchClient();
        } catch (error: any) {
            console.error('Failed to update client:', error);
            alert(error.response?.data?.error || 'Failed to update client.');
        } finally {
            setSavingEdit(false);
        }
    };

    const getDocLink = (url: string) => url.startsWith('http') ? url : `http://localhost:5005${url}`;

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="max-w-4xl mx-auto text-center py-20">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Client Not Found</h2>
                <Link to="/clients" className="text-blue-600 hover:underline">← Back to Clients</Link>
            </div>
        );
    }

    // Calculate total annualized premium for active policies
    const totalPremium = client.policies
        ?.filter(p => p.status === 'ACTIVE')
        ?.reduce((sum, p) => sum + (p.premium || 0), 0) || 0;

    const formatCurrency = (amount: number) => {
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
        return `₹${amount}`;
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add a toast here later
    };

    const lifePolicies = client.policies?.filter(p => p.type === 'Life') || [];
    const generalPolicies = client.policies?.filter(p => p.type !== 'Life') || [];

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Minimal Header */}
            <div className="flex items-start gap-3">
                <Link to="/clients" className="mt-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-blue-100/50 text-blue-600 font-bold text-2xl flex items-center justify-center border border-blue-200/50 shrink-0">
                            {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{client.name}</h1>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-100 text-emerald-700">PREMIUM</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                <FileBadge className="w-4 h-4" />
                                <span>ID: #9{(client.id || '942').substring(0, 3)}</span>
                                <span>·</span>
                                <span>Client since {format(new Date(client.createdAt), 'MMM yyyy')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {client.mobile && (
                            <>
                                <a href={`tel:${client.mobile}`} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                                    <PhoneCall className="w-4 h-4" /> Call
                                </a>
                                <a href={`https://wa.me/${client.mobile.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-green-600 rounded-lg text-sm font-semibold hover:bg-green-50 transition-colors shadow-sm">
                                    <MessageCircle className="w-4 h-4" /> WhatsApp
                                </a>
                            </>
                        )}
                        <button onClick={handleOpenEditClient} className="flex items-center gap-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                            <Edit className="w-4 h-4" /> Edit
                        </button>
                        <Link to={`/policies/new?clientId=${client.id}`} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                            <Plus className="w-4 h-4" /> Add Policy
                        </Link>
                    </div>
                </div>
            </div>

            {/* Dashboard 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column (Main Feed) */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Contact Details Cards */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <User className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-slate-900 text-lg">Contact Details</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Mobile Card */}
                            <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                        <Smartphone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 mb-0.5">Mobile Number</p>
                                        <p className="font-bold text-slate-900">{client.mobile || 'N/A'}</p>
                                    </div>
                                </div>
                                {client.mobile && (
                                    <button onClick={() => handleCopy(client.mobile!)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Email Card */}
                            <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 mb-0.5">Email Address</p>
                                        <p className="font-bold text-slate-900">{client.email || 'N/A'}</p>
                                    </div>
                                </div>
                                {client.email && (
                                    <button onClick={() => handleCopy(client.email!)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Active Policies Block */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-slate-900 text-lg">Active Policies</h3>
                            </div>
                            <Link to={`/policies?clientId=${client.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">View All</Link>
                        </div>

                        {client.policies?.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed border-2">
                                No active policies found.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* General Policies */}
                                {generalPolicies.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <h4 className="text-sm font-semibold text-slate-700 mb-3 px-1">General Insurance</h4>
                                        <table className="w-full text-sm text-left whitespace-nowrap">
                                            <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                                <tr>
                                                    <th className="px-4 py-3 pb-4">Policy Type</th>
                                                    <th className="px-4 py-3 pb-4">Policy #</th>
                                                    <th className="px-4 py-3 pb-4">Premium</th>
                                                    <th className="px-4 py-3 pb-4">Renewal Date</th>
                                                    <th className="px-4 py-3 pb-4 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {generalPolicies.map((p: any) => (
                                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded bg-blue-50/50 border border-blue-100 flex items-center justify-center text-blue-600">
                                                                    <Shield className="w-4 h-4" />
                                                                </div>
                                                                <div className="font-semibold text-slate-800">{p.insurer}<br /><span className="text-xs text-slate-500 font-medium">{p.type}</span></div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 font-medium text-slate-600 tracking-wide text-xs">
                                                            {p.policyNo?.replace(/(.{6})/g, "$1\n") || 'Pending'}
                                                        </td>
                                                        <td className="px-4 py-4 font-bold text-slate-900">
                                                            ₹{p.premium?.toLocaleString() || '0'}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="font-medium text-slate-800">{format(new Date(p.expiryDate), 'dd MMM')}<br /><span className="text-xs text-slate-500">{format(new Date(p.expiryDate), 'yyyy')}</span></div>
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <span className={clsx("inline-flex px-2.5 py-1 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold tracking-widest uppercase",
                                                                p.status !== 'ACTIVE' && "bg-slate-100 text-slate-500"
                                                            )}>
                                                                {p.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Life Policies */}
                                {lifePolicies.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <h4 className={clsx("text-sm font-semibold text-slate-700 mb-3 px-1", generalPolicies.length > 0 && "border-t border-slate-100 pt-5 mt-2")}>Life Insurance</h4>
                                        <table className="w-full text-sm text-left whitespace-nowrap">
                                            <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                                <tr>
                                                    <th className="px-4 py-3 pb-4">Policy Type</th>
                                                    <th className="px-4 py-3 pb-4">Policy #</th>
                                                    <th className="px-4 py-3 pb-4">Premium</th>
                                                    <th className="px-4 py-3 pb-4">PPT / PT</th>
                                                    <th className="px-4 py-3 pb-4 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {lifePolicies.map((p: any) => (
                                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded bg-emerald-50/50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                                                                    <Activity className="w-4 h-4" />
                                                                </div>
                                                                <div className="font-semibold text-slate-800">{p.insurer}<br /><span className="text-xs text-slate-500 font-medium">{p.type} {p.premiumMode ? `· ${p.premiumMode}` : ''}</span></div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 font-medium text-slate-600 tracking-wide text-xs">
                                                            {p.policyNo?.replace(/(.{6})/g, "$1\n") || 'Pending'}
                                                        </td>
                                                        <td className="px-4 py-4 font-bold text-slate-900">
                                                            ₹{p.premium?.toLocaleString() || '0'}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="font-medium text-slate-800 gap-1 flex items-center">
                                                                <span>{p.ppt || '-'}</span>
                                                                <span className="text-slate-400 text-xs px-1">/</span>
                                                                <span>{p.pt || '-'}</span>
                                                                <span className="text-slate-500 font-normal text-xs ml-0.5">Yrs</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <span className={clsx("inline-flex px-2.5 py-1 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold tracking-widest uppercase",
                                                                p.status !== 'ACTIVE' && "bg-slate-100 text-slate-500"
                                                            )}>
                                                                {p.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Documents Grid */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-slate-900 text-lg">Documents</h3>
                            </div>
                            <button onClick={() => setShowDocUpload(!showDocUpload)} className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
                                <Upload className="w-4 h-4" /> Upload New
                            </button>
                        </div>

                        {/* Inline Upload Form */}
                        {showDocUpload && (
                            <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-xl animate-in slide-in-from-top-2">
                                <form onSubmit={handleUploadDoc} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-slate-900">Upload Document</h4>
                                        <button type="button" onClick={() => setShowDocUpload(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-700 uppercase">Document Type</label>
                                            <select value={docForm.type} onChange={e => setDocForm({ ...docForm, type: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                                                <option value="KYC">KYC</option>
                                                <option value="POLICY">Policy Copy</option>
                                                <option value="PROPOSAL">Proposal</option>
                                                <option value="CLAIM">Claim</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-700 uppercase">Display Name</label>
                                            <input type="text" value={docForm.customTags} onChange={e => setDocForm({ ...docForm, customTags: e.target.value })} placeholder="e.g. Aadhar Card" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                                        </div>
                                    </div>
                                    <div className="flex bg-slate-200/50 p-1 rounded-lg w-max">
                                        <button type="button" onClick={() => setDocUploadMode('file')} className={clsx("px-4 py-1.5 text-xs font-semibold rounded-md", docUploadMode === 'file' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700")}>File</button>
                                        <button type="button" onClick={() => setDocUploadMode('link')} className={clsx("px-4 py-1.5 text-xs font-semibold rounded-md", docUploadMode === 'link' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700")}>Link</button>
                                    </div>
                                    {docUploadMode === 'file' ? (
                                        <input type="file" onChange={e => setDocFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors" />
                                    ) : (
                                        <input type="url" value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="https://drive.google.com/..." className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                                    )}
                                    <div className="flex justify-end">
                                        <button type="submit" disabled={uploadingDoc} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                                            {uploadingDoc && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {client.documents?.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed border-2">
                                No documents attached to this client.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {client.documents.map((doc: any) => {
                                    const isPdf = doc.url?.toLowerCase().endsWith('.pdf');
                                    const isImage = doc.url?.match(/\.(jpeg|jpg|gif|png)$/i);

                                    return (
                                        <div key={doc.id} className="relative group bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all rounded-xl p-5 flex flex-col justify-between aspect-[4/3]">
                                            <div className="flex justify-between items-start">
                                                <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center",
                                                    isPdf ? "bg-red-50 text-red-500" :
                                                        isImage ? "bg-blue-50 text-blue-500" : "bg-slate-100 text-slate-500"
                                                )}>
                                                    {isImage ? <ImageIcon className="w-5 h-5" /> : <File className="w-5 h-5" />}
                                                </div>
                                                <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm truncate" title={doc.customTags || doc.url.split('/').pop()}>
                                                    {doc.customTags || doc.url.split('/').pop() || 'Document'}
                                                </p>
                                                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mt-1">{doc.type} PROOF</p>
                                            </div>

                                            {/* Hover Actions Overlay */}
                                            <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-2 bg-gradient-to-t from-white via-white to-transparent rounded-b-xl">
                                                <a href={getDocLink(doc.url)} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Download className="w-4 h-4" />
                                                </a>
                                                <button onClick={() => handleDeleteDoc(doc.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column (Sidebar Widgets) */}
                <div className="lg:col-span-4 space-y-6">

                    {/* Client Summary Widget (Blue) */}
                    <div className="bg-[#2B5CFF] rounded-2xl shadow-md p-6 text-white relative overflow-hidden">
                        {/* Decorative background shapes */}
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Activity className="w-32 h-32 scale-150 rotate-12" />
                        </div>

                        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-6">Client Summary</h3>

                        <div className="space-y-6">
                            <div className="flex border-b border-white/10 pb-4 justify-between items-end">
                                <p className="text-sm text-blue-100 font-medium">Active Policies</p>
                                <p className="text-3xl font-bold tracking-tight">{String(client.activePolicyCount).padStart(2, '0')}</p>
                            </div>
                            <div className="flex border-b border-white/10 pb-4 justify-between items-end">
                                <p className="text-sm text-blue-100 font-medium">Total Premium (Annual)</p>
                                <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalPremium)}</p>
                            </div>
                            <div className="flex pb-4 justify-between items-end">
                                <p className="text-sm text-blue-100 font-medium">Pending Claims</p>
                                <p className="text-3xl font-bold tracking-tight">00</p>
                            </div>
                        </div>

                        <button className="w-full mt-2 py-3 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-[0_4px_14px_0_rgba(255,255,255,0.39)]">
                            Generate Statement
                        </button>
                    </div>

                    {/* Activity Timeline Widget */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-slate-900 text-lg">Activity Timeline</h3>
                            </div>
                            <button onClick={() => setShowActivityForm(!showActivityForm)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Add Activity Form inline */}
                        {showActivityForm && (
                            <form onSubmit={handleAddActivity} className="mb-6 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Type</label>
                                    <select value={activityForm.type} onChange={e => setActivityForm({ ...activityForm, type: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                                        <option value="CALL">Call</option>
                                        <option value="EMAIL">Email</option>
                                        <option value="NOTE">Note</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Details</label>
                                    <textarea required rows={2} value={activityForm.notes} onChange={e => setActivityForm({ ...activityForm, notes: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm resize-none" placeholder="Enter note..."></textarea>
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                    <button type="button" onClick={() => setShowActivityForm(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
                                    <button type="submit" disabled={savingActivity} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm">Save</button>
                                </div>
                            </form>
                        )}

                        {activities.length === 0 ? (
                            <p className="text-center text-sm text-slate-500 py-8">No recent activity.</p>
                        ) : (
                            <div className="relative pl-3 space-y-6 before:absolute before:inset-y-0 before:left-[15px] before:w-px before:bg-slate-200">
                                {activities.slice(0, 5).map((act) => (
                                    <div key={act.id} className="relative pl-6 group">
                                        {/* Dot marker */}
                                        <div className={clsx("absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ring-2 ring-white shadow-sm",
                                            act.type === 'CALL' ? "bg-amber-400" :
                                                act.type === 'EMAIL' ? "bg-blue-400" :
                                                    act.type === 'NOTE' ? "bg-emerald-400" : "bg-slate-400"
                                        )} />

                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                {format(new Date(act.createdAt), "dd MMM yyyy, h:mm a")}
                                            </p>
                                            <button onClick={() => handleDeleteActivity(act.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1 -mr-2"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 leading-tight mb-1">{act.type} Logged</p>
                                        <p className="text-xs text-slate-500 leading-snug">{act.notes}</p>
                                        {act.user && <p className="text-[10px] text-slate-400 mt-1">By {act.user.name}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                        {activities.length > 5 && (
                            <button className="w-full mt-6 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                View Full History
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Client Modal */}
            {
                isEditingClient && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-lg text-slate-900">Edit Client</h3>
                                <button onClick={() => setIsEditingClient(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-slate-50 hover:bg-slate-100 rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSaveEditClient} className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Full Name <span className="text-red-500">*</span></label>
                                    <input required type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Email</label>
                                    <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Mobile</label>
                                    <input type="tel" value={editForm.mobile} onChange={e => setEditForm({ ...editForm, mobile: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Notes</label>
                                    <textarea rows={3} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" placeholder="Internal notes..." />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setIsEditingClient(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                                    <button type="submit" disabled={savingEdit} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                                        {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {savingEdit ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
