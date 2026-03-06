import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, Award, Users, FileText, Search } from 'lucide-react';

type ReferrerInfo = {
    id: string;
    type: string;
    name: string;
    code: string | null;
    status: string;
    _count: {
        clients: number;
        policies: number;
    };
};

export default function ReferralsDashboard() {
    const [referrers, setReferrers] = useState<ReferrerInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchReferrers = async () => {
            try {
                setLoading(true);
                const res = await axios.get('/api/references?status=ACTIVE');
                // Ensure array, because GET /api/references might return directly an array
                setReferrers(Array.isArray(res.data) ? res.data : []);
            } catch (error) {
                console.error("Failed to fetch referrers:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReferrers();
    }, []);

    // Filter and sort by policies count descending
    const filteredAndSorted = referrers
        .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || (r.code && r.code.toLowerCase().includes(searchQuery.toLowerCase())))
        .sort((a, b) => b._count.policies - a._count.policies);

    const topReferrers = filteredAndSorted.slice(0, 3);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" /> Referral Leaderboard
                </h1>
                <p className="text-sm text-slate-500 mt-1">Track top performing agents, employees, and clients by referral volume.</p>
            </div>

            {/* Top 3 Podium Cards */}
            {!loading && topReferrers.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {topReferrers.map((ref, index) => (
                        <div key={ref.id} className={`bg-white rounded-2xl p-6 border shadow-sm relative overflow-hidden ${index === 0 ? 'border-yellow-200' : index === 1 ? 'border-slate-200' : 'border-orange-200'
                            }`}>
                            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 opacity-20 ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-slate-400' : 'bg-orange-400'
                                }`}></div>

                            <div className="flex items-start justify-between">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                    index === 1 ? 'bg-slate-100 text-slate-700' :
                                        'bg-orange-100 text-orange-700'
                                    }`}>
                                    #{index + 1}
                                </div>
                                <Award className={`w-8 h-8 ${index === 0 ? 'text-yellow-500' :
                                    index === 1 ? 'text-slate-400' :
                                        'text-orange-500'
                                    }`} />
                            </div>

                            <div className="mt-4">
                                <h3 className="font-bold text-lg text-slate-900 truncate">{ref.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase tracking-wider">{ref.type}</span>
                                    {ref.code && <span className="text-xs text-slate-400 font-mono">Code: {ref.code}</span>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <div className="text-xs text-slate-500 font-medium">Clients</div>
                                    <div className="text-xl font-bold text-slate-900 mt-0.5">{ref._count.clients}</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <div className="text-xs text-slate-500 font-medium">Policies</div>
                                    <div className="text-xl font-bold text-blue-600 mt-0.5">{ref._count.policies}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Full List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="font-bold text-slate-800 text-lg">All Referrers</h3>
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search referrers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none w-full sm:w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Rank</th>
                                <th className="px-6 py-4">Referrer Details</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Referral Code</th>
                                <th className="px-6 py-4">Converted Clients</th>
                                <th className="px-6 py-4">Total Policies</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading referrers...</td>
                                </tr>
                            ) : filteredAndSorted.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No referrers found.</td>
                                </tr>
                            ) : (
                                filteredAndSorted.map((ref, i) => (
                                    <tr key={ref.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-400 w-8 inline-block">#{i + 1}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{ref.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded shadow-sm">{ref.type}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {ref.code ? <span className="font-mono text-slate-600">{ref.code}</span> : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                                <Users className="w-4 h-4 text-slate-400" /> {ref._count.clients}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 font-bold text-blue-600">
                                                <FileText className="w-4 h-4 text-blue-400" /> {ref._count.policies}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
