import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard, Users, ShieldCheck, FileText,
    Filter, LineChart, UsersRound, Settings, Hexagon, UserCircle, RefreshCcw, Link as LinkIcon, IndianRupee, Trophy, FileSpreadsheet
} from 'lucide-react';
import clsx from 'clsx';
import ProfileModal from './ProfileModal';
import axios from 'axios';

export default function Sidebar() {
    const location = useLocation();
    const { user } = useAuth();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [branding, setBranding] = useState<{ app_name?: string; logo_url?: string; company_name?: string }>({});

    const CURRENT_USER_ROLE = user?.role || 'STAFF';

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const res = await axios.get('/api/settings/branding');
                setBranding(res.data);
                // Update document title
                if (res.data.app_name) {
                    document.title = res.data.app_name;
                }
                // Update favicon
                if (res.data.favicon_url) {
                    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
                    if (link) {
                        link.href = res.data.favicon_url;
                    } else {
                        const newLink = document.createElement('link');
                        newLink.rel = 'icon';
                        newLink.href = res.data.favicon_url;
                        document.head.appendChild(newLink);
                    }
                }
            } catch (err) {
                // Fallback to defaults
            }
        };
        fetchBranding();
    }, []);

    const groups = [
        {
            items: [
                { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' }
            ]
        },
        {
            label: 'CLIENT MANAGEMENT',
            items: [
                { name: 'All Clients', icon: Users, path: '/clients' },
                { name: 'Policies', icon: ShieldCheck, path: '/policies' },
                { name: 'Documents', icon: FileText, path: '/documents' },
                { name: 'Renewals', icon: RefreshCcw, path: '/renewals' }
            ]
        },
        {
            label: 'GROWTH & CRM',
            roles: ['ADMIN', 'MANAGER'],
            items: [
                { name: 'Lead Pipeline', icon: Filter, path: '/leads' },
                { name: 'Sales Reports', icon: LineChart, path: '/reports' },
                { name: 'Referral Program', icon: Trophy, path: '/referrals' },
                { name: 'Commissions', icon: IndianRupee, path: '/commissions' },
                { name: 'Monthly Reports', icon: FileSpreadsheet, path: '/monthly-reports' },
            ]
        },
        {
            label: 'ADMIN',
            roles: ['ADMIN', 'MANAGER'],
            items: [
                { name: 'Employees', icon: UsersRound, path: '/employees' },
                { name: 'Reference Directory', icon: LinkIcon, path: '/references' },
                { name: 'Settings', icon: Settings, path: '/settings', roles: ['ADMIN'] },
                { name: 'Audit Logs', icon: FileText, path: '/audit-logs', roles: ['ADMIN'] },
            ]
        }
    ];

    const visibleGroups = groups.map(g => ({
        ...g,
        items: g.items.filter(item => !(item as any).roles || (item as any).roles.includes(CURRENT_USER_ROLE))
    })).filter(g => !g.roles || g.roles.includes(CURRENT_USER_ROLE) || g.items.length > 0);

    const appName = branding.app_name || 'InsureFlow';

    return (
        <div className="w-[280px] bg-[#fdfdfd] border-r border-slate-200 flex flex-col h-full hidden lg:flex">
            {/* Logo Area */}
            <div className="h-[72px] flex items-center px-6 border-b border-transparent">
                <div className="flex items-center gap-2.5">
                    {branding.logo_url ? (
                        <img src={branding.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
                    ) : (
                        <div className="bg-blue-600 p-1.5 rounded-lg">
                            <Hexagon className="w-5 h-5 text-white fill-blue-600" />
                        </div>
                    )}
                    <span className="text-xl font-bold tracking-tight text-slate-900">{appName}</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-4 space-y-8 overflow-y-auto custom-scrollbar">
                {visibleGroups.map((group, index) => (
                    <div key={index}>
                        {group.label && (
                            <h3 className="px-3 text-xs font-semibold text-slate-400 tracking-wider mb-2">
                                {group.label}
                            </h3>
                        )}
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const isActive = location.pathname.startsWith(item.path);
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        className={clsx(
                                            "flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all text-sm font-medium",
                                            isActive
                                                ? "bg-blue-50/80 text-blue-700"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <item.icon className={clsx("w-5 h-5", isActive ? "text-blue-600" : "text-slate-400")} strokeWidth={isActive ? 2.5 : 2} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User Profile Footer */}
            <div className="p-4 border-t border-slate-200 mt-auto">
                <div
                    onClick={() => setIsProfileOpen(true)}
                    className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors"
                >
                    <div className="bg-orange-100 rounded-full p-1.5">
                        <UserCircle className="w-7 h-7 text-orange-500 fill-orange-500/20" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{user?.name || 'Loading...'}</p>
                        <p className="text-slate-500 text-xs truncate">View Profile</p>
                    </div>
                </div>
            </div>

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />
        </div>
    );
}
