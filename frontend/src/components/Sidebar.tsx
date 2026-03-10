import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard, Users, ShieldCheck, FileText,
    Filter, LineChart, UsersRound, Settings, Hexagon, RefreshCcw, Link as LinkIcon, IndianRupee, Trophy, FileSpreadsheet,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import axios from 'axios';

export default function Sidebar() {
    const location = useLocation();
    const { user } = useAuth();
    const [branding, setBranding] = useState<{ app_name?: string; logo_url?: string; company_name?: string }>({});

    // Persist collapse state manually via localStorage 
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
    }, [isCollapsed]);

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
        <div className={clsx(
            "bg-[#fdfdfd] border-r border-slate-200 flex-col h-full hidden lg:flex transition-[width] duration-300 ease-in-out shrink-0",
            isCollapsed ? "w-[88px]" : "w-[280px]"
        )}>
            {/* Logo Area */}
            <div className="h-[72px] flex items-center justify-center px-6 border-b border-transparent shrink-0">
                <Link to="/dashboard" className="flex items-center gap-2.5 relative transition-opacity hover:opacity-80 w-full overflow-hidden">
                    {branding.logo_url ? (
                        <>
                            <img
                                src={branding.logo_url.startsWith('http') ? branding.logo_url : `http://localhost:5005${branding.logo_url}`}
                                alt="Logo"
                                className="w-8 h-8 rounded-lg object-contain shrink-0"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                            <div className="bg-blue-600 p-1.5 rounded-lg hidden shrink-0">
                                <Hexagon className="w-5 h-5 text-white fill-blue-600" />
                            </div>
                        </>
                    ) : (
                        <div className="bg-blue-600 p-1.5 rounded-lg shrink-0">
                            <Hexagon className="w-5 h-5 text-white fill-blue-600" />
                        </div>
                    )}
                    {!isCollapsed && (
                        <span className="text-xl font-bold tracking-tight text-slate-900 truncate">{appName}</span>
                    )}
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-4 space-y-8 overflow-y-auto custom-scrollbar">
                {visibleGroups.map((group, index) => (
                    <div key={index}>
                        {group.label && !isCollapsed && (
                            <h3 className="px-3 text-xs font-semibold text-slate-400 tracking-wider mb-2 truncate">
                                {group.label}
                            </h3>
                        )}
                        <div className={clsx("space-y-1", isCollapsed && "space-y-2 mt-4")}>
                            {group.items.map((item) => {
                                const isActive = location.pathname.startsWith(item.path);
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        title={isCollapsed ? item.name : undefined}
                                        className={clsx(
                                            "flex items-center rounded-xl transition-all font-medium group",
                                            isCollapsed ? "justify-center p-3" : "gap-3.5 px-3 py-2.5 text-sm",
                                            isActive
                                                ? "bg-blue-50/80 text-blue-700"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <item.icon className={clsx(
                                            "w-5 h-5 shrink-0 transition-colors",
                                            isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                                        )} strokeWidth={isActive ? 2.5 : 2} />
                                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Collapse Toggle Footer */}
            <div className="p-4 border-t border-slate-200 mt-auto shrink-0">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    className={clsx(
                        "flex items-center text-slate-500 hover:bg-slate-100 rounded-xl transition-colors w-full",
                        isCollapsed ? "justify-center p-3" : "py-2.5 px-3 gap-3"
                    )}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-5 h-5 shrink-0" />
                    ) : (
                        <>
                            <ChevronLeft className="w-5 h-5 shrink-0" />
                            <span className="text-sm font-medium truncate">Collapse Sidebar</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
