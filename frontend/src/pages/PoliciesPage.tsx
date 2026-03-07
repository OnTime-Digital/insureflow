import { useState, useEffect } from 'react';
import {
    Search, Plus, Trash2,
    IndianRupee,
    Download, Upload, Eye, RefreshCw, X, CheckSquare
} from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';
import { format, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import ImportMappingModal from '../components/ImportMappingModal';
import type { RequiredField } from '../components/ImportMappingModal';
import { useAuth } from '../contexts/AuthContext';

type Client = {
    id: string;
    name: string;
    email: string | null;
    mobile: string | null;
};

type Policy = {
    id: string;
    type: string;
    insurer: string;
    policyNo: string;
    premium: number;
    premiumPaid: number;
    status: string;
    paymentStatus: string;
    startDate: string;
    expiryDate: string;
    earnedPremium: number | null;
    referenceId: string | null;
    reference: { name: string; type: string; code: string | null } | null;
    assignedUser?: { name: string; role: string } | null;
    attachments: string | null;
    client: Client;
    _count?: {
        policyDocuments: number;
    };
};

export default function PoliciesPage() {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [references, setReferences] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Filters
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterInsurer, setFilterInsurer] = useState('');
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
    const [filterRenewalWindow, setFilterRenewalWindow] = useState('');
    const [filterReferenceId, setFilterReferenceId] = useState('');
    const [filterAssignedTo, setFilterAssignedTo] = useState('');

    // Sorting
    const [sortBy, setSortBy] = useState('expiryDate');
    const [sortOrder, setSortOrder] = useState('asc');

    // Import/Export
    const [isImporting, setIsImporting] = useState(false);
    const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    const [excelRows, setExcelRows] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const { user } = useAuth();
    const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '50',
                sortBy,
                sortOrder
            });

            if (searchQuery) params.append('search', searchQuery);
            if (filterStatus) params.append('status', filterStatus);
            if (filterType) params.append('type', filterType);
            if (filterInsurer) params.append('insurer', filterInsurer);
            if (filterPaymentStatus) params.append('paymentStatus', filterPaymentStatus);
            if (filterRenewalWindow) params.append('renewalWindow', filterRenewalWindow);
            if (filterReferenceId) params.append('referenceId', filterReferenceId);

            if (filterAssignedTo) {
                params.append('assignedTo', filterAssignedTo);
            } else if (!isManagerOrAdmin && user) {
                params.append('assignedTo', user.id);
            }

            const [policiesRes, refsRes, empRes] = await Promise.all([
                axios.get(`/api/policies?${params.toString()}`),
                axios.get('/api/references?status=ACTIVE'),
                axios.get('/api/employees?isActive=true')
            ]);

            setPolicies(policiesRes.data.data || []);
            setTotalPages(policiesRes.data.totalPages || 1);
            setTotalItems(policiesRes.data.total || 0);
            setReferences(refsRes.data || []);
            setEmployees(empRes.data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when dependencies change, except search which is debounced or manual
    useEffect(() => {
        const handler = setTimeout(() => {
            fetchData();
        }, 300); // 300ms debounce
        return () => clearTimeout(handler);
    }, [page, sortBy, sortOrder, filterStatus, filterType, filterInsurer, filterPaymentStatus, filterRenewalWindow, filterReferenceId, filterAssignedTo, searchQuery, isManagerOrAdmin, user]);

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.append('status', filterStatus);
            if (filterType) params.append('type', filterType);
            if (filterInsurer) params.append('insurer', filterInsurer);
            if (filterPaymentStatus) params.append('paymentStatus', filterPaymentStatus);
            if (filterReferenceId) params.append('referenceId', filterReferenceId);

            if (filterAssignedTo) {
                params.append('assignedTo', filterAssignedTo);
            } else if (!isManagerOrAdmin && user) {
                params.append('assignedTo', user.id);
            }

            const response = await axios.get(`/api/policies/export?${params.toString()}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'policies_export.csv');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("Export error:", error);
            alert("Failed to export policies.");
        }
    };

    const handleDeletePolicy = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this policy?')) return;
        try {
            await axios.delete(`/api/policies/${id}`);
            fetchData();
        } catch (error) {
            console.error("Error deleting policy:", error);
            alert("Failed to delete policy.");
        }
    };

    // Bulk select helpers
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };
    const toggleSelectAll = () => {
        if (selectedIds.size === policies.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(policies.map(p => p.id)));
    };
    const clearSelection = () => setSelectedIds(new Set());

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.size} selected policies? This cannot be undone.`)) return;
        try {
            await axios.post('/api/policies/bulk-delete', { ids: Array.from(selectedIds) });
            clearSelection();
            fetchData();
        } catch { alert('Failed to bulk delete.'); }
    };

    const handleBulkStatus = async (status: string) => {
        try {
            await axios.put('/api/policies/bulk-status', { ids: Array.from(selectedIds), status });
            clearSelection();
            fetchData();
        } catch { alert('Failed to bulk update status.'); }
    };

    const handleMarkPaid = async (policy: Policy) => {
        if (!window.confirm(`Mark policy ${policy.policyNo} as fully PAID?`)) return;
        try {
            await axios.put(`/api/policies/${policy.id}`, {
                premiumPaid: policy.premium,
                paymentStatus: 'PAID'
            });
            fetchData();
        } catch (error) {
            console.error("Error updating payment:", error);
            alert("Failed to update payment status.");
        }
    };

    // Derived lists for filters (Using client data is better but for now we use what we have or static)
    const uniqueTypes = ['Life', 'Health', 'Vehicle', 'Other'];
    // In a real app we would fetch unique insurers from an endpoint, but we can just use static or currently loaded for now
    const uniqueInsurers = Array.from(new Set(policies.map(p => p.insurer))).filter(Boolean);

    // Import logic
    const policyRequiredFields: RequiredField[] = [
        { key: 'clientName', label: 'Client Name', required: true },
        { key: 'policyNo', label: 'Policy Number', required: true },
        { key: 'insurer', label: 'Insurer Company', required: true },
        { key: 'premium', label: 'Premium Amount', required: true },
        { key: 'type', label: 'Policy Type' },
        { key: 'startDate', label: 'Start Date' },
        { key: 'expiryDate', label: 'Expiry Date' }
    ];

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

                if (data.length > 0) {
                    let headerIndex = 0;
                    for (let i = 0; i < Math.min(10, data.length); i++) {
                        if (data[i] && data[i].length > 3) {
                            headerIndex = i;
                            break;
                        }
                    }
                    const headers = data[headerIndex] as string[];
                    const rows = data.slice(headerIndex + 1);
                    if (!headers || headers.length === 0) throw new Error("Could not find headers");
                    setExcelHeaders(headers.map((h, idx) => h ? String(h).trim() : `Unknown Column ${idx}`));
                    setExcelRows(rows);
                    setIsMappingModalOpen(true);
                }
            } catch (err: any) {
                console.error("Error reading file:", err);
                alert("Failed to read the file.");
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = ''; // Reset
    };

    const handleConfirmMapping = async (mapping: Record<string, string>) => {
        setIsMappingModalOpen(false);
        setIsImporting(true);
        try {
            const mappedData = excelRows.map(row => {
                const obj: any = {};
                policyRequiredFields.forEach(field => {
                    const headerName = mapping[field.key];
                    if (headerName) {
                        const colIndex = excelHeaders.indexOf(headerName);
                        if (colIndex !== -1) {
                            obj[field.key] = row[colIndex];
                        }
                    }
                });
                return obj;
            }).filter(obj => obj.clientName && obj.insurer && obj.premium);

            const res = await axios.post('/api/policies/import-json', { policies: mappedData });
            alert(res.data.message || 'Import successful!');
            fetchData();
        } catch (error: any) {
            console.error("Import error:", error);
            alert(error.response?.data?.error || "Failed to import policies.");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Policies</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage {totalItems > 0 ? totalItems : ''} active insurance policies across your client base.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>

                    <label className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer mb-0">
                        {isImporting ? <div className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="hidden sm:inline">{isImporting ? 'Importing...' : 'Import'}</span>
                        <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImport} disabled={isImporting} />
                    </label>

                    <Link
                        to="/policies/new"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Policy
                    </Link>
                </div>
            </div>

            {/* List & Controls */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="relative w-full sm:w-96 shrink-0">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by policy no, client, mobile, vehicle or insurer..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 flex-1 min-w-[130px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm">
                            <option value="">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="PENDING">Pending</option>
                            <option value="EXPIRED">Expired</option>
                            <option value="LAPSED">Lapsed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 flex-1 min-w-[130px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm">
                            <option value="">All Types</option>
                            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={filterInsurer} onChange={e => { setFilterInsurer(e.target.value); setPage(1); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 flex-1 min-w-[130px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm">
                            <option value="">All Insurers</option>
                            {uniqueInsurers.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                        <select value={filterPaymentStatus} onChange={e => { setFilterPaymentStatus(e.target.value); setPage(1); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 flex-1 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm">
                            <option value="">Payment: All</option>
                            <option value="UNPAID">Unpaid</option>
                            <option value="PARTIAL">Partial</option>
                            <option value="PAID">Fully Paid</option>
                        </select>
                        <select value={filterRenewalWindow} onChange={e => { setFilterRenewalWindow(e.target.value); setPage(1); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 flex-1 min-w-[150px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm">
                            <option value="">Renewal Due: Any</option>
                            <option value="7">Next 7 days</option>
                            <option value="30">Next 30 days</option>
                            <option value="90">Next 90 days</option>
                        </select>
                        <select value={filterReferenceId} onChange={e => { setFilterReferenceId(e.target.value); setPage(1); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 flex-1 min-w-[150px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm">
                            <option value="">Referred By: All</option>
                            <option value="DIRECT">Direct (No Referrer)</option>
                            {references.map(ref => (
                                <option key={ref.id} value={ref.id}>{ref.name} ({ref.type})</option>
                            ))}
                        </select>
                        <select
                            value={filterAssignedTo}
                            onChange={e => { setFilterAssignedTo(e.target.value); setPage(1); }}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 flex-1 min-w-[150px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm disabled:opacity-70"
                            disabled={!isManagerOrAdmin}
                        >
                            <option value="">Assigned To: All</option>
                            <option value="UNASSIGNED">Unassigned</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={policies.length > 0 && selectedIds.size === policies.length}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                                    />
                                </th>
                                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => { setSortBy('policyNo'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Policy No</th>
                                <th className="px-4 py-3">Client</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Premium (₹)</th>
                                <th className="px-4 py-3">Assigned To</th>
                                <th className="px-4 py-3">Referred By</th>
                                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => { setSortBy('expiryDate'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Renewal</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right w-[90px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-3">
                                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            Loading policies...
                                        </div>
                                    </td>
                                </tr>
                            ) : policies.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                                        No policies found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                policies.map((policy) => {
                                    const daysToExpiry = differenceInDays(new Date(policy.expiryDate), new Date());
                                    const isDueSoon = daysToExpiry <= 30 && daysToExpiry >= 0;
                                    const isExpired = daysToExpiry < 0;
                                    const hasDocs = (policy._count?.policyDocuments || 0) > 0 || !!policy.attachments;

                                    return (
                                        <tr key={policy.id} className={clsx("hover:bg-slate-50/80 transition-colors group", selectedIds.has(policy.id) && "bg-blue-50/60")}>
                                            <td className="px-4 py-3 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(policy.id)}
                                                    onChange={() => toggleSelect(policy.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-mono text-slate-700 font-semibold">{policy.policyNo}</div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Payment: <span className={clsx("font-medium",
                                                        policy.paymentStatus === 'PAID' ? "text-emerald-600" :
                                                            policy.paymentStatus === 'PARTIAL' ? "text-orange-500" : "text-red-500"
                                                    )}>{policy.paymentStatus}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link to={`/clients/${policy.client.id}`} className="text-slate-900 font-medium hover:text-blue-600 hover:underline">
                                                    {policy.client.name}
                                                </Link>
                                                <div className="text-xs text-slate-500 mt-0.5">{policy.client.mobile || policy.client.email || 'No contact info'}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-700">{policy.type}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{policy.insurer}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">₹{policy.premium.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                <div className="text-xs text-slate-500 mt-0.5 flex flex-col gap-0.5">
                                                    <span>Paid: ₹{(policy.premiumPaid || 0).toLocaleString('en-IN')}</span>
                                                    {policy.type === 'Life' && policy.earnedPremium !== null && (
                                                        <span className="text-emerald-600 font-semibold">EP: ₹{(policy.earnedPremium).toLocaleString('en-IN')}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {policy.assignedUser ? (
                                                    <div className="text-sm font-medium text-slate-700">{policy.assignedUser.name}</div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-xs">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {policy.reference ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-800">{policy.reference.name}</span>
                                                        <span className="text-xs text-slate-400">{policy.reference.type}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-slate-700 font-medium">
                                                    {format(new Date(policy.expiryDate), 'MMM dd, yyyy')}
                                                </div>
                                                <div className="mt-1 flex gap-1">
                                                    {isExpired && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                                            Expired {-daysToExpiry}d ago
                                                        </span>
                                                    )}
                                                    {isDueSoon && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                                            Due in {daysToExpiry}d
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <span className={clsx("px-2 py-0.5 rounded text-xs font-bold w-max shadow-sm",
                                                        policy.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" :
                                                            policy.status === 'PENDING' ? "bg-yellow-100 text-yellow-700" :
                                                                policy.status === 'LAPSED' ? "bg-orange-100 text-orange-700" :
                                                                    "bg-slate-100 text-slate-700"
                                                    )}>
                                                        {policy.status}
                                                    </span>
                                                    <span className={clsx("px-2 py-0.5 rounded text-[10px] font-semibold w-max border",
                                                        hasDocs ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-slate-50 text-slate-500 border-slate-200"
                                                    )}>
                                                        {hasDocs ? 'Docs attached' : 'No Docs'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right w-[90px]">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <Link to={`/policies/${policy.id}`} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Policy Details">
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    {policy.paymentStatus !== 'PAID' && (
                                                        <button onClick={() => handleMarkPaid(policy)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Mark Paid">
                                                            <IndianRupee className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <Link to={`/policies/${policy.id}`} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Manage Renewals">
                                                        <RefreshCw className="w-4 h-4" />
                                                    </Link>
                                                    <button onClick={() => handleDeletePolicy(policy.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Policy">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            Showing <span className="font-semibold text-slate-700">{(page - 1) * 50 + 1}</span> to <span className="font-semibold text-slate-700">{Math.min(page * 50, totalItems)}</span> of <span className="font-semibold text-slate-700">{totalItems}</span> policies
                        </span>
                        <div className="flex gap-1">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50 transition-colors shadow-sm"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50 transition-colors shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-semibold">{selectedIds.size} selected</span>
                        </div>
                        <div className="w-px h-6 bg-slate-600" />
                        <select
                            defaultValue=""
                            onChange={e => { if (e.target.value) { handleBulkStatus(e.target.value); e.target.value = ''; } }}
                            className="bg-slate-800 text-white text-sm px-3 py-1.5 rounded-lg border border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        >
                            <option value="" disabled>Change Status...</option>
                            <option value="ACTIVE">Set Active</option>
                            <option value="LAPSED">Set Lapsed</option>
                            <option value="CANCELLED">Set Cancelled</option>
                            <option value="EXPIRED">Set Expired</option>
                        </select>
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                        </button>
                        <button
                            onClick={clearSelection}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            title="Clear selection"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <ImportMappingModal
                isOpen={isMappingModalOpen}
                onClose={() => setIsMappingModalOpen(false)}
                onConfirm={handleConfirmMapping}
                headers={excelHeaders}
                requiredFields={policyRequiredFields}
                title="Map Policy Fields"
            />
        </div>
    );
}
