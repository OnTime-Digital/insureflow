import { useState, useEffect, useCallback } from 'react';
import {
    Search, Plus, Edit, Trash2,
    X, Phone, Mail, User,
    Download, Upload, Eye, ShieldCheck,
    ChevronLeft, ChevronRight,
    MessageCircle, PhoneCall, ChevronsUpDown
} from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import ImportMappingModal from '../components/ImportMappingModal';
import type { RequiredField } from '../components/ImportMappingModal';

type Client = {
    id: string;
    name: string;
    email: string | null;
    mobile: string | null;
    kycStatus: string | null;
    notes: string | null;
    createdAt: string;
    _count?: { policies: number };
    activePolicyCount: number;
    nextRenewalDate: string | null;
    renewalUrgent: boolean;
};

type Pagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });

    // Search & Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterKycStatus, setFilterKycStatus] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [formData, setFormData] = useState({
        name: '', email: '', mobile: '', kycStatus: 'Pending', notes: ''
    });
    const [formError, setFormError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Import mapping
    const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    const [excelRows, setExcelRows] = useState<any[]>([]);

    const clientRequiredFields: RequiredField[] = [
        { key: 'name', label: 'Client Name', required: true },
        { key: 'email', label: 'Email Address' },
        { key: 'mobile', label: 'Mobile Number' },
        { key: 'kycStatus', label: 'KYC Status' },
        { key: 'notes', label: 'Notes' },
    ];

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const setPage = (page: number) => {
        setPagination(prev => ({ ...prev, page }));
    };

    const fetchClients = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params: any = {
                page,
                limit: 25,
                sortBy,
                sortOrder
            };
            if (debouncedSearch) params.search = debouncedSearch;
            if (filterKycStatus) params.kycStatus = filterKycStatus;

            const response = await axios.get('/api/clients', { params });
            setClients(response.data.data || []);
            setPagination(response.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
        } catch (error) {
            console.error("Error fetching clients:", error);
            setClients([]);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, filterKycStatus, sortBy, sortOrder]);

    useEffect(() => {
        fetchClients(pagination.page);
    }, [fetchClients, pagination.page]);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await axios.get('/api/clients/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'clients_export.csv');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("Export error:", error);
            alert("Failed to export clients.");
        } finally {
            setIsExporting(false);
        }
    };

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
        e.target.value = '';
    };

    const handleConfirmMapping = async (mapping: Record<string, string>) => {
        setIsMappingModalOpen(false);
        setIsImporting(true);

        try {
            const mappedData = excelRows.map(row => {
                const obj: any = {};
                clientRequiredFields.forEach(field => {
                    const headerName = mapping[field.key];
                    if (headerName) {
                        const colIndex = excelHeaders.indexOf(headerName);
                        if (colIndex !== -1) {
                            obj[field.key] = row[colIndex];
                        }
                    }
                });
                return obj;
            }).filter(obj => obj.name);

            const res = await axios.post('/api/clients/import-json', { clients: mappedData, mode: 'skip' });
            alert(res.data.message || 'Import successful!');
            fetchClients(1);
        } catch (error: any) {
            console.error("Import error:", error);
            alert(error.response?.data?.error || "Failed to import clients.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleOpenModal = (client?: Client) => {
        setFormError('');
        if (client) {
            setEditingClient(client);
            setFormData({
                name: client.name,
                email: client.email || '',
                mobile: client.mobile || '',
                kycStatus: client.kycStatus || 'Pending',
                notes: client.notes || '',
            });
        } else {
            setEditingClient(null);
            setFormData({ name: '', email: '', mobile: '', kycStatus: 'Pending', notes: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
    };

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setIsSaving(true);

        if (formData.mobile) {
            const cleanMobile = formData.mobile.replace(/\s+/g, '');
            const mobileRegex = /^(\+91|91)?[6-9]\d{9}$/;
            if (!mobileRegex.test(cleanMobile)) {
                setFormError('Invalid mobile number. Please enter a valid 10-digit Indian number.');
                setIsSaving(false);
                return;
            }
        }

        try {
            if (editingClient) {
                await axios.put(`/api/clients/${editingClient.id}`, formData);
            } else {
                await axios.post('/api/clients', formData);
            }
            await fetchClients(pagination.page);
            handleCloseModal();
        } catch (error: any) {
            setFormError(error.response?.data?.error || 'Failed to save client. Please check your inputs.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClient = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) return;

        try {
            await axios.delete(`/api/clients/${id}`);
            fetchClients(pagination.page);
        } catch (error) {
            console.error("Error deleting client:", error);
            alert("Failed to delete client.");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clients</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage your client directory and contact information.
                        {pagination.total > 0 && <span className="ml-2 font-medium text-slate-700">({pagination.total} total)</span>}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExporting ? <div className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                        <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export CSV'}</span>
                    </button>

                    <label className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer mb-0">
                        {isImporting ? <div className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="hidden sm:inline">{isImporting ? 'Importing...' : 'Import'}</span>
                        <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImport} disabled={isImporting} />
                    </label>

                    <Link
                        to="/clients/new"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Client
                    </Link>
                </div>
            </div>

            {/* List & Controls */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between bg-slate-50/50">
                    <div className="relative w-full sm:w-80 shrink-0">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, mobile, email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                        <select value={filterKycStatus} onChange={e => { setFilterKycStatus(e.target.value); setPage(1); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 min-w-[130px] focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                            <option value="">All KYC</option>
                            <option value="Verified">Verified</option>
                            <option value="Pending">Pending</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1.5">Client Name <ChevronsUpDown className="w-3.5 h-3.5" /></div>
                                </th>
                                <th className="px-4 py-3">Contact Info</th>
                                <th className="px-4 py-3">KYC</th>
                                <th className="px-4 py-3">Active Policies</th>
                                <th className="px-4 py-3">Next Renewal</th>
                                <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('createdAt')}>
                                    <div className="flex items-center gap-1.5">Added <ChevronsUpDown className="w-3.5 h-3.5" /></div>
                                </th>
                                <th className="px-4 py-3 text-right w-[140px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-3">
                                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            Loading clients...
                                        </div>
                                    </td>
                                </tr>
                            ) : clients.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                                        No clients found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client) => (
                                    <tr key={client.id} className={clsx(
                                        "hover:bg-slate-50/80 transition-colors group",
                                        client.renewalUrgent && "bg-amber-50/40 hover:bg-amber-50/60"
                                    )}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-full font-bold flex items-center justify-center shrink-0 text-sm",
                                                    client.renewalUrgent ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                                )}>
                                                    {client.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <Link
                                                        to={`/clients/${client.id}`}
                                                        className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                                                    >
                                                        {client.name}
                                                    </Link>
                                                    {client.renewalUrgent && (
                                                        <p className="text-xs text-amber-600 font-medium mt-0.5">⚠ Renewal due soon</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5 text-slate-600 text-xs">
                                                {client.email && <div className="flex items-center gap-1.5 truncate max-w-[180px]"><Mail className="w-3 h-3 text-slate-400 shrink-0" /> {client.email}</div>}
                                                {client.mobile && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400 shrink-0" /> {client.mobile}</div>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={clsx("px-2.5 py-1 rounded-md text-xs font-bold",
                                                client.kycStatus === 'Verified' ? "bg-emerald-100 text-emerald-700" :
                                                    client.kycStatus === 'Pending' ? "bg-yellow-100 text-yellow-700" :
                                                        "bg-slate-100 text-slate-700"
                                            )}>
                                                {client.kycStatus || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-700">
                                            {client.activePolicyCount || 0}
                                        </td>
                                        <td className="px-4 py-3">
                                            {client.nextRenewalDate ? (
                                                <span className={clsx("text-sm font-medium", client.renewalUrgent ? "text-amber-600" : "text-slate-600")}>
                                                    {format(new Date(client.nextRenewalDate), 'MMM dd, yyyy')}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                            {format(new Date(client.createdAt), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="px-4 py-3 text-right w-[140px]">
                                            <div className="flex items-center justify-end gap-0.5">
                                                <Link to={`/clients/${client.id}`} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Profile">
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <button onClick={() => handleOpenModal(client)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <Link to={`/policies/new?clientId=${client.id}`} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Add Policy">
                                                    <ShieldCheck className="w-4 h-4" />
                                                </Link>
                                                {client.mobile && (
                                                    <>
                                                        <a href={`https://wa.me/${client.mobile.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="WhatsApp">
                                                            <MessageCircle className="w-4 h-4" />
                                                        </a>
                                                        <a href={`tel:${client.mobile}`} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Call">
                                                            <PhoneCall className="w-4 h-4" />
                                                        </a>
                                                    </>
                                                )}
                                                <button onClick={() => handleDeleteClient(client.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <p className="text-sm text-slate-500">
                            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => fetchClients(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (pagination.totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (pagination.page <= 3) {
                                    pageNum = i + 1;
                                } else if (pagination.page >= pagination.totalPages - 2) {
                                    pageNum = pagination.totalPages - 4 + i;
                                } else {
                                    pageNum = pagination.page - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => fetchClients(pageNum)}
                                        className={clsx(
                                            "w-9 h-9 rounded-lg text-sm font-medium transition-colors",
                                            pagination.page === pageNum
                                                ? "bg-blue-600 text-white"
                                                : "text-slate-600 hover:bg-white border border-slate-200"
                                        )}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => fetchClients(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h2 className="text-lg font-bold text-slate-900">{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
                            <button onClick={handleCloseModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveClient} className="p-5 space-y-4 overflow-y-auto">
                            {formError && (
                                <div className="p-3 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                                    {formError}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Full Name <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm" placeholder="e.g. John Doe" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Mobile <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input required type="text" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm" placeholder="9876543210" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm" placeholder="john@example.com" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">KYC Status</label>
                                <select value={formData.kycStatus} onChange={e => setFormData({ ...formData, kycStatus: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm">
                                    <option value="Pending">Pending</option>
                                    <option value="Verified">Verified</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Notes</label>
                                <textarea rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm resize-none" placeholder="Important client details..."></textarea>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors text-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm flex items-center justify-center">
                                    {isSaving ? 'Saving...' : (editingClient ? 'Save Changes' : 'Add Client')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ImportMappingModal
                isOpen={isMappingModalOpen}
                onClose={() => setIsMappingModalOpen(false)}
                onConfirm={handleConfirmMapping}
                headers={excelHeaders}
                requiredFields={clientRequiredFields}
                title="Map Client Fields"
            />
        </div>
    );
}
