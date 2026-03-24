import React, { useState } from 'react';

const Admin = () => {
    const [activeTab, setActiveTab] = useState('pending');

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Approval Queue</h2>
                    <p className="text-gray-500">Manage and review pending artifact submissions.</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                    <button 
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'pending' ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Pending (2)
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'history' ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        History
                    </button>
                </div>
            </div>

            {/* Pending Queue */}
            {activeTab === 'pending' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Artifact</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Submitter</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                                <i className="fas fa-brain text-xl"></i>
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">Motion Blur Example</div>
                                                <div className="text-xs text-brand-500 font-medium px-1.5 py-0.5 rounded bg-brand-50 inline-block mt-1">MRI</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white">JD</div>
                                            <span className="text-sm text-gray-600 font-medium">Dr. Jane Doe</span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">2 hours ago</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-600 max-w-xs truncate">Subject moved during the scan...</div>
                                        <div className="flex gap-1 mt-1">
                                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">3 Images</span>
                                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">Siemens</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                                                <i className="fas fa-check"></i>
                                            </button>
                                            <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                                                <i className="fas fa-times"></i>
                                            </button>
                                            <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors" title="View Details">
                                                <i className="fas fa-eye"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-slate-600 shrink-0 border border-dark-border">
                                                <i className="fas fa-brain text-xl"></i>
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">High Field Distortion</div>
                                                <div className="text-xs text-purple-500 font-medium px-1.5 py-0.5 rounded bg-purple-50 inline-block mt-1">Image Effect</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-[10px] text-white">MK</div>
                                            <span className="text-sm text-gray-600 font-medium">Mark Kim</span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">Yesterday</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-600 max-w-xs truncate">Signal loss at different tissue areas...</div>
                                        <div className="flex gap-1 mt-1">
                                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">1 Image</span>
                                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">GE</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                                                <i className="fas fa-check"></i>
                                            </button>
                                            <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                                                <i className="fas fa-times"></i>
                                            </button>
                                            <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors" title="View Details">
                                                <i className="fas fa-eye"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Review History */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Artifact</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reviewed By</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr className="opacity-75">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-slate-500"><i className="fas fa-brain"></i></div>
                                            <div className="font-medium text-gray-900">Image Wrap Effect</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-800 font-bold">APPROVED</span></td>
                                    <td className="px-6 py-4 text-sm text-gray-500">Admin_1</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">Mar 20, 2026</td>
                                </tr>
                                <tr className="opacity-75">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-slate-900 flex items-center justify-center text-slate-600"><i className="fas fa-brain"></i></div>
                                            <div className="font-medium text-gray-900">General Noise Background</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-800 font-bold">REJECTED</span></td>
                                    <td className="px-6 py-4 text-sm text-gray-500">Admin_1</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">Mar 19, 2026</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
