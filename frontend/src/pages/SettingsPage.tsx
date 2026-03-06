import { useState, useEffect } from 'react';
import { Building2, Globe, Mail, Save, Image as ImageIcon, FileText, Plus, Trash2, Palette } from 'lucide-react';
import clsx from 'clsx';
import axios from 'axios';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'company' | 'global' | 'integrations' | 'paymentTerms' | 'branding'>('company');
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

    const tabs = [
        { id: 'company', label: 'Company Profile', icon: Building2 },
        { id: 'branding', label: 'Brand Settings', icon: Palette },
        { id: 'global', label: 'Global Settings', icon: Globe },
        { id: 'paymentTerms', label: 'Payment Terms', icon: FileText },
        { id: 'integrations', label: 'Integrations', icon: Mail }
    ] as const;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your organization's preferences and integrations.</p>
                </div>
                <button
                    onClick={handleSave}
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
                                onClick={() => setActiveTab(tab.id)}
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

                        {/* Company Profile Tab */}
                        {activeTab === 'company' && (
                            <div className="p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                                <h2 className="text-lg font-bold text-slate-900 mb-6">Company Profile</h2>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                                        <div className="w-24 h-24 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center border-dashed">
                                            <ImageIcon className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-900 mb-1">Company Logo</h3>
                                            <p className="text-xs text-slate-500 mb-3">Recommended size 256x256px. PNG, JPG max 2MB.</p>
                                            <button className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                                                Upload Logo
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Company Name</label>
                                            <input type="text" defaultValue="InsureFlow Corp." className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Tax ID / PAN</label>
                                            <input type="text" defaultValue="ABCDE1234F" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Support Email</label>
                                            <input type="email" defaultValue="support@insureflow.com" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Support Phone</label>
                                            <input type="text" defaultValue="+1 (555) 123-4567" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm" />
                                        </div>
                                        <div className="sm:col-span-2 space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Headquarters Address</label>
                                            <textarea rows={3} defaultValue="123 Insurance Blvd, Suite 400&#10;New York, NY 10001" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm"></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Global Settings Tab */}
                        {activeTab === 'global' && (
                            <div className="p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                                <h2 className="text-lg font-bold text-slate-900 mb-6">Global Settings</h2>

                                <div className="space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Default Currency</label>
                                        <select className="w-full sm:w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm">
                                            <option value="INR">INR (₹)</option>
                                            <option value="EUR">EUR (€)</option>
                                            <option value="GBP">GBP (£)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Date Format</label>
                                        <select className="w-full sm:w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm">
                                            <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option>
                                            <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</option>
                                            <option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Timezone</label>
                                        <select className="w-full sm:w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm">
                                            <option value="UTC">UTC (Coordinated Universal Time)</option>
                                            <option value="America/New_York">Eastern Time (US & Canada)</option>
                                            <option value="Asia/Kolkata">India Standard Time (IST)</option>
                                        </select>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 mt-6">
                                        <label className="flex items-center gap-3">
                                            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">Enable Email Notifications</p>
                                                <p className="text-xs text-slate-500">Automatically send emails for policy renewals and updates.</p>
                                            </div>
                                        </label>
                                    </div>
                                    <div className="pt-2">
                                        <label className="flex items-center gap-3">
                                            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">SMS Reminders</p>
                                                <p className="text-xs text-slate-500">Enable SMS notifications for clients (requires SMS provider integration).</p>
                                            </div>
                                        </label>
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

                        {/* Brand Settings Tab */}
                        {activeTab === 'branding' && (
                            <div className="p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                                <h2 className="text-lg font-bold text-slate-900 mb-6">Brand Settings</h2>
                                <p className="text-sm text-slate-500 mb-6">Configure your software identity — logo, name, favicon, and colors used across the app and PDF reports.</p>

                                <div className="space-y-6">
                                    {/* Logo Upload */}
                                    <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                                        <div className="w-24 h-24 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden border-dashed">
                                            {branding.logo_url ? (
                                                <img src={branding.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-slate-300" />
                                            )}
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
                                        <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden border-dashed">
                                            {branding.favicon_url ? (
                                                <img src={branding.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
                                            ) : (
                                                <ImageIcon className="w-5 h-5 text-slate-300" />
                                            )}
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

                        {/* Integrations Tab */}
                        {activeTab === 'integrations' && (
                            <div className="p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                                <h2 className="text-lg font-bold text-slate-900 mb-6">Integrations</h2>

                                <div className="space-y-6">
                                    <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                                                    <Mail className="w-5 h-5 text-slate-700" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">SMTP Settings</h3>
                                                    <p className="text-xs text-slate-500">Configure outbound email delivery</p>
                                                </div>
                                            </div>
                                            <div className="px-2.5 py-1 bg-green-100 text-green-700 border border-green-200 rounded text-xs font-semibold">
                                                Connected
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-600">SMTP Host</label>
                                                <input type="text" defaultValue="smtp.sendgrid.net" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-600">SMTP Port</label>
                                                <input type="text" defaultValue="587" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm" />
                                            </div>
                                            <div className="space-y-1.5 sm:col-span-2">
                                                <label className="text-xs font-medium text-slate-600">SMTP Username</label>
                                                <input type="text" defaultValue="apikey" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm" />
                                            </div>
                                            <div className="space-y-1.5 sm:col-span-2">
                                                <label className="text-xs font-medium text-slate-600">SMTP Password</label>
                                                <input type="password" defaultValue="*************************" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-sm" />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
                                                Test Connection
                                            </button>
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 rounded-xl p-5 bg-white">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-xl font-bold text-slate-400">
                                                    S
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">SMS Gateway (Twilio)</h3>
                                                    <p className="text-xs text-slate-500">Send automated SMS reminders</p>
                                                </div>
                                            </div>
                                            <button className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                                                Configure
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
