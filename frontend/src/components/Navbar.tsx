import { Search, Bell, Plus, Menu, ArrowRight, ChevronRight, User as UserIcon, Settings, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Global Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ clients: any[], policies: any[] }>({ clients: [], policies: [] });
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Dropdown States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const createRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    // Build Smart Breadcrumbs
    const getBreadcrumbs = () => {
        const pathnames = location.pathname.split('/').filter(x => x);
        if (pathnames.length === 0) return [{ name: 'Dashboard', path: '/dashboard' }];

        return pathnames.map((value, index) => {
            const url = `/${pathnames.slice(0, index + 1).join('/')}`;
            // Formatting names
            let name = value.charAt(0).toUpperCase() + value.slice(1);
            if (name === 'New' && pathnames[index - 1]) {
                name = `New ${pathnames[index - 1].charAt(0).toUpperCase() + pathnames[index - 1].slice(1, -1)}`;
            } else if (name.length > 20) {
                name = "Details"; // Fallback for long IDs
            }
            return { name: name.replace('-', ' '), path: url };
        });
    };

    const breadcrumbs = getBreadcrumbs();

    // Handle clicking outside any dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
            if (createRef.current && !createRef.current.contains(event.target as Node)) {
                setIsCreateOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Global Search Debounce & Fetch
    useEffect(() => {
        const fetchResults = async () => {
            if (!searchQuery.trim()) {
                setSearchResults({ clients: [], policies: [] });
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                const [clientsRes, policiesRes] = await Promise.all([
                    axios.get(`/api/clients?search=${encodeURIComponent(searchQuery)}&limit=5`),
                    axios.get(`/api/policies?search=${encodeURIComponent(searchQuery)}&limit=5`)
                ]);
                setSearchResults({
                    clients: clientsRes.data.clients || [],
                    policies: policiesRes.data.policies || []
                });
                setIsSearchOpen(true);
            } catch (error) {
                console.error('Fast search failed', error);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(() => {
            fetchResults();
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Format User Initials
    const getInitials = (userName?: string) => {
        if (!userName) return 'U';
        return userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="h-[72px] bg-white border-b border-slate-200 flex items-center px-4 lg:px-8 shrink-0 z-40 w-full relative">
            {/* Mobile Menu Toggle */}
            <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg mr-2 shrink-0">
                <Menu className="w-6 h-6" />
            </button>

            {/* Smart Breadcrumbs */}
            <nav className="hidden lg:flex items-center space-x-2 w-64 shrink-0 overflow-hidden text-sm">
                {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                        <div key={crumb.path} className="flex items-center">
                            {index > 0 && <ChevronRight className="w-4 h-4 text-slate-300 mx-1 flex-shrink-0" />}
                            <Link
                                to={crumb.path}
                                className={clsx(
                                    "truncate max-w-[120px] transition-colors",
                                    isLast
                                        ? "font-bold text-slate-800 pointer-events-none"
                                        : "font-medium text-slate-500 hover:text-blue-600"
                                )}
                                title={crumb.name}
                            >
                                {crumb.name}
                            </Link>
                        </div>
                    );
                })}
            </nav>

            {/* Global Search */}
            <div className="flex-1 max-w-2xl flex items-center lg:px-6" ref={searchRef}>
                <div className="relative w-full max-w-xl mx-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className={clsx("h-4 w-4 transition-colors", isSearchOpen || searchQuery ? "text-blue-500" : "text-slate-400")} />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { if (searchQuery.trim()) setIsSearchOpen(true); }}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all"
                        placeholder="Search CRM globally (Press '/' to focus)"
                    />

                    {/* Search Results Dropdown */}
                    {isSearchOpen && (searchQuery.trim() !== '') && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[70vh] flex flex-col">
                            {isSearching ? (
                                <div className="p-4 text-sm text-slate-500 text-center font-medium animate-pulse">Searching the database...</div>
                            ) : (searchResults.clients.length === 0 && searchResults.policies.length === 0) ? (
                                <div className="p-4 text-sm text-slate-500 text-center">No results found for "{searchQuery}"</div>
                            ) : (
                                <div className="overflow-y-auto w-full custom-scrollbar py-2">
                                    {/* Clients Section */}
                                    {searchResults.clients.length > 0 && (
                                        <div className="mb-2">
                                            <div className="px-4 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">Clients Matching</div>
                                            {searchResults.clients.map(client => (
                                                <button
                                                    key={client.id}
                                                    onClick={() => { navigate(`/clients/${client.id}`); setIsSearchOpen(false); setSearchQuery(''); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-start gap-3 group"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                                                        <span className="text-blue-700 font-bold text-xs">{getInitials(client.name)}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">{client.name}</div>
                                                        <div className="text-xs text-slate-500 truncate">{client.email} • {client.mobile}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Policies Section */}
                                    {searchResults.policies.length > 0 && (
                                        <div>
                                            <div className="px-4 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 border-t border-slate-100">Policies Matching</div>
                                            {searchResults.policies.map(policy => (
                                                <button
                                                    key={policy.id}
                                                    onClick={() => { navigate(`/policies/${policy.id}`); setIsSearchOpen(false); setSearchQuery(''); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                                                >
                                                    <div className="flex flex-col min-w-0 mr-4">
                                                        <div className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">{policy.policyNo || 'Pending Issue'}</div>
                                                        <div className="text-xs text-slate-500 truncate">{policy.client?.name} • {policy.type}</div>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Command Actions */}
            <div className="flex items-center gap-3 lg:gap-5 ml-auto pl-4 shrink-0">
                {/* Notifications */}
                <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors hidden sm:block">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full border-2 border-white"></span>
                </button>

                {/* Universal Create Dropdown */}
                <div className="relative" ref={createRef}>
                    <button
                        onClick={() => setIsCreateOpen(!isCreateOpen)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 lg:px-4 lg:py-2 rounded-lg text-sm font-medium hover:bg-blue-700 focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition-colors shadow-sm whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Create</span>
                    </button>

                    {isCreateOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                            <div className="py-1">
                                <Link to="/clients/new" onClick={() => setIsCreateOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-medium transition-colors">Client</Link>
                                <Link to="/policies/new" onClick={() => setIsCreateOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-medium transition-colors">Policy</Link>
                                <Link to="/leads" onClick={() => setIsCreateOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-medium transition-colors">Lead Pipeline</Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* User Profile Dropdown */}
                <div className="relative hidden sm:block ml-2 border-l border-slate-200 pl-5" ref={profileRef}>
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-2 focus:outline-none"
                    >
                        {user?.avatar ? (
                            <div className="w-9 h-9 rounded-full overflow-hidden shadow-sm hover:shadow transition-shadow ring-2 ring-transparent focus:ring-blue-100">
                                <img
                                    src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:5005${user.avatar}`}
                                    alt="User Avatar"
                                    className="w-full h-full object-cover bg-white"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                                <div className="hidden w-full h-full bg-gradient-to-tr from-blue-600 to-blue-400 text-white flex items-center justify-center font-bold text-sm">
                                    {getInitials(user?.name)}
                                </div>
                            </div>
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 text-white flex items-center justify-center font-bold text-sm shadow-sm hover:shadow transition-shadow ring-2 ring-transparent focus:ring-blue-100">
                                {getInitials(user?.name)}
                            </div>
                        )}
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Administrator'}</p>
                                <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{user?.email || 'admin@example.com'}</p>
                            </div>
                            <div className="py-1.5">
                                <Link to="/settings?tab=profile" onClick={() => setIsProfileOpen(false)} className="flex w-full text-left items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-medium transition-colors">
                                    <UserIcon className="w-4 h-4 text-slate-400" />
                                    My Profile
                                </Link>
                                <Link to="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-medium transition-colors">
                                    <Settings className="w-4 h-4 text-slate-400" />
                                    Account Settings
                                </Link>
                                <div className="h-px bg-slate-100 my-1.5"></div>
                                <button onClick={handleLogout} className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors">
                                    <LogOut className="w-4 h-4 text-red-500" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </header>
    );
}
