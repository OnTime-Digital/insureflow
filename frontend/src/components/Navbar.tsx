import { Search, Bell, Plus, Menu } from 'lucide-react';

export default function Navbar() {
    return (
        <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-10 w-full">
            {/* Mobile Menu Toggle (Visible only on small screens) */}
            <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg mr-2">
                <Menu className="w-6 h-6" />
            </button>

            {/* Global Search */}
            <div className="flex-1 max-w-2xl flex items-center">
                <div className="relative w-full max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                        placeholder="Search clients, policies, or leads..."
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 lg:gap-4 ml-4">
                <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors hidden sm:block">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full border-2 border-white"></span>
                </button>

                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New Client</span>
                </button>
            </div>
        </header>
    );
}
