import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, User, Mail, Phone, Calendar, MapPin,
    FileText, Trash2, Plus, Download, Upload, X,
    MessageCircle, PhoneCall, Clock, Loader2,
    CheckCircle, Edit, Save
} from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';
import { format } from 'date-fns';

type Tab = 'overview' | 'policies' | 'documents' | 'activity';

interface ClientData {
    id: string;
    name: string;
    email: string | null;
    mobile: string | null;
    kycStatus: string | null;
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
    const [activeTab, setActiveTab] = useState<Tab>('overview');
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

    const tabs: { key: Tab; label: string }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'policies', label: `Policies (${client.policies?.length || 0})` },
        { key: 'documents', label: `Documents (${client.documents?.length || 0})` },
        { key: 'activity', label: `Activity (${activities.length})` },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Link to="/clients" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900 mt-1">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 font-bold text-xl flex items-center justify-center shrink-0">
                                {client.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{client.name}</h1>
                                <p className="text-sm text-slate-500 mt-0.5">Client since {format(new Date(client.createdAt), 'MMM yyyy')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {client.mobile && (
                                <>
                                    <a href={`https://wa.me/${client.mobile.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors" title="WhatsApp">
                                        <MessageCircle className="w-5 h-5" />
                                    </a>
                                    <a href={`tel:${client.mobile}`} className="p-2.5 bg-violet-50 text-violet-600 rounded-xl hover:bg-violet-100 transition-colors" title="Call">
                                        <PhoneCall className="w-5 h-5" />
                                    </a>
                                </>
                            )}
                            <button onClick={handleOpenEditClient} className="flex items-center gap-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
                                <Edit className="w-4 h-4" /> Edit
                            </button>
                            <Link to={`/policies/new?clientId=${client.id}`} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
                                <Plus className="w-4 h-4" /> Add Policy
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="flex gap-1 -mb-px">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={clsx(
                                "px-5 py-3 text-sm font-semibold transition-colors border-b-2",
                                activeTab === tab.key
                                    ? "text-blue-600 border-blue-600"
                                    : "text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-300">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Info Card */}
                        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                            <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">Contact Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="flex items-start gap-3">
                                    <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase">Mobile</p>
                                        <p className="font-medium text-slate-900">{client.mobile || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase">Email</p>
                                        <p className="font-medium text-slate-900">{client.email || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase">Date of Birth</p>
                                        <p className="font-medium text-slate-900">{client.dob ? format(new Date(client.dob), 'MMM dd, yyyy') : 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase">KYC Status</p>
                                        <span className={clsx("inline-flex px-2.5 py-1 rounded-md text-xs font-bold mt-0.5",
                                            client.kycStatus === 'Verified' ? "bg-emerald-100 text-emerald-700" :
                                                client.kycStatus === 'Pending' ? "bg-yellow-100 text-yellow-700" :
                                                    "bg-slate-100 text-slate-700"
                                        )}>
                                            {client.kycStatus || 'Unknown'}
                                        </span>
                                    </div>
                                </div>
                                <div className="sm:col-span-2 flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase">Address</p>
                                        <p className="font-medium text-slate-900">{client.address || 'N/A'}</p>
                                    </div>
                                </div>
                                {client.reference && (
                                    <div className="flex items-start gap-3">
                                        <User className="w-5 h-5 text-slate-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase">Referred By</p>
                                            <p className="font-medium text-slate-900">
                                                {client.reference.name} <span className="text-slate-500 text-sm">({client.reference.type})</span>
                                            </p>
                                            {client.reference.code && <p className="text-xs text-slate-500 font-mono">{client.reference.code}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {client.notes && (
                                <div className="pt-3 border-t border-slate-100">
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Notes</p>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">{client.notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Summary Card */}
                        <div className="space-y-4">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                                <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Summary</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Active Policies</span>
                                        <span className="font-bold text-lg text-blue-600">{client.activePolicyCount}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Total Policies</span>
                                        <span className="font-bold text-lg text-slate-700">{client.policies?.length || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Documents</span>
                                        <span className="font-bold text-lg text-slate-700">{client.documents?.length || 0}</span>
                                    </div>
                                    {client.nextRenewalDate && (
                                        <div className="pt-2 border-t border-slate-100">
                                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Next Renewal</p>
                                            <p className="font-semibold text-amber-600">{format(new Date(client.nextRenewalDate), 'MMM dd, yyyy')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'policies' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">Client Policies</h3>
                            <Link to={`/policies/new?clientId=${client.id}`} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
                                <Plus className="w-4 h-4" /> Add Policy
                            </Link>
                        </div>
                        {client.policies?.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">No policies found for this client.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-3">Policy No</th>
                                            <th className="px-6 py-3">Type</th>
                                            <th className="px-6 py-3">Insurer</th>
                                            <th className="px-6 py-3">Premium</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Expiry</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {client.policies.map((p: any) => (
                                            <tr key={p.id} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-3 font-medium text-slate-900">{p.policyNo}</td>
                                                <td className="px-6 py-3 text-slate-600">{p.type}</td>
                                                <td className="px-6 py-3 text-slate-600">{p.insurer}</td>
                                                <td className="px-6 py-3 font-medium text-slate-700">₹{p.premium?.toLocaleString()}</td>
                                                <td className="px-6 py-3">
                                                    <span className={clsx("px-2 py-0.5 rounded-md text-xs font-bold",
                                                        p.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                                                    )}>{p.status}</span>
                                                </td>
                                                <td className="px-6 py-3 text-slate-500">{format(new Date(p.expiryDate), 'MMM dd, yyyy')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">Client Documents</h3>
                            <button onClick={() => setShowDocUpload(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
                                <Upload className="w-4 h-4" /> Upload
                            </button>
                        </div>
                        {client.documents?.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">No documents uploaded for this client.</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {client.documents.map((doc: any) => (
                                    <div key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm">{doc.customTags || doc.url.split('/').pop() || 'Document'}</p>
                                                <p className="text-xs text-slate-500">{doc.type} · {format(new Date(doc.createdAt), 'MMM dd, yyyy')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a href={getDocLink(doc.url)} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Download className="w-4 h-4" />
                                            </a>
                                            <button onClick={() => handleDeleteDoc(doc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Document Upload Inline Form */}
                        {showDocUpload && (
                            <div className="p-6 border-t border-slate-200 bg-slate-50">
                                <form onSubmit={handleUploadDoc} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-slate-900">Upload New Document</h4>
                                        <button type="button" onClick={() => setShowDocUpload(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm font-semibold text-slate-700">Document Type</label>
                                            <select value={docForm.type} onChange={e => setDocForm({ ...docForm, type: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                                                <option value="KYC">KYC</option>
                                                <option value="POLICY">Policy Copy</option>
                                                <option value="PROPOSAL">Proposal</option>
                                                <option value="CLAIM">Claim</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-semibold text-slate-700">Display Name</label>
                                            <input type="text" value={docForm.customTags} onChange={e => setDocForm({ ...docForm, customTags: e.target.value })} placeholder="e.g. Aadhar Card" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                                        </div>
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-lg w-max">
                                        <button type="button" onClick={() => setDocUploadMode('file')} className={clsx("px-3 py-1.5 text-xs font-semibold rounded-md", docUploadMode === 'file' ? "bg-white shadow-sm" : "text-slate-500")}>File</button>
                                        <button type="button" onClick={() => setDocUploadMode('link')} className={clsx("px-3 py-1.5 text-xs font-semibold rounded-md", docUploadMode === 'link' ? "bg-white shadow-sm" : "text-slate-500")}>Link</button>
                                    </div>
                                    {docUploadMode === 'file' ? (
                                        <input type="file" onChange={e => setDocFile(e.target.files?.[0] || null)} className="block text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700" />
                                    ) : (
                                        <input type="url" value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="https://drive.google.com/..." className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                                    )}
                                    <button type="submit" disabled={uploadingDoc} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                                        {uploadingDoc && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 text-lg">Activity & Follow-ups</h3>
                            <button onClick={() => setShowActivityForm(!showActivityForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
                                <Plus className="w-4 h-4" /> Add Note
                            </button>
                        </div>

                        {/* Add Activity Form */}
                        {showActivityForm && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                <form onSubmit={handleAddActivity} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm font-semibold text-slate-700">Activity Type</label>
                                            <select value={activityForm.type} onChange={e => setActivityForm({ ...activityForm, type: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                                                <option value="CALL">Phone Call</option>
                                                <option value="EMAIL">Email</option>
                                                <option value="MEETING">Meeting</option>
                                                <option value="NOTE">General Note</option>
                                                <option value="FOLLOWUP">Follow-up</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-semibold text-slate-700">Follow-up Date</label>
                                            <input type="date" value={activityForm.followupDate} onChange={e => setActivityForm({ ...activityForm, followupDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-slate-700">Notes <span className="text-red-500">*</span></label>
                                        <textarea required rows={3} value={activityForm.notes} onChange={e => setActivityForm({ ...activityForm, notes: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none" placeholder="Enter activity details..."></textarea>
                                    </div>
                                    <div className="flex gap-3 justify-end">
                                        <button type="button" onClick={() => setShowActivityForm(false)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                                        <button type="submit" disabled={savingActivity} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                            {savingActivity ? 'Saving...' : 'Save Activity'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Activity Timeline */}
                        {activities.length === 0 ? (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
                                No activities recorded yet. Click "Add Note" to start tracking interactions.
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {activities.map((act, idx) => (
                                    <div key={act.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex gap-4 group hover:bg-slate-50/50 transition-colors">
                                        <div className="flex flex-col items-center">
                                            <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                                                act.type === 'CALL' ? "bg-green-100 text-green-600" :
                                                    act.type === 'EMAIL' ? "bg-blue-100 text-blue-600" :
                                                        act.type === 'MEETING' ? "bg-violet-100 text-violet-600" :
                                                            act.type === 'FOLLOWUP' ? "bg-amber-100 text-amber-600" :
                                                                "bg-slate-100 text-slate-600"
                                            )}>
                                                {act.type === 'CALL' ? <PhoneCall className="w-4 h-4" /> :
                                                    act.type === 'EMAIL' ? <Mail className="w-4 h-4" /> :
                                                        act.type === 'FOLLOWUP' ? <Clock className="w-4 h-4" /> :
                                                            <FileText className="w-4 h-4" />}
                                            </div>
                                            {idx < activities.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 mt-2 mb-0" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-500 uppercase">{act.type}</span>
                                                    <span className="mx-2 text-slate-300">·</span>
                                                    <span className="text-xs text-slate-500">{format(new Date(act.createdAt), 'MMM dd, yyyy h:mm a')}</span>
                                                    <span className="mx-2 text-slate-300">·</span>
                                                    <span className="text-xs text-slate-500">by {act.user?.name || 'System'}</span>
                                                </div>
                                                <button onClick={() => handleDeleteActivity(act.id)} className="p-1 text-slate-300 hover:text-red-500 transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{act.notes}</p>
                                            {act.followupDate && (
                                                <p className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" /> Follow-up: {format(new Date(act.followupDate), 'MMM dd, yyyy')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Client Modal */}
            {isEditingClient && (
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
            )}
        </div>
    );
}
