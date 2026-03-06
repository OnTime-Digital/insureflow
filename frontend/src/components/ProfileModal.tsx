import { X, Mail, Shield, LogOut, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user, logout } = useAuth();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-base font-semibold text-slate-900">My Profile</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Profile Header */}
                <div className="p-6 flex flex-col items-center border-b border-slate-100">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl font-bold text-orange-600">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{user?.name || 'User'}</h3>
                    <p className="text-sm text-slate-500 capitalize">{user?.role?.toLowerCase() || 'Staff'}</p>
                </div>

                {/* Details */}
                <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <Mail className="w-5 h-5 text-slate-400" />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Email Address</p>
                            <p className="text-sm font-medium text-slate-900 truncate">{user?.email || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <Shield className="w-5 h-5 text-slate-400" />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Role & Permissions</p>
                            <p className="text-sm font-medium text-slate-900 truncate">Access [{user?.role || 'Guest'}]</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                    <button className="flex items-center gap-2 justify-center w-full py-2.5 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
                        <KeyRound className="w-4 h-4" />
                        Change Password
                    </button>
                    <button onClick={logout} className="flex items-center gap-2 justify-center w-full py-2.5 px-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
