import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, FileText, UploadCloud, Link as LinkIcon, Link2 } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function ClientAddPage() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '', email: '', mobile: '', notes: '', referenceId: ''
    });
    const [references, setReferences] = useState<any[]>([]);
    const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
    const [documentLink, setDocumentLink] = useState('');
    const [documentFile, setDocumentFile] = useState<File | null>(null);

    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = async () => {
        try {
            const refRes = await axios.get('/api/references?status=ACTIVE');
            setReferences(refRes.data);
        } catch (err) {
            console.error("Failed to fetch reference data", err);
        }
    };
    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSaving(true);

        try {
            // First create the client
            const payload = { ...formData };
            if (!payload.referenceId) delete (payload as any).referenceId;

            const clientRes = await axios.post('/api/clients', payload);
            const newClient = clientRes.data;

            // Then if any document was provided, upload/save it
            let finalDocUrl = '';

            if (uploadMode === 'file' && documentFile) {
                const docData = new FormData();
                docData.append('document', documentFile);
                const uploadRes = await axios.post('/api/upload', docData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                finalDocUrl = uploadRes.data.url;
            } else if (uploadMode === 'link' && documentLink) {
                finalDocUrl = documentLink;
            }

            // Save document record if there's an actual document url
            if (finalDocUrl) {
                // To support a clean schema, we create a generic route or just use notes currently if no dedicated api for documents on client init
                // Since there is a Document model but no direct POST /api/documents yet, we'll append to client's note or you can add a document controller.

                // For now, let's just append it to Notes if we don't have a direct endpoint, 
                // but the schema says Document model has clientId, type, url, customTags.
                // Let's assume we can do a quick inline push to notes or maybe we need a dedicated route.

                // For safety, let's at least append it to the client's notes in this version
                const updatedNotes = `${formData.notes}\n\n[Attached Document]: ${finalDocUrl}`;
                await axios.put(`/api/clients/${newClient.id}`, { ...newClient, notes: updatedNotes });
            }

            navigate('/clients');
        } catch (error: any) {
            setError(error.response?.data?.error || 'Failed to create client.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/clients" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add New Client</h1>
                    <p className="text-sm text-slate-500 mt-1">Create a new client profile and upload related documents.</p>
                </div>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-6">

                {error && (
                    <div className="p-4 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Primary Details</h2>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Full Name <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm" placeholder="e.g. John Doe" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm" placeholder="john@example.com" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Mobile Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm" placeholder="+1 234 567 890" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Referred By (Optional)</label>
                        <div className="relative">
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select value={formData.referenceId} onChange={e => setFormData({ ...formData, referenceId: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm">
                                <option value="">-- No Referrer (Direct) --</option>
                                {references.map(ref => (
                                    <option key={ref.id} value={ref.id}>{ref.name} ({ref.type}) {ref.code ? `- ${ref.code}` : ''}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Client Documents & Notes</h2>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Attach Document (Optional)</label>

                        <div className="flex gap-2 mb-3 bg-slate-100 p-1 rounded-lg w-max">
                            <button type="button" onClick={() => setUploadMode('file')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${uploadMode === 'file' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>File Upload</button>
                            <button type="button" onClick={() => setUploadMode('link')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${uploadMode === 'link' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>External Link</button>
                        </div>

                        {uploadMode === 'file' ? (
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100/50 transition-colors">
                                <UploadCloud className="w-8 h-8 text-blue-500 mb-2" />
                                <p className="text-sm font-medium text-slate-700 mb-1">Click to upload or drag and drop</p>
                                <p className="text-xs text-slate-500 mb-4">SVG, PNG, JPG or PDF (max. 10MB)</p>
                                <input
                                    type="file"
                                    onChange={(e) => setDocumentFile(e.target.files ? e.target.files[0] : null)}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
                                />
                            </div>
                        ) : (
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="url" value={documentLink} onChange={e => setDocumentLink(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm" placeholder="https://drive.google.com/..." />
                            </div>
                        )}
                    </div>

                    <div className="space-y-1 pt-2">
                        <label className="text-sm font-medium text-slate-700">General Notes</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <textarea rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm resize-none" placeholder="Any important information or remarks..."></textarea>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                    <Link to="/clients" className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold transition-colors text-sm shadow-sm">
                        Cancel
                    </Link>
                    <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 text-sm flex items-center justify-center shadow-sm">
                        {isSaving ? 'Creating...' : 'Create Client'}
                    </button>
                </div>

            </form>
        </div>
    );
}
