import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export type RequiredField = {
    key: string;
    label: string;
    required?: boolean;
};

interface ImportMappingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (mapping: Record<string, string>) => void;
    headers: string[];
    requiredFields: RequiredField[];
    title?: string;
}

export default function ImportMappingModal({
    isOpen,
    onClose,
    onConfirm,
    headers,
    requiredFields,
    title = "Map Import Columns"
}: ImportMappingModalProps) {
    // Maps a required field key to the Excel header name
    const [mapping, setMapping] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            // Auto-map based on similar names if possible
            const initialMapping: Record<string, string> = {};
            requiredFields.forEach(field => {
                const match = headers.find(h =>
                    h.toLowerCase().includes(field.label.toLowerCase()) ||
                    field.label.toLowerCase().includes(h.toLowerCase())
                );
                if (match) {
                    initialMapping[field.key] = match;
                }
            });
            setMapping(initialMapping);
        }
    }, [isOpen, headers, requiredFields]);

    if (!isOpen) return null;

    const handleSelectChange = (fieldKey: string, headerValue: string) => {
        setMapping(prev => ({ ...prev, [fieldKey]: headerValue }));
    };

    const handleConfirm = () => {
        // Validate required fields
        const missing = requiredFields.filter(f => f.required && !mapping[f.key]);
        if (missing.length > 0) {
            alert(`Please map the following required fields: ${missing.map(m => m.label).join(', ')}`);
            return;
        }
        onConfirm(mapping);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                        <p className="text-sm text-slate-500 mt-1">Match the columns from your file to the correct fields.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-200">
                            <div className="text-sm font-semibold text-slate-700">Database Field</div>
                            <div className="text-sm font-semibold text-slate-700">Your File Column</div>
                        </div>

                        {requiredFields.map(field => (
                            <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                                <div className="flex items-center gap-2">
                                    <span className={clsx(
                                        "text-sm font-medium",
                                        field.required ? "text-slate-900" : "text-slate-600"
                                    )}>
                                        {field.label}
                                    </span>
                                    {field.required && <span className="text-xs text-red-500">*</span>}
                                </div>
                                <div>
                                    <select
                                        value={mapping[field.key] || ''}
                                        onChange={(e) => handleSelectChange(field.key, e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                    >
                                        <option value="">-- Ignore this field --</option>
                                        {headers.map(header => (
                                            <option key={header} value={header}>{header}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 bg-blue-50 text-blue-800 p-4 rounded-xl flex gap-3 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>
                            We've tried to automatically match columns with similar names.
                            Please double-check the mapping before confirming to ensure accurate data import.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold transition-colors shadow-sm"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Confirm Import
                    </button>
                </div>
            </div>
        </div>
    );
}
