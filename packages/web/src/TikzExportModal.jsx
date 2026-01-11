import React from 'react';

export function TikzExportModal({ tikzCode, onClose, isOpen }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-3/4 max-w-2xl bg-white">
                <h3 className="text-xl font-bold mb-4">Export to TikZ-CD</h3>
                <textarea
                    readOnly
                    value={tikzCode || ''}
                    className="w-full h-64 p-2 font-mono text-sm border rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                        onClick={() => {
                            navigator.clipboard.writeText(tikzCode);
                            alert("Copied!");
                        }}
                    >
                        Copy to Clipboard
                    </button>
                    <button
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}