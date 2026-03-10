import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Filter, Hash, Building2, User, UserPlus, Edit, Trash2 } from 'lucide-react';
import clsx from 'clsx';

type Reference = {
    id: string;
    type: string;
    name: string;
    contact: string | null;
    status: string;
    code: string | null;
    createdAt: string;
    _count?: {
        clients: number;
        policies: number;
    }
};

export default function ReferencesPage() {
    const [references, setReferences] = useState<Reference[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingRef, setEditingRef] = useState<Reference | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);

    const [formData, setFormData] = useState({
        type: 'AGENT',
        name: '',
        contact: '',
        status: 'ACTIVE'
    });

    const fetchReferences = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (filterType !== 'ALL') params.append('type', filterType);

            const res = await axios.get(`/api/references?${params.toString()}`);
            setReferences(res.data);
        } catch (error) {
            console.error("Error fetching references:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReferences();
    }, [searchTerm, filterType]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRef) {
                await axios.put(`/api/references/${editingRef.id}`, formData);
            } else {
                await axios.post('/api/references', formData);
            }
            setIsAddModalOpen(false);
            setEditingRef(null);
            setFormData({ type: 'AGENT', name: '', contact: '', status: 'ACTIVE' });
            fetchReferences();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this reference?')) return;
        try {
            await axios.delete(`/api/references/${id}`);
            fetchReferences();
            setSelectedIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        } catch (err) {
            console.error(err);
            alert('Failed to delete reference. It might be tied to existing records.');
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === references.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(references.map(r => r.id)));
        }
    };

    const toggleSelectRow = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected reference(s)?`)) return;

        setIsDeletingBulk(true);
        try {
            await axios.post('/api/references/bulk-delete', {
                ids: Array.from(selectedIds)
            });
            setSelectedIds(new Set());
            fetchReferences();
        } catch (error) {
            console.error('Error bulk deleting references:', error);
            alert('Failed to delete some references. They might be in use.');
        } finally {
            setIsDeletingBulk(false);
        }
    };

    const openEdit = (ref: Reference) => {
        setEditingRef(ref);
        setFormData({
            type: ref.type,
            name: ref.name,
            contact: ref.contact || '',
            status: ref.status
        });
        setIsAddModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reference Directory</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage employees, agents, and client referrers.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingRef(null);
                        setFormData({ type: 'AGENT', name: '', contact: '', status: 'ACTIVE' });
                        setIsAddModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Add Reference
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, code or contact..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm cursor-pointer appearance-none"
                    >
                        <option value="ALL">All Types</option>
                        <option value="EMPLOYEE">Employees</option>
                        <option value="AGENT">Agents</option>
                        <option value="CLIENT">Clients</option>
                        <option value="DIRECT">Direct/Self</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                            <tr>
                                <th className="px-4 py-3 w-[40px]">
                                    <input
                                        type="checkbox"
                                        checked={references.length > 0 && selectedIds.size === references.length}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-4 py-3">Name / Code</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Contact</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Conversions</th>
                                <th className="px-4 py-3 text-right w-[90px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && references.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                        Loading references...
                                    </td>
                                </tr>
                            ) : references.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                        No references found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                references.map((ref) => {
                                    const isSelected = selectedIds.has(ref.id);
                                    return (
                                        <tr key={ref.id} className={clsx("transition-colors group", isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/50")}>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectRow(ref.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-900">{ref.name}</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                                    <Hash className="w-3 h-3" /> {ref.code || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                                                ${ref.type === 'EMPLOYEE' ? 'bg-indigo-100 text-indigo-700' :
                                                        ref.type === 'AGENT' ? 'bg-amber-100 text-amber-700' :
                                                            ref.type === 'CLIENT' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-slate-100 text-slate-700'}`
                                                }>
                                                    {ref.type === 'EMPLOYEE' && <User className="w-3 h-3" />}
                                                    {ref.type === 'AGENT' && <Building2 className="w-3 h-3" />}
                                                    {ref.type === 'CLIENT' && <UserPlus className="w-3 h-3" />}
                                                    {ref.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {ref.contact || <span className="text-slate-400 italic">None</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium 
                                                ${ref.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`
                                                }>
                                                    {ref.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs text-slate-600 space-y-1">
                                                    <p>Clients: <span className="font-semibold text-slate-900">{ref._count?.clients || 0}</span></p>
                                                    <p>Policies: <span className="font-semibold text-slate-900">{ref._count?.policies || 0}</span></p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right w-[90px]">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <button onClick={() => openEdit(ref)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(ref.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
            </div>

            {/* Add / Edit Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-900">
                                {editingRef ? 'Edit Reference' : 'Add New Reference'}
                            </h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <Plus className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="EMPLOYEE">Employee</option>
                                        <option value="AGENT">External Agent</option>
                                        <option value="CLIENT">Client Referral</option>
                                        <option value="DIRECT">Direct / Self</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Ramesh Bhai"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Contact Details</label>
                                    <input
                                        type="text"
                                        placeholder="Mobile or Email (Optional)"
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                    </select>
                                </div>
                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {editingRef ? 'Update Details' : 'Create Reference'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 z-50">
                    <span className="font-medium bg-slate-800 px-3 py-1 rounded-lg text-sm">
                        {selectedIds.size} selected
                    </span>

                    <div className="h-6 w-px bg-slate-700"></div>

                    <button
                        onClick={toggleSelectAll}
                        className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        Deselect All
                    </button>

                    <button
                        onClick={handleBulkDelete}
                        disabled={isDeletingBulk}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" />
                        {isDeletingBulk ? 'Deleting...' : 'Delete Selected'}
                    </button>
                </div>
            )}

        </div>
    );
}
