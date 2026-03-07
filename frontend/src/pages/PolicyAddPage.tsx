import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import {
    ArrowLeft, User, ShieldCheck, IndianRupee, Building2,
    Calendar, Link as LinkIcon, FileText, Car, ShieldAlert, Plus, Clock
} from 'lucide-react';
import axios from 'axios';
import { format, addMonths } from 'date-fns';
import clsx from 'clsx';

type Client = {
    id: string;
    name: string;
    email: string | null;
    mobile: string | null;
};

export default function PolicyAddPage() {
    const navigate = useNavigate();
    const { id: editId } = useParams(); // If editing, this will have the policy ID
    const isEditMode = !!editId;

    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        clientId: '', type: 'Life', insurer: '', policyNo: '', vehicleNo: '',
        premium: '', premiumPaid: '', earnedPremium: '', paymentStatus: 'UNPAID', status: 'ACTIVE',
        premiumMode: 'ANNUAL',
        customPremiumDays: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        expiryDate: '',
        tenureType: 'YEARLY',
        customTenureMonths: '',
        referenceId: '',
        assignedTo: '',
        notes: '',
        paymentTerms: '',
        policyTerms: '',
        remarks: '',
        clientVisibleNotes: '',
        epAmount: '',
        ppt: '',
        pt: '',
        otherSubType: 'FIRE'
    });
    const [references, setReferences] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [paymentTermsTemplates, setPaymentTermsTemplates] = useState<string[]>([]);

    const [extras, setExtras] = useState<any>({});

    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [newClientData, setNewClientData] = useState({
        name: '', email: '', mobile: ''
    });

    // Multi-document state
    const [documents, setDocuments] = useState<{ file: File | null, link: string, type: string, mode: 'file' | 'link' }[]>([]);

    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Reference Autocomplete and Creation State
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const [referredByInput, setReferredByInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isCreatingRef, setIsCreatingRef] = useState(false);
    const [newRefName, setNewRefName] = useState('');
    const [newRefType, setNewRefType] = useState('AGENT');
    const [isSavingRef, setIsSavingRef] = useState(false);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await axios.get('/api/clients');
                const clientsData = res.data.data || [];
                setClients(clientsData);
                if (clientsData.length > 0 && !isEditMode) {
                    setFormData(prev => ({ ...prev, clientId: clientsData[0].id }));
                }
            } catch (err) {
                console.error("Error fetching clients", err);
            } finally {
                setLoading(false);
            }
        };
        const fetchDependencies = async () => {
            try {
                const [refRes, empRes] = await Promise.all([
                    axios.get('/api/references?status=ACTIVE'),
                    axios.get('/api/employees?isActive=true')
                ]);
                setReferences(refRes.data);
                setEmployees(empRes.data);
            } catch (err) {
                console.error("Error fetching dependencies", err);
            }
        };

        const fetchSettings = async () => {
            try {
                const res = await axios.get('/api/settings');
                if (res.data.payment_terms_templates) {
                    try {
                        setPaymentTermsTemplates(JSON.parse(res.data.payment_terms_templates));
                    } catch { }
                }
            } catch (err) { }
        };

        const fetchPolicyForEdit = async () => {
            if (!editId) return;
            try {
                const res = await axios.get(`/api/policies/${editId}`);
                const p = res.data;
                let extrasObj: any = {};
                try {
                    if (p.extras) extrasObj = typeof p.extras === 'string' ? JSON.parse(p.extras) : p.extras;
                } catch (e) { }

                setFormData({
                    clientId: p.clientId || '',
                    type: p.type || 'Life',
                    insurer: p.insurer || '',
                    policyNo: p.policyNo || '',
                    vehicleNo: p.vehicleNo || '',
                    premium: p.premium?.toString() || '',
                    premiumPaid: p.premiumPaid?.toString() || '',
                    earnedPremium: p.earnedPremium?.toString() || '',
                    paymentStatus: p.paymentStatus || 'UNPAID',
                    status: p.status || 'ACTIVE',
                    premiumMode: p.premiumMode || 'ANNUAL',
                    customPremiumDays: '',
                    startDate: p.startDate ? format(new Date(p.startDate), 'yyyy-MM-dd') : '',
                    expiryDate: p.expiryDate ? format(new Date(p.expiryDate), 'yyyy-MM-dd') : '',
                    tenureType: p.tenureType || 'YEARLY',
                    customTenureMonths: p.customTenureMonths?.toString() || '',
                    referenceId: p.referenceId || '',
                    assignedTo: p.assignedTo || '',
                    notes: p.notes || extrasObj.remarks || '',
                    paymentTerms: extrasObj.paymentTerms || '',
                    policyTerms: extrasObj.policyTerms || '',
                    remarks: extrasObj.remarks || '',
                    clientVisibleNotes: extrasObj.clientVisibleNotes || '',
                    epAmount: p.epAmount?.toString() || '',
                    ppt: p.ppt?.toString() || '',
                    pt: p.pt?.toString() || '',
                    otherSubType: extrasObj.subType || 'FIRE'
                });
                if (p.reference) {
                    setReferredByInput(p.reference.name);
                }
                setExtras(extrasObj);
            } catch (err) {
                console.error("Error fetching policy for edit", err);
                setError("Could not load policy data.");
            }
        };

        fetchClients();
        fetchDependencies();
        fetchSettings();
        fetchPolicyForEdit();
    }, [editId]);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredRefs = references.filter((ref: any) =>
        ref.name.toLowerCase().includes(referredByInput.toLowerCase())
    );

    const handleSelectRef = (ref: any) => {
        setReferredByInput(ref.name);
        setFormData({ ...formData, referenceId: ref.id });
        setShowSuggestions(false);
        setIsCreatingRef(false);
    };

    const handleReferredByChange = (value: string) => {
        setReferredByInput(value);
        if (!value) setFormData({ ...formData, referenceId: '' });
        setShowSuggestions(true);
        setIsCreatingRef(false);
    };

    const handleCreateRef = async () => {
        if (!newRefName.trim()) return;
        setIsSavingRef(true);
        try {
            const res = await axios.post('/api/references', {
                name: newRefName,
                type: newRefType,
                status: 'ACTIVE'
            });
            const createdRef = res.data;
            setReferences([...references, createdRef]);
            handleSelectRef(createdRef);
        } catch (err: any) {
            console.error('Failed to create reference', err);
            alert(err.response?.data?.error || 'Failed to create reference');
        } finally {
            setIsSavingRef(false);
        }
    };

    // Auto-calculate expiryDate based on tenureType + startDate
    useEffect(() => {
        if (!formData.startDate || !formData.tenureType) return;
        if (formData.tenureType === 'CUSTOM') return;
        if (isEditMode) return; // Don't auto-calc in edit mode initially

        const monthsMap: Record<string, number> = {
            'MONTHLY': 1,
            'QUARTERLY': 3,
            'HALF_YEARLY': 6,
            'YEARLY': 12
        };
        const months = monthsMap[formData.tenureType];
        if (months) {
            const end = addMonths(new Date(formData.startDate), months);
            setFormData(prev => ({ ...prev, expiryDate: format(end, 'yyyy-MM-dd') }));
        }
    }, [formData.startDate, formData.tenureType]);

    // Auto-calculate expiryDate for CUSTOM when customTenureMonths changes
    useEffect(() => {
        if (!formData.startDate) return;

        // Auto-calc for Life policies based on PT (Policy Terms) instead of Tenure
        if (formData.type === 'Life' && formData.pt) {
            const years = parseInt(formData.pt);
            if (years > 0) {
                const end = addMonths(new Date(formData.startDate), years * 12);
                setFormData(prev => ({ ...prev, expiryDate: format(end, 'yyyy-MM-dd') }));
            }
            return;
        }

        if (formData.tenureType !== 'CUSTOM' || !formData.customTenureMonths) return;
        const months = parseInt(formData.customTenureMonths);
        if (months > 0) {
            const end = addMonths(new Date(formData.startDate), months);
            setFormData(prev => ({ ...prev, expiryDate: format(end, 'yyyy-MM-dd') }));
        }
    }, [formData.customTenureMonths, formData.startDate, formData.tenureType, formData.pt, formData.type]);

    // Reset extras when type changes
    useEffect(() => {
        if (!isEditMode) {
            setExtras({});
            if (formData.type !== 'Vehicle') {
                setFormData(prev => ({ ...prev, vehicleNo: '' }));
            }
        }
    }, [formData.type]);

    const handleAddDocument = () => {
        setDocuments([...documents, { file: null, link: '', type: 'Policy PDF', mode: 'file' }]);
    };

    const handleRemoveDocument = (index: number) => {
        setDocuments(documents.filter((_, i) => i !== index));
    };

    const handleUpdateDocument = (index: number, field: string, value: any) => {
        const newDocs = [...documents];
        (newDocs[index] as any)[field] = value;
        setDocuments(newDocs);
    };

    const handleSavePolicy = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSaving(true);

        try {
            let finalClientId = formData.clientId;

            // 1. Create client first if needed
            if (isCreatingClient && !isEditMode) {
                if (!newClientData.name) {
                    throw new Error("Client name is required when creating a new client.");
                }
                const clientRes = await axios.post('/api/clients', {
                    ...newClientData,
                    kycStatus: 'Pending',
                    notes: 'Auto-created during policy addition.'
                });
                finalClientId = clientRes.data.id;
            }

            // 2. Build extras for the type
            const finalExtras = { ...extras };
            if (formData.type === 'Other') {
                finalExtras.subType = formData.otherSubType;
            }

            // 3. Create or Update the policy
            const payload = {
                ...formData,
                clientId: finalClientId,
                extras: finalExtras,
                tenureType: formData.tenureType,
                customTenureMonths: formData.customTenureMonths || undefined,
                ppt: formData.ppt || undefined,
                pt: formData.pt || undefined,
                epAmount: formData.epAmount || undefined,
                earnedPremium: formData.earnedPremium || undefined,
                premiumMode: formData.premiumMode,
            };
            if (!payload.referenceId) delete (payload as any).referenceId;
            if (!payload.assignedTo) delete (payload as any).assignedTo;
            if (!payload.earnedPremium) delete (payload as any).earnedPremium;

            let newPolicyId: string;

            if (isEditMode) {
                const policyRes = await axios.put(`/api/policies/${editId}`, payload);
                newPolicyId = policyRes.data.id;
            } else {
                const policyRes = await axios.post('/api/policies', payload);
                newPolicyId = policyRes.data.id;
            }

            // 4. Upload and attach documents (only for new docs, not edit)
            if (documents.length > 0) {
                for (const doc of documents) {
                    let finalUrl = '';
                    if (doc.mode === 'file' && doc.file) {
                        const docData = new FormData();
                        docData.append('document', doc.file);
                        const uploadRes = await axios.post('/api/upload', docData, { headers: { 'Content-Type': 'multipart/form-data' } });
                        finalUrl = uploadRes.data.url;
                    } else if (doc.mode === 'link' && doc.link) {
                        finalUrl = doc.link;
                    }

                    if (finalUrl) {
                        await axios.post('/api/policy-documents', {
                            policyId: newPolicyId,
                            type: doc.type,
                            url: finalUrl,
                            visibility: 'INTERNAL'
                        });
                    }
                }
            }

            navigate('/policies');
        } catch (error: any) {
            setError(error.response?.data?.error || error.message || 'Failed to save policy.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center flex-col items-center h-64 gap-3 text-slate-500">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Loading...
            </div>
        );
    }

    const renderExtras = () => {
        if (formData.type === 'Vehicle') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Vehicle Number <span className="text-blue-500 font-normal text-xs">(Indexed)</span></label>
                        <div className="relative">
                            <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" value={formData.vehicleNo} onChange={e => setFormData({ ...formData, vehicleNo: e.target.value.toUpperCase() })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono transition-colors sm:text-sm" placeholder="e.g. MH01AB1234" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Vehicle Type</label>
                        <select value={extras.vehicleType || 'Car'} onChange={e => setExtras({ ...extras, vehicleType: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm">
                            <option value="Car">Car</option>
                            <option value="Bike">Bike</option>
                            <option value="Commercial">Commercial/Heavy</option>
                        </select>
                    </div>
                </div>
            );
        }
        if (formData.type === 'Life') {
            // Life details removed per user requirements; Maturity Date is handled via PT (Policy Terms).
            return null;
        }
        if (formData.type === 'Other') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Product Sub-Type</label>
                        <div className="relative">
                            <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select value={formData.otherSubType} onChange={e => setFormData({ ...formData, otherSubType: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm">
                                <option value="FIRE">Fire</option>
                                <option value="WC">WC (Workmen Compensation)</option>
                                <option value="CAR">CAR (Contractor All Risk)</option>
                                <option value="HOME">Home</option>
                                <option value="TRAVEL">Travel</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Specific Remarks</label>
                        <input type="text" value={extras.remark || ''} onChange={e => setExtras({ ...extras, remark: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm" placeholder="Details" />
                    </div>
                </div>
            );
        }
        // Health — no extra fields needed (Members Covered & Plan Name removed)
        return null;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/policies" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{isEditMode ? 'Edit Policy' : 'Add New Policy'}</h1>
                    <p className="text-sm text-slate-500 mt-1">{isEditMode ? 'Update the policy details below.' : 'Register a new insurance policy with complete details.'}</p>
                </div>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-6">
                {error && (
                    <div className="p-4 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl animate-in flip-in-y">
                        {error}
                    </div>
                )}

                {/* Client Details Section */}
                {!isEditMode && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
                        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-500" /> Client Details
                        </h2>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-slate-700">
                                    {isCreatingClient ? 'New Client Information' : 'Select Existing Client'}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => { setIsCreatingClient(!isCreatingClient); setError(''); }}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                                >
                                    {isCreatingClient ? 'Cancel / Choose Existing' : '+ Create New Client'}
                                </button>
                            </div>

                            {isCreatingClient ? (
                                <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-4 animate-in zoom-in-95 duration-200">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-700">Full Name <span className="text-red-500">*</span></label>
                                        <input type="text" required={isCreatingClient} value={newClientData.name} onChange={e => setNewClientData({ ...newClientData, name: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm" placeholder="e.g. John Doe" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-700">Email Address</label>
                                            <input type="email" value={newClientData.email} onChange={e => setNewClientData({ ...newClientData, email: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm" placeholder="john@example.com" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-700">Mobile Number</label>
                                            <input type="tel" value={newClientData.mobile} onChange={e => setNewClientData({ ...newClientData, mobile: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm" placeholder="+1 234 567 8900" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                                        <select required={!isCreatingClient} value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm cursor-pointer font-medium text-slate-700">
                                            {clients.length === 0 ? (
                                                <option value="" disabled>-- No Clients Available --</option>
                                            ) : (
                                                <>
                                                    <option value="" disabled>-- Search & Select a Client --</option>
                                                    {clients.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name} {c.mobile ? `- ${c.mobile}` : ''} {c.email ? `(${c.email})` : ''}</option>
                                                    ))}
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Core Policy Info */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" /> Core Policy info
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Policy Category/Type <span className="text-red-500">*</span></label>
                            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm font-medium">
                                <option value="Life">Life</option>
                                <option value="Health">Health</option>
                                <option value="Vehicle">Vehicle</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Insurance Provider <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input required type="text" value={formData.insurer} onChange={e => setFormData({ ...formData, insurer: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm" placeholder="e.g. LIC, Star Health..." />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Policy Number</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" value={formData.policyNo} onChange={e => setFormData({ ...formData, policyNo: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm" placeholder="Leave blank to auto-generate" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Annual Premium <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input required type="number" step="0.01" min="0" value={formData.premium} onChange={e => {
                                    const val = e.target.value;
                                    setFormData(prev => {
                                        const pd = Number(prev.premiumPaid || 0);
                                        const prem = Number(val || 0);
                                        let ps = 'UNPAID';
                                        if (pd >= prem && prem > 0) ps = 'PAID';
                                        else if (pd > 0) ps = 'PARTIAL';
                                        return { ...prev, premium: val, paymentStatus: ps };
                                    });
                                }} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm font-semibold text-slate-900" placeholder="12000.00" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Premium Mode <span className="text-red-500">*</span></label>
                            <select value={formData.premiumMode} onChange={e => setFormData({ ...formData, premiumMode: e.target.value, customPremiumDays: '' })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm font-medium">
                                <option value="ANNUAL">Annual</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="QUARTERLY">Quarterly</option>
                                <option value="HALF_YEARLY">Half Yearly</option>
                                <option value="CUSTOM_DAYS">Custom Days</option>
                            </select>
                        </div>
                    </div>

                    {formData.premiumMode === 'CUSTOM_DAYS' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Custom Days Interval</label>
                                <input type="number" min="1" max="365" value={formData.customPremiumDays} onChange={e => setFormData({ ...formData, customPremiumDays: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm" placeholder="e.g. 90, 60" />
                            </div>
                        </div>
                    )}

                    <div className={clsx("grid grid-cols-1 gap-4 border-t border-slate-100 pt-4", formData.type === 'Life' ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-slate-700">Premium Paid</label>
                                <span className={clsx("text-xs font-bold px-1.5 py-0.5 rounded",
                                    formData.paymentStatus === 'PAID' ? "bg-emerald-100 text-emerald-700" :
                                        formData.paymentStatus === 'PARTIAL' ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                                )}>{formData.paymentStatus}</span>
                            </div>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="number" step="0.01" min="0" value={formData.premiumPaid} onChange={e => {
                                    const val = e.target.value;
                                    setFormData(prev => {
                                        const pd = Number(val || 0);
                                        const prem = Number(prev.premium || 0);
                                        let ps = 'UNPAID';
                                        if (pd >= prem && prem > 0) ps = 'PAID';
                                        else if (pd > 0) ps = 'PARTIAL';
                                        return { ...prev, premiumPaid: val, paymentStatus: ps };
                                    });
                                }} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm font-medium text-emerald-700" placeholder="0.00" />
                            </div>
                        </div>
                        {formData.type === 'Life' && (
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Earnings / EP</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="number" step="0.01" min="0" value={formData.earnedPremium} onChange={e => setFormData({ ...formData, earnedPremium: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm font-medium" placeholder="Earned Premium" />
                                </div>
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Policy Status</label>
                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm font-medium">
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="PENDING">PENDING</option>
                                <option value="LAPSED">LAPSED</option>
                                <option value="CANCELLED">CANCELLED</option>
                                {formData.type === 'Life' && <option value="MATURITY">MATURITY</option>}
                                {formData.type !== 'Life' && <option value="EXPIRED">EXPIRED</option>}
                            </select>
                        </div>
                    </div>

                    {/* PPT & PT Section */}
                    {formData.type === 'Life' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">PPT <span className="text-xs text-blue-500 font-normal">(Premium Pay Terms — Years)</span></label>
                                <input type="number" min="1" max="100" value={formData.ppt} onChange={e => setFormData({ ...formData, ppt: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm" placeholder="e.g. 10" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">PT <span className="text-xs text-blue-500 font-normal">(Policy Terms — Years)</span></label>
                                <input type="number" min="1" max="100" value={formData.pt} onChange={e => setFormData({ ...formData, pt: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm" placeholder="e.g. 20" />
                            </div>
                        </div>
                    )}

                    {/* Dates & Tenure Section */}
                    <div className={clsx("grid grid-cols-1 gap-4 border-t border-slate-100 pt-4", formData.type === 'Life' ? "sm:grid-cols-2" : "sm:grid-cols-4")}>
                        {formData.type !== 'Life' && (
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-500" /> Tenure <span className="text-red-500">*</span></label>
                                <select value={formData.tenureType} onChange={e => setFormData({ ...formData, tenureType: e.target.value, customTenureMonths: '' })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm font-medium">
                                    <option value="MONTHLY">Monthly (1 Month)</option>
                                    <option value="QUARTERLY">Quarterly (3 Months)</option>
                                    <option value="HALF_YEARLY">Half-Yearly (6 Months)</option>
                                    <option value="YEARLY">Yearly (12 Months)</option>
                                    <option value="CUSTOM">Custom</option>
                                </select>
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Start Date <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input required type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">
                                {formData.type === 'Life' ? 'Maturity / Expiry Date' : 'Expiry / Renewal Date'} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    required
                                    type="date"
                                    value={formData.expiryDate}
                                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                                    readOnly={formData.type !== 'Life' && formData.tenureType !== 'CUSTOM'}
                                    className={clsx(
                                        "w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm font-medium",
                                        (formData.type !== 'Life' && formData.tenureType !== 'CUSTOM')
                                            ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                                            : "bg-slate-50 text-red-600"
                                    )}
                                />
                            </div>
                            {formData.type !== 'Life' && formData.tenureType !== 'CUSTOM' && (
                                <p className="text-[10px] text-blue-500 font-medium">Auto-calculated from tenure</p>
                            )}
                            {formData.type === 'Life' && (
                                <p className="text-[10px] text-blue-500 font-medium">Auto-calculated from PT (Policy Term)</p>
                            )}
                        </div>
                        {formData.type !== 'Life' && (
                            <div className="space-y-1">
                                {formData.tenureType === 'CUSTOM' ? (
                                    <>
                                        <label className="text-sm font-medium text-slate-700">Custom Months <span className="text-xs text-slate-400">(optional)</span></label>
                                        <input
                                            type="number" min="1" max="600"
                                            value={formData.customTenureMonths}
                                            onChange={e => setFormData({ ...formData, customTenureMonths: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm"
                                            placeholder="e.g. 15"
                                        />
                                    </>
                                ) : (
                                    <div className="pt-6">
                                        <p className="text-xs text-slate-400">Auto-select expiry</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4 mt-2 relative z-50">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Referred By (Optional)</label>
                            <div className="relative" ref={suggestionsRef}>
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={referredByInput}
                                    onChange={e => handleReferredByChange(e.target.value)}
                                    onFocus={() => { setShowSuggestions(true); }}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm"
                                    placeholder="Type referrer name or select from list..."
                                />
                                {showSuggestions && (
                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
                                        {!isCreatingRef ? (
                                            <>
                                                {filteredRefs.map((ref: any) => (
                                                    <button
                                                        key={ref.id}
                                                        type="button"
                                                        onClick={() => handleSelectRef(ref)}
                                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors flex items-center justify-between border-b border-slate-50 last:border-0"
                                                    >
                                                        <span className="font-medium text-slate-800">{ref.name}</span>
                                                        <span className="text-xs text-slate-500">{ref.type} {ref.code ? `· ${ref.code}` : ''}</span>
                                                    </button>
                                                ))}
                                                <div className="p-2 border-t border-slate-100 bg-slate-50">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsCreatingRef(true);
                                                            setNewRefName(referredByInput || '');
                                                        }}
                                                        className="w-full py-2 flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 rounded-md transition-colors"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Create New Reference
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="p-4 space-y-3 bg-blue-50/30">
                                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Create Reference</h4>
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={newRefName}
                                                        onChange={e => setNewRefName(e.target.value)}
                                                        placeholder="Reference Name"
                                                        className="w-full px-3 py-2 border border-slate-200 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                    <select
                                                        value={newRefType}
                                                        onChange={e => setNewRefType(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-200 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                    >
                                                        <option value="AGENT">Agent</option>
                                                        <option value="EMPLOYEE">Employee</option>
                                                        <option value="CLIENT">Client</option>
                                                        <option value="DIRECT">Direct/Other</option>
                                                    </select>
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsCreatingRef(false)}
                                                            className="flex-1 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleCreateRef}
                                                            disabled={!newRefName.trim() || isSavingRef}
                                                            className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50"
                                                        >
                                                            {isSavingRef ? 'Saving...' : 'Save & Select'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Assign To (Ownership)</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select value={formData.assignedTo} onChange={e => setFormData({ ...formData, assignedTo: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm">
                                    <option value="">-- Unassigned --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dynamic Extras Block — only show if there are type-specific fields */}
                {(formData.type === 'Life' || formData.type === 'Vehicle' || formData.type === 'Other') && (
                    <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
                        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">
                            {formData.type} Details
                        </h2>
                        {renderExtras()}
                    </div>
                )}

                {/* Documents Section */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-500" /> Documents
                        </h2>
                        <button type="button" onClick={handleAddDocument} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Add Document
                        </button>
                    </div>

                    {documents.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-sm border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                            No documents attached yet. Click Add Document.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {documents.map((doc, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center p-3 border border-slate-200 rounded-xl bg-slate-50 animate-in slide-in-from-right-4 duration-300">
                                    <select value={doc.type} onChange={e => handleUpdateDocument(idx, 'type', e.target.value)} className="w-full sm:w-40 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20">
                                        <option value="Policy PDF">Policy PDF</option>
                                        <option value="RC Book">RC Book</option>
                                        <option value="PAN Card">PAN Card</option>
                                        <option value="Aadhaar">Aadhaar</option>
                                        <option value="Medical Report">Medical Report</option>
                                        <option value="Proposal Form">Proposal Form</option>
                                        <option value="Other">Other</option>
                                    </select>

                                    <div className="flex-1 flex gap-2 w-full">
                                        <button type="button" onClick={() => handleUpdateDocument(idx, 'mode', doc.mode === 'file' ? 'link' : 'file')} className="px-2 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shrink-0">
                                            {doc.mode === 'file' ? 'Use Link' : 'Use File'}
                                        </button>

                                        {doc.mode === 'file' ? (
                                            <input type="file" onChange={e => handleUpdateDocument(idx, 'file', e.target.files?.[0])} className="block w-full text-sm text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer bg-white border border-slate-200 rounded-md" />
                                        ) : (
                                            <div className="relative flex-1">
                                                <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input type="url" value={doc.link} onChange={e => handleUpdateDocument(idx, 'link', e.target.value)} className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500/20" placeholder="https://..." />
                                            </div>
                                        )}
                                    </div>

                                    <button type="button" onClick={() => handleRemoveDocument(idx)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 space-y-1 border-t border-slate-100 pt-4">
                        <label className="text-sm font-medium text-slate-700">Internal Notes</label>
                        <textarea rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm resize-none" placeholder="Any private remarks or notes regarding this policy..."></textarea>
                    </div>
                </div>

                {/* Terms & Conditions Section */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-5">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-500" /> Terms, Conditions & Remarks
                    </h2>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Payment Terms</label>
                        <select
                            value={paymentTermsTemplates.includes(formData.paymentTerms) ? formData.paymentTerms : '__custom__'}
                            onChange={e => {
                                if (e.target.value === '__custom__') return;
                                setFormData({ ...formData, paymentTerms: e.target.value });
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm"
                        >
                            <option value="">-- Select Payment Terms --</option>
                            {paymentTermsTemplates.map((t, i) => (
                                <option key={i} value={t}>{t}</option>
                            ))}
                            <option value="__custom__">Custom (type below)</option>
                        </select>
                        <textarea
                            rows={2}
                            value={formData.paymentTerms}
                            onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm resize-none mt-2"
                            placeholder="Custom payment terms or override selected template..."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Policy Terms & Conditions</label>
                        <textarea
                            rows={3}
                            value={formData.policyTerms}
                            onChange={e => setFormData({ ...formData, policyTerms: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm resize-none"
                            placeholder="Standard terms and conditions for this policy..."
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Internal Remarks</label>
                            <textarea
                                rows={2}
                                value={formData.remarks}
                                onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm resize-none"
                                placeholder="Internal remarks (not visible to client)..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Client Visible Notes <span className="text-xs text-slate-400">(Optional)</span></label>
                            <textarea
                                rows={2}
                                value={formData.clientVisibleNotes}
                                onChange={e => setFormData({ ...formData, clientVisibleNotes: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:text-sm resize-none"
                                placeholder="Notes visible to the client..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 justify-end pt-2 pb-12">
                    <Link to="/policies" className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold transition-colors text-sm shadow-sm">
                        Cancel
                    </Link>
                    <button type="submit" disabled={isSaving || (!isEditMode && !isCreatingClient && clients.length === 0)} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 text-sm flex items-center justify-center shadow-lg shadow-blue-600/20">
                        {isSaving ? (
                            <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</div>
                        ) : isEditMode ? 'Update Policy' : 'Create Policy & Automate Renewal'}
                    </button>
                </div>
            </form>
        </div>
    );
}
