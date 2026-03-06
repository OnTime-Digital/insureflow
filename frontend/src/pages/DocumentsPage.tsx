import { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, X, Download, AlertCircle, Link as LinkIcon, Loader2 } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

interface Client {
    id: string;
    name: string;
}

interface Document {
    id: string;
    clientId: string;
    client: {
        name: string;
    };
    policy?: {
        policyNo: string;
    } | null;
    type: string;
    url: string;
    originalName: string | null;
    customTags: string | null;
    createdAt: string;
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // Filters
    const [filterType, setFilterType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Upload Form State
    const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
    const [formData, setFormData] = useState({
        clientId: '',
        type: 'KYC',
        url: '',
        customTags: ''
    });
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(handler);
    }, [filterType, searchQuery]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterType) params.append('type', filterType);
            if (searchQuery) params.append('search', searchQuery);

            const [docsRes, clientsRes] = await Promise.all([
                axios.get(`/api/documents?${params.toString()}`),
                axios.get('/api/clients')
            ]);
            setDocuments(docsRes.data);
            setClients(clientsRes.data.data || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            await axios.delete(`/api/documents/${id}`);
            setDocuments(docs => docs.filter(d => d.id !== id));
        } catch (error) {
            console.error('Failed to delete document:', error);
            alert('Failed to delete document.');
        }
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploadError('');

        if (!formData.clientId) {
            setUploadError('Please select a client.');
            return;
        }

        setIsUploading(true);

        try {
            let finalUrl = formData.url;
            let uploadedOriginalName = '';
            let uploadedMimeType = '';
            let uploadedFileSize = 0;

            // Handle file upload
            if (uploadMode === 'file' && documentFile) {
                const uploadData = new FormData();
                uploadData.append('document', documentFile);

                const uploadRes = await axios.post('/api/upload', uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                finalUrl = uploadRes.data.url;
                uploadedOriginalName = documentFile.name;
                uploadedMimeType = documentFile.type;
                uploadedFileSize = documentFile.size;
            } else if (uploadMode === 'link' && !formData.url) {
                setUploadError('Please provide a document link.');
                setIsUploading(false);
                return;
            } else if (uploadMode === 'file' && !documentFile) {
                setUploadError('Please select a file to upload.');
                setIsUploading(false);
                return;
            }

            // Create document record with metadata
            const payload: any = {
                ...formData,
                url: finalUrl,
                originalName: uploadedOriginalName || undefined,
                mimeType: uploadedMimeType || undefined,
                fileSize: uploadedFileSize || undefined
            };
            if (!payload.assignedTo) delete payload.assignedTo;

            const newDocRes = await axios.post('/api/documents', payload);

            setDocuments([newDocRes.data, ...documents]);
            handleCloseModal();

        } catch (error: any) {
            console.error('Upload failed:', error);
            setUploadError(error.response?.data?.error || 'Failed to finish uploading document.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCloseModal = () => {
        setIsUploadModalOpen(false);
        setFormData({ clientId: '', type: 'KYC', url: '', customTags: '' });
        setDocumentFile(null);
        setUploadError('');
    };

    const getDocumentLink = (url: string) => {
        if (url.startsWith('http')) return url;
        const baseUrl = (axios.defaults.baseURL || 'http://localhost:5005').replace(/\/$/, '');
        return `${baseUrl}${url}`;
    };

    const getDownloadLink = (docId: string) => {
        const baseUrl = (axios.defaults.baseURL || 'http://localhost:5005').replace(/\/$/, '');
        return `${baseUrl}/api/documents/${docId}/download`;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Documents</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage and securely store client documents.</p>
                </div>
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                    <Upload className="w-4 h-4" />
                    Upload File
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full sm:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="">All Types</option>
                    <option value="KYC">KYC</option>
                    <option value="POLICY">Policy</option>
                    <option value="PROPOSAL">Proposal</option>
                    <option value="CLAIM">Claim</option>
                    <option value="OTHER">Other</option>
                </select>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20 bg-white rounded-xl border border-slate-200">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            ) : documents.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No Documents Yet</h3>
                    <p className="text-slate-500 max-w-sm">
                        You haven't uploaded any documents. Click "Upload File" to add your first client document.
                    </p>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="mt-6 text-blue-600 font-semibold hover:text-blue-700 text-sm"
                    >
                        Upload your first file &rarr;
                    </button>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold">
                                <tr>
                                    <th className="px-4 py-3">Document</th>
                                    <th className="px-4 py-3">Client</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Date Added</th>
                                    <th className="px-4 py-3 text-right w-[140px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {documents.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                    {doc.url.startsWith('http') && !doc.url.includes('localhost') ? <LinkIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                </div>
                                                <div className="font-medium text-slate-900 max-w-[200px] truncate" title={doc.originalName || doc.url}>
                                                    {doc.customTags || doc.originalName || doc.url.split('/').pop() || 'Document Link'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-700">
                                            {doc.client?.name || 'Unknown Client'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                                                {doc.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-4 py-3 text-right space-x-1 w-[140px]">
                                            <div className="flex items-center justify-end gap-0.5">
                                                <a
                                                    href={getDocumentLink(doc.url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View in New Tab"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </a>
                                                <a
                                                    href={getDownloadLink(doc.id)}
                                                    className="inline-flex p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(doc.id)}
                                                    className="inline-flex p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <h3 className="font-bold text-lg text-slate-900">Upload Document</h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-slate-50 hover:bg-slate-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {uploadError && (
                                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm font-medium border border-red-200 rounded-lg flex gap-2 items-start">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{uploadError}</span>
                                </div>
                            )}

                            <form id="uploadForm" onSubmit={handleUploadSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Client <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        value={formData.clientId}
                                        onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    >
                                        <option value="">Select a client...</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>



                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Document Type <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    >
                                        <option value="KYC">KYC Document (ID, PAN, Aadhaar)</option>
                                        <option value="POLICY">Policy Copy</option>
                                        <option value="PROPOSAL">Proposal Form</option>
                                        <option value="CLAIM">Claim Document</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">File Source</label>
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        <button type="button" onClick={() => setUploadMode('file')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${uploadMode === 'file' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Upload File</button>
                                        <button type="button" onClick={() => setUploadMode('link')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${uploadMode === 'link' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>External Link</button>
                                    </div>
                                </div>

                                {uploadMode === 'file' ? (
                                    <div className="space-y-1.5">
                                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50">
                                            <Upload className="w-8 h-8 text-blue-500 mb-2" />
                                            <p className="text-sm font-medium text-slate-700 mb-1">Select file to upload</p>
                                            <input
                                                type="file"
                                                onChange={(e) => setDocumentFile(e.target.files ? e.target.files[0] : null)}
                                                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer mt-3"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">External URL <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="url"
                                                value={formData.url}
                                                onChange={e => setFormData({ ...formData, url: e.target.value })}
                                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                placeholder="https://drive.google.com/..."
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Display Name / Description</label>
                                    <input
                                        type="text"
                                        value={formData.customTags}
                                        onChange={e => setFormData({ ...formData, customTags: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        placeholder="e.g. John's Aadhar Card (Optional)"
                                        maxLength={100}
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="uploadForm"
                                disabled={isUploading}
                                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                            >
                                {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isUploading ? 'Uploading...' : 'Save Document'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
