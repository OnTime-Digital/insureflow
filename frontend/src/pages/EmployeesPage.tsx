import { useState, useEffect } from 'react';
import {
    Search, Plus, Edit, X, UsersRound,
    ToggleLeft, ToggleRight,
    UserCheck, UserX
} from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';
import { format } from 'date-fns';

type Employee = {
    id: string;
    name: string;
    email: string;
    mobile: string | null;
    role: string;
    joiningDate: string | null;
    isActive: boolean;
    permissions: string | null;
    createdAt: string;
    _count: {
        assignedPolicies: number;
        assignedRenewals: number;
        assignedLeads: number;
        assignedClients?: number;
        assignedDocuments?: number;
    };
};

const ROLES = ['ADMIN', 'MANAGER', 'SALES', 'OPS', 'STAFF'];

const ROLE_COLORS: Record<string, string> = {
    'ADMIN': 'bg-red-100 text-red-700',
    'MANAGER': 'bg-blue-100 text-blue-700',
    'SALES': 'bg-emerald-100 text-emerald-700',
    'OPS': 'bg-purple-100 text-purple-700',
    'STAFF': 'bg-slate-100 text-slate-600',
};

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', mobile: '', role: 'STAFF', joiningDate: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [reassignModal, setReassignModal] = useState<{ isOpen: boolean; emp: Employee | null }>({ isOpen: false, emp: null });
    const [selectedReassignTo, setSelectedReassignTo] = useState<string>('');
    const [toggling, setToggling] = useState(false);

    const fetchEmployees = async () => {
        try {
            const params: any = {};
            if (search) params.search = search;
            if (filterRole) params.role = filterRole;
            const res = await axios.get('/api/employees', { params });
            setEmployees(res.data);
        } catch (err) {
            console.error('Error fetching employees:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEmployees(); }, [search, filterRole]);

    const handleOpenModal = (emp?: Employee) => {
        if (emp) {
            setEditingEmployee(emp);
            setFormData({
                name: emp.name, email: emp.email, password: '', mobile: emp.mobile || '',
                role: emp.role, joiningDate: emp.joiningDate ? format(new Date(emp.joiningDate), 'yyyy-MM-dd') : ''
            });
        } else {
            setEditingEmployee(null);
            setFormData({ name: '', email: '', password: '', mobile: '', role: 'STAFF', joiningDate: '' });
        }
        setError('');
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (editingEmployee) {
                const payload: any = { ...formData };
                if (!payload.password) delete payload.password;
                await axios.put(`/api/employees/${editingEmployee.id}`, payload);
            } else {
                if (!formData.password) {
                    setError('Password is required for new employees.');
                    setSaving(false);
                    return;
                }
                await axios.post('/api/employees', formData);
            }
            setShowModal(false);
            fetchEmployees();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save employee.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleClick = async (emp: Employee) => {
        if (emp.isActive) {
            const totalAssignments = emp._count.assignedPolicies + emp._count.assignedRenewals + emp._count.assignedLeads + (emp._count.assignedClients || 0) + (emp._count.assignedDocuments || 0);
            if (totalAssignments > 0) {
                setReassignModal({ isOpen: true, emp });
                setSelectedReassignTo('');
                return;
            }
        }

        setToggling(true);
        try {
            await axios.put(`/api/employees/${emp.id}/toggle`);
            fetchEmployees();
        } catch (err) {
            console.error('Error toggling employee:', err);
        } finally {
            setToggling(false);
        }
    };

    const handleConfirmReassign = async () => {
        if (!reassignModal.emp) return;
        setToggling(true);
        try {
            await axios.put(`/api/employees/${reassignModal.emp.id}/toggle`, {
                reassignToId: selectedReassignTo || null
            });
            setReassignModal({ isOpen: false, emp: null });
            fetchEmployees();
        } catch (err) {
            console.error('Error reassigning employee:', err);
        } finally {
            setToggling(false);
        }
    };

    const activeCount = employees.filter(e => e.isActive).length;
    const inactiveCount = employees.filter(e => !e.isActive).length;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Staff & Employees</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage team members, roles, and permissions.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Employee
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl"><UsersRound className="w-5 h-5 text-blue-600" /></div>
                    <div><p className="text-xs text-slate-400 font-semibold uppercase">Total Staff</p><p className="text-xl font-bold text-slate-900">{employees.length}</p></div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 rounded-xl"><UserCheck className="w-5 h-5 text-emerald-600" /></div>
                    <div><p className="text-xs text-slate-400 font-semibold uppercase">Active</p><p className="text-xl font-bold text-emerald-700">{activeCount}</p></div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 rounded-xl"><UserX className="w-5 h-5 text-red-600" /></div>
                    <div><p className="text-xs text-slate-400 font-semibold uppercase">Inactive</p><p className="text-xl font-bold text-red-700">{inactiveCount}</p></div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Search by name, email, or mobile..."
                    />
                </div>
                <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20">
                    <option value="">All Roles</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Employee</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Contact</th>
                                <th className="px-4 py-3">Joined</th>
                                <th className="px-4 py-3">Assignments</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 w-[60px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400"><div className="flex justify-center items-center gap-2"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> Loading...</div></td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No employees found.</td></tr>
                            ) : employees.map(emp => {
                                const initials = emp.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                                return (
                                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-3 flex items-center gap-3">
                                            <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0", emp.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400')}>
                                                {initials}
                                            </div>
                                            <div>
                                                <p className={clsx("font-semibold", emp.isActive ? "text-slate-900" : "text-slate-400")}>{emp.name}</p>
                                                <p className="text-xs text-slate-400">{emp.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={clsx("px-2.5 py-1 rounded-full text-xs font-bold", ROLE_COLORS[emp.role] || 'bg-slate-100 text-slate-600')}>{emp.role}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {emp.mobile || <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                            {emp.joiningDate ? format(new Date(emp.joiningDate), 'dd MMM yyyy') : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{emp._count.assignedPolicies}P</span>
                                                <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">{emp._count.assignedRenewals}R</span>
                                                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">{emp._count.assignedLeads}L</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button disabled={toggling} onClick={() => handleToggleClick(emp)} className="flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50">
                                                {emp.isActive ? (
                                                    <><ToggleRight className="w-5 h-5 text-emerald-500" /><span className="text-emerald-600">Active</span></>
                                                ) : (
                                                    <><ToggleLeft className="w-5 h-5 text-slate-300" /><span className="text-slate-400">Inactive</span></>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 w-[60px]">
                                            <button onClick={() => handleOpenModal(emp)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {error && <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>}
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Full Name <span className="text-red-500">*</span></label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" placeholder="John Doe" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></label>
                                    <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" placeholder="john@example.com" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Password {!editingEmployee && <span className="text-red-500">*</span>}</label>
                                    <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" placeholder={editingEmployee ? 'Leave blank to keep' : 'Set password'} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Mobile</label>
                                    <input type="tel" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" placeholder="+91 98765 43210" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Role</label>
                                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20">
                                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Joining Date</label>
                                <input type="date" value={formData.joiningDate} onChange={e => setFormData({ ...formData, joiningDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancel</button>
                                <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 shadow-sm">
                                    {saving ? 'Saving...' : editingEmployee ? 'Update' : 'Create Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Reassignment Modal */}
            {reassignModal.isOpen && reassignModal.emp && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">Disable & Reassign</h2>
                            <button onClick={() => setReassignModal({ isOpen: false, emp: null })} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600">
                                <strong>{reassignModal.emp.name}</strong> currently has assigned clients, policies, or leads.
                                Who should inherit these records?
                            </p>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Reassign to (Optional)</label>
                                <select
                                    value={selectedReassignTo}
                                    onChange={(e) => setSelectedReassignTo(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">-- Leave Unassigned --</option>
                                    {employees.filter(e => e.id !== reassignModal.emp?.id && e.isActive).map(e => (
                                        <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setReassignModal({ isOpen: false, emp: null })} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancel</button>
                                <button onClick={handleConfirmReassign} disabled={toggling} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 shadow-sm">
                                    {toggling ? 'Disabling...' : 'Confirm & Disable'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
