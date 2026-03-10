import { useState, useEffect } from 'react';
import { FileText, Save, Image as ImageIcon, Plus, Trash2, Palette, User } from 'lucide-react';
import clsx from 'clsx';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(location.search);
    const initialTab = (searchParams.get('tab') as any) || 'profile';

    const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'paymentTerms'>(initialTab);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [paymentTermsTemplates, setPaymentTermsTemplates] = useState<string[]>([]);
    const [newTerm, setNewTerm] = useState('');
    const [branding, setBranding] = useState({
        app_name: '',
        company_name: '',
        logo_url: '',
        favicon_url: '',
        primary_color: '#3b82f6',
        report_footer_text: ''
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [faviconFile, setFaviconFile] = useState<File | null>(null);

    // Profile State
    const { user, fetchUser } = useAuth();
    const [profileName, setProfileName] = useState('');
    const [profileEmail, setProfileEmail] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profileError, setProfileError] = useState('');

    useEffect(() => {
        if (user) {
            setProfileName(user.name);
            setProfileEmail(user.email);
        }
    }, [user]);

    // Sync tab with URL parameter
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['profile', 'branding', 'paymentTerms'].includes(tab)) {
            setActiveTab(tab as any);
        } else if (!tab) {
            setActiveTab('profile');
        }
    }, [location.search]);

    // Fetch payment terms templates from settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get('/api/settings');
                if (res.data.payment_terms_templates) {
                    try {
                        setPaymentTermsTemplates(JSON.parse(res.data.payment_terms_templates));
                    } catch { }
                }
                // Load branding settings
                setBranding(prev => ({
                    ...prev,
                    app_name: res.data.app_name || '',
                    company_name: res.data.company_name || '',
                    logo_url: res.data.logo_url || '',
                    favicon_url: res.data.favicon_url || '',
                    primary_color: res.data.primary_color || '#3b82f6',
                    report_footer_text: res.data.report_footer_text || ''
                }));
            } catch (err) { }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            // Upload logo if new file selected
            let logoUrl = branding.logo_url;
            if (logoFile) {
                const formData = new FormData();
                formData.append('document', logoFile);
                const uploadRes = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                logoUrl = uploadRes.data.url;
            }
            // Upload favicon if new file selected
            let faviconUrl = branding.favicon_url;
            if (faviconFile) {
                const formData = new FormData();
                formData.append('document', faviconFile);
                const uploadRes = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                faviconUrl = uploadRes.data.url;
            }
            // Save all branding settings
            await axios.put('/api/settings', {
                app_name: branding.app_name,
                company_name: branding.company_name,
                logo_url: logoUrl,
                favicon_url: faviconUrl,
                primary_color: branding.primary_color,
                report_footer_text: branding.report_footer_text
            });
            setBranding(prev => ({ ...prev, logo_url: logoUrl, favicon_url: faviconUrl }));
            setBranding(prev => ({ ...prev, logo_url: logoUrl, favicon_url: faviconUrl }));
            setLogoFile(null);
            setFaviconFile(null);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving settings:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        setProfileError('');
        setSaveSuccess(false);

        try {
            // Upload Avatar if changed
            let avatarUrl = user?.avatar;
            if (avatarFile) {
                const formData = new FormData();
                formData.append('document', avatarFile);
                const uploadRes = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                avatarUrl = uploadRes.data.url;
            }

            // Update Profile Name, Email & Avatar
            if (profileName !== user?.name || profileEmail !== user?.email || avatarFile) {
                await axios.put('/api/update-profile', { name: profileName, email: profileEmail, avatar: avatarUrl });
                await fetchUser(); // Refresh global auth state
                setAvatarFile(null);
            }

            // Change Password if requested
            if (currentPassword || newPassword || confirmPassword) {
                if (newPassword !== confirmPassword) {
                    setProfileError('New passwords do not match');
                    setIsSaving(false);
                    return;
                }
                if (!currentPassword) {
                    setProfileError('Current password is required to set a new password');
                    setIsSaving(false);
                    return;
                }
                await axios.post('/api/change-password', {
                    currentPassword,
                    newPassword
                });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            console.error('Error saving profile:', err);
            setProfileError(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'branding', label: 'Brand Identity', icon: Palette },
        { id: 'paymentTerms', label: 'Payment Terms', icon: FileText }
    ] as const;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your organization's core preferences.</p>
                </div>
                <button
                    onClick={activeTab === 'profile' ? handleSaveProfile : handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
                >
                    <Save className={clsx("w-4 h-4", isSaving && "animate-spin")} />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {saveSuccess && (
                <div className="p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium animate-in slide-in-from-top-2">
                    Settings successfully saved!
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id as any);
                                    navigate(`/settings?tab=${tab.id}`);
                                }}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium whitespace-nowrap",
                                    activeTab === tab.id
                                        ? "bg-slate-900 text-white shadow-md"
                                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                                )}
                            >
                                <tab.icon className={clsx("w-5 h-5", activeTab === tab.id ? "text-slate-300" : "text-slate-400")} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                        {/* Brand Identity Tab */}
                        {activeTab === 'branding' && (
                            <div className="p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                                <h2 className="text-lg font-bold text-slate-900 mb-6">Brand Identity & Profile</h2>
                                <p className="text-sm text-slate-500 mb-6">Configure your software identity — logo, company name, favicon, and colors used across the app and PDF reports.</p>

                                <div className="space-y-6">
                                    {/* Logo Upload */}
                                    <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                                        <div className="w-24 h-24 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden border-dashed relative">
                                            {branding.logo_url ? (
                                                <img
                                                    src={branding.logo_url.startsWith('http') ? branding.logo_url : `http://localhost:5005${branding.logo_url}`}
                                                    alt="Logo"
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        // Fallback to placeholder if image load fails
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                            ) : null}
                                            <ImageIcon className={clsx("w-8 h-8 text-slate-300", branding.logo_url && "hidden absolute")} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-900 mb-1">Company Logo</h3>
                                            <p className="text-xs text-slate-500 mb-3">Used in sidebar, PDF headers. PNG/JPG, max 2MB.</p>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setLogoFile(e.target.files?.[0] || null)}
                                                className="block text-sm text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                            />
                                            {logoFile && <p className="text-xs text-green-600 mt-1 font-medium">New file selected: {logoFile.name}</p>}
                                        </div>
                                    </div>

                                    {/* Favicon Upload */}
                                    <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                                        <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden border-dashed relative">
                                            {branding.favicon_url ? (
                                                <img
                                                    src={branding.favicon_url.startsWith('http') ? branding.favicon_url : `http://localhost:5005${branding.favicon_url}`}
                                                    alt="Favicon"
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        // Fallback to placeholder if image load fails
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                            ) : null}
                                            <ImageIcon className={clsx("w-5 h-5 text-slate-300", branding.favicon_url && "hidden absolute")} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-900 mb-1">Favicon</h3>
                                            <p className="text-xs text-slate-500 mb-3">Browser tab icon. 32x32px or 64x64px recommended.</p>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setFaviconFile(e.target.files?.[0] || null)}
                                                className="block text-sm text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                            />
                                            {faviconFile && <p className="text-xs text-green-600 mt-1 font-medium">New file selected: {faviconFile.name}</p>}
                                        </div>
                                    </div>

                                    {/* Branding Fields */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">App Name</label>
                                            <input type="text" value={branding.app_name} onChange={e => setBranding({ ...branding, app_name: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm" placeholder="e.g. InsureFlow – CompanyName" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Company Name</label>
                                            <input type="text" value={branding.company_name} onChange={e => setBranding({ ...branding, company_name: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm" placeholder="Your Company Name" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Primary Color</label>
                                            <div className="flex gap-2 items-center">
                                                <input type="color" value={branding.primary_color} onChange={e => setBranding({ ...branding, primary_color: e.target.value })} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                                                <input type="text" value={branding.primary_color} onChange={e => setBranding({ ...branding, primary_color: e.target.value })} className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono" />
                                            </div>
                                        </div>
                                        <div className="sm:col-span-2 space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Report Footer Text</label>
                                            <textarea rows={2} value={branding.report_footer_text} onChange={e => setBranding({ ...branding, report_footer_text: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-shadow text-sm resize-none" placeholder="Text shown in PDF report footers..." />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* My Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                                <h2 className="text-lg font-bold text-slate-900 mb-6">Personal Account Settings</h2>
                                <p className="text-sm text-slate-500 mb-6">Manage your profile picture, display name, and security credentials.</p>

                                {profileError && (
                                    <div className="p-3 mb-6 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium animate-in slide-in-from-top-2">
                                        {profileError}
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {/* Avatar Upload */}
                                    <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                                        <div className="w-24 h-24 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center overflow-hidden border-dashed relative">
                                            {user?.avatar && !avatarFile ? (
                                                <img
                                                    src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:5005${user.avatar}`}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                            ) : avatarFile ? (
                                                <img
                                                    src={URL.createObjectURL(avatarFile)}
                                                    alt="New Avatar"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-3xl font-bold text-slate-300">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-900 mb-1">Profile Photo</h3>
                                            <p className="text-xs text-slate-500 mb-3">Square image recommended. PNG/JPG, max 2MB.</p>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setAvatarFile(e.target.files?.[0] || null)}
                                                className="block text-sm text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    {/* Profile Fields */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pb-6 border-b border-slate-100">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Full Name</label>
                                            <input
                                                type="text"
                                                value={profileName}
                                                onChange={e => setProfileName(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Email Address</label>
                                            <input
                                                type="email"
                                                value={profileEmail}
                                                onChange={e => setProfileEmail(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Password Change */}
                                    <div className="space-y-5 lg:w-1/2">
                                        <h3 className="text-sm font-semibold text-slate-900">Change Password</h3>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Current Password</label>
                                            <input
                                                type="password"
                                                value={currentPassword}
                                                onChange={e => setCurrentPassword(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm"
                                                placeholder="Enter current password to authorize changes"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">New Password</label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Confirm New Password</label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm"
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* Payment Terms Tab */}
                        {activeTab === 'paymentTerms' && (
                            <div className="p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                                <h2 className="text-lg font-bold text-slate-900 mb-2">Payment Terms Templates</h2>
                                <p className="text-sm text-slate-500 mb-6">Define reusable payment terms templates. These will appear as dropdown options when creating policies.</p>

                                <div className="flex gap-2 mb-6">
                                    <input
                                        type="text"
                                        value={newTerm}
                                        onChange={e => setNewTerm(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="e.g. Premium due before policy issue"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && newTerm.trim()) {
                                                e.preventDefault();
                                                const updated = [...paymentTermsTemplates, newTerm.trim()];
                                                setPaymentTermsTemplates(updated);
                                                setNewTerm('');
                                                axios.post('/api/settings', { key: 'payment_terms_templates', value: JSON.stringify(updated) }).catch(() => { });
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (newTerm.trim()) {
                                                const updated = [...paymentTermsTemplates, newTerm.trim()];
                                                setPaymentTermsTemplates(updated);
                                                setNewTerm('');
                                                axios.post('/api/settings', { key: 'payment_terms_templates', value: JSON.stringify(updated) }).catch(() => { });
                                            }
                                        }}
                                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> Add
                                    </button>
                                </div>

                                {paymentTermsTemplates.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                        No payment terms templates defined yet. Add one above.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {paymentTermsTemplates.map((term, idx) => (
                                            <div key={idx} className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/50 transition-colors">
                                                <span className="text-sm text-slate-700 font-medium">{term}</span>
                                                <button
                                                    onClick={() => {
                                                        const updated = paymentTermsTemplates.filter((_, i) => i !== idx);
                                                        setPaymentTermsTemplates(updated);
                                                        axios.post('/api/settings', { key: 'payment_terms_templates', value: JSON.stringify(updated) }).catch(() => { });
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
