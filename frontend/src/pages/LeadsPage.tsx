import { useState, useEffect } from 'react';
import {
    Search, Plus, Edit, Trash2, X,
    Phone, Mail, UserPlus, FileText, User,
    LayoutGrid, List, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';
import { format } from 'date-fns';

type Lead = {
    id: string;
    name: string;
    email: string | null;
    mobile: string | null;
    interestedPolicy: string | null;
    status: string;
    notes: string | null;
    createdAt: string;
};

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUOTE_SENT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
const POLICY_TYPES = ['Life', 'Health', 'Vehicle', 'Home', 'Other_Gen'];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; headerBg: string }> = {
    'NEW': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', headerBg: 'bg-blue-100' },
    'CONTACTED': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', headerBg: 'bg-purple-100' },
    'QUOTE_SENT': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', headerBg: 'bg-orange-100' },
    'NEGOTIATION': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500', headerBg: 'bg-yellow-100' },
    'CLOSED_WON': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', headerBg: 'bg-emerald-100' },
    'CLOSED_LOST': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', headerBg: 'bg-red-100' },
};

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [formData, setFormData] = useState({
        name: '', email: '', mobile: '', interestedPolicy: 'Life', status: 'NEW', notes: ''
    });
    const [formError, setFormError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const leadsRes = await axios.get('/api/leads');
            setLeads(leadsRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (lead?: Lead) => {
        setFormError('');
        if (lead) {
            setEditingLead(lead);
            setFormData({
                name: lead.name,
                email: lead.email || '',
                mobile: lead.mobile || '',
                interestedPolicy: lead.interestedPolicy || 'Life',
                status: lead.status || 'NEW',
                notes: lead.notes || '',
            });
        } else {
            setEditingLead(null);
            setFormData({
                name: '', email: '', mobile: '', interestedPolicy: 'Life', status: 'NEW', notes: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingLead(null);
    };

    const handleSaveLead = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setIsSaving(true);

        try {
            if (editingLead) {
                await axios.put(`/api/leads/${editingLead.id}`, formData);
            } else {
                await axios.post('/api/leads', formData);
            }
            fetchData();
            handleCloseModal();
        } catch (error: any) {
            setFormError(error.response?.data?.error || 'Failed to save lead.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLead = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this lead?')) return;
        try {
            await axios.delete(`/api/leads/${id}`);
            fetchData();
        } catch (error) {
            console.error("Error deleting lead:", error);
            alert("Failed to delete lead.");
        }
    };

    const updateLeadStatusQuick = async (id: string, newStatus: string) => {
        try {
            await axios.put(`/api/leads/${id}`, { status: newStatus });
            fetchData();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const moveLeadToNextStage = async (lead: Lead) => {
        const currentIndex = LEAD_STATUSES.indexOf(lead.status);
        if (currentIndex < LEAD_STATUSES.length - 1) {
            await updateLeadStatusQuick(lead.id, LEAD_STATUSES[currentIndex + 1]);
        }
    };

    const filteredLeads = leads.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.mobile && l.mobile.includes(searchQuery)) ||
        (l.email && l.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lead Pipeline</h1>
                    <p className="text-sm text-slate-500 mt-1">Track and manage prospective clients through your sales funnel.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-0.5">
                        <button
                            onClick={() => setViewMode('table')}
                            className={clsx(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                viewMode === 'table'
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <List className="w-4 h-4" />
                            Table
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={clsx(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                viewMode === 'kanban'
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Board
                        </button>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Lead
                    </button>
                </div>
            </div>

            {/* Search (shared) */}
            <div className="relative w-full sm:w-96">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search leads by prospect name, email, or mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
            </div>

            {/* ====== TABLE VIEW ====== */}
            {viewMode === 'table' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Prospect Info</th>
                                    <th className="px-4 py-3">Pipeline Status</th>
                                    <th className="px-4 py-3">Required Policy</th>
                                    <th className="px-4 py-3">Internal Notes</th>
                                    <th className="px-4 py-3">Added On</th>
                                    <th className="px-4 py-3 text-right w-[90px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                            <div className="flex justify-center items-center gap-3">
                                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                Loading pipeline...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                            No leads found in the pipeline.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLeads.map((lead) => (
                                        <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                                                        <UserPlus className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{lead.name}</div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {lead.mobile && <span className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.mobile}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={lead.status}
                                                    onChange={(e) => updateLeadStatusQuick(lead.id, e.target.value)}
                                                    className={clsx(
                                                        "px-2.5 py-1.5 rounded-md text-xs font-bold border-0 cursor-pointer focus:ring-2 focus:ring-blue-500/20 transition-colors",
                                                        lead.status === 'NEW' ? "bg-blue-100 text-blue-700" :
                                                            lead.status === 'CONTACTED' ? "bg-purple-100 text-purple-700" :
                                                                lead.status === 'QUOTE_SENT' ? "bg-orange-100 text-orange-700" :
                                                                    lead.status === 'NEGOTIATION' ? "bg-yellow-100 text-yellow-700" :
                                                                        lead.status === 'CLOSED_WON' ? "bg-emerald-100 text-emerald-700" :
                                                                            "bg-red-100 text-red-700"
                                                    )}
                                                >
                                                    {LEAD_STATUSES.map(status => (
                                                        <option key={status} value={status} className="bg-white text-slate-900">{status.replace('_', ' ')}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-900">
                                                    {lead.interestedPolicy || 'Unknown'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs text-slate-500 mt-1 max-w-[200px] truncate" title={lead.notes || ''}>
                                                    {lead.notes || <span className="italic">No notes</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">
                                                <span className="flex items-center gap-1.5">
                                                    <FileText className="w-3.5 h-3.5" />
                                                    {format(new Date(lead.createdAt), 'MMM dd, yyyy')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right w-[90px]">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <button onClick={() => handleOpenModal(lead)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Lead Details">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteLead(lead.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Lead">
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
                </div>
            )}

            {/* ====== KANBAN VIEW ====== */}
            {viewMode === 'kanban' && (
                <div className="overflow-x-auto pb-4">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="flex gap-4 min-w-max">
                            {LEAD_STATUSES.map(status => {
                                const colors = STATUS_COLORS[status];
                                const columnLeads = filteredLeads.filter(l => l.status === status);
                                return (
                                    <div key={status} className="w-72 shrink-0 flex flex-col">
                                        {/* Column Header */}
                                        <div className={clsx("rounded-t-xl px-4 py-3 flex items-center justify-between", colors.headerBg)}>
                                            <div className="flex items-center gap-2">
                                                <div className={clsx("w-2.5 h-2.5 rounded-full", colors.dot)}></div>
                                                <span className={clsx("text-sm font-bold", colors.text)}>
                                                    {status.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full", colors.bg, colors.text)}>
                                                {columnLeads.length}
                                            </span>
                                        </div>

                                        {/* Cards container */}
                                        <div className={clsx("rounded-b-xl border-x border-b p-3 flex flex-col gap-3 min-h-[200px] flex-1", colors.border, "bg-slate-50/50")}>
                                            {columnLeads.length === 0 ? (
                                                <div className="flex-1 flex items-center justify-center">
                                                    <p className="text-xs text-slate-400 italic">No leads</p>
                                                </div>
                                            ) : (
                                                columnLeads.map(lead => (
                                                    <div
                                                        key={lead.id}
                                                        className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all p-4 space-y-3 group/card"
                                                    >
                                                        {/* Lead Name + Edit */}
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", colors.bg, colors.text)}>
                                                                    {lead.name.substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-sm text-slate-900 leading-tight">{lead.name}</p>
                                                                    {lead.interestedPolicy && (
                                                                        <p className="text-xs text-slate-500 mt-0.5">{lead.interestedPolicy}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                                <button onClick={() => handleOpenModal(lead)} className="p-1 text-slate-400 hover:text-blue-600 rounded" title="Edit">
                                                                    <Edit className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={() => handleDeleteLead(lead.id)} className="p-1 text-slate-400 hover:text-red-600 rounded" title="Delete">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Contact Info */}
                                                        <div className="flex flex-col gap-1">
                                                            {lead.mobile && (
                                                                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                                                    <Phone className="w-3 h-3" /> {lead.mobile}
                                                                </span>
                                                            )}
                                                            {lead.email && (
                                                                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                                                    <Mail className="w-3 h-3" /> {lead.email}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Notes preview */}
                                                        {lead.notes && (
                                                            <p className="text-xs text-slate-400 truncate border-t border-slate-100 pt-2" title={lead.notes}>
                                                                {lead.notes}
                                                            </p>
                                                        )}

                                                        {/* Move to next stage button */}
                                                        {status !== 'CLOSED_WON' && status !== 'CLOSED_LOST' && (
                                                            <button
                                                                onClick={() => moveLeadToNextStage(lead)}
                                                                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-md py-1.5 transition-all"
                                                            >
                                                                Move to {LEAD_STATUSES[LEAD_STATUSES.indexOf(status) + 1]?.replace(/_/g, ' ')}
                                                                <ChevronRight className="w-3 h-3" />
                                                            </button>
                                                        )}

                                                        {/* Date */}
                                                        <div className="text-[10px] text-slate-400 text-right">
                                                            {format(new Date(lead.createdAt), 'MMM dd')}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900">{editingLead ? 'Edit Prospect' : 'Add New Prospect'}</h2>
                            <button onClick={handleCloseModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <form id="lead-form" onSubmit={handleSaveLead} className="space-y-4">
                                {formError && (
                                    <div className="p-3 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                                        {formError}
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm font-medium text-slate-700 block mb-1">Prospect Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm" placeholder="e.g. John Doe" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">Mobile Phone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input type="text" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm" placeholder="+1 555 123 4567" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm" placeholder="john@example.com" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">Tracking Status</label>
                                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm">
                                            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">Required Policy Topic</label>
                                        <select value={formData.interestedPolicy} onChange={e => setFormData({ ...formData, interestedPolicy: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm">
                                            {POLICY_TYPES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Internal Notes / Requirements</label>
                                    <textarea rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm resize-none" placeholder="Details about what the prospect is looking for..."></textarea>
                                </div>
                            </form>
                        </div>

                        <div className="p-5 border-t border-slate-100 flex gap-3 bg-slate-50/50">
                            <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-white font-medium transition-colors text-sm shadow-sm">
                                Cancel
                            </button>
                            <button type="submit" form="lead-form" disabled={isSaving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm flex items-center justify-center shadow-sm">
                                {isSaving ? 'Saving...' : (editingLead ? 'Save Changes' : 'Create Lead')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
