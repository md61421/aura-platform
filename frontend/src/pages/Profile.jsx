import React from 'react';

const Profile = () => {
    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Contributions</h2>
                <p className="text-gray-500">Track and manage your artifact submissions.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="text-sm font-medium text-gray-500 mb-1">Total Submissions</div>
                    <div className="text-3xl font-bold text-gray-900">12</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="text-sm font-medium text-gray-500 mb-1">Approved</div>
                    <div className="text-3xl font-bold text-green-600">8</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="text-sm font-medium text-gray-500 mb-1">Pending</div>
                    <div className="text-3xl font-bold text-amber-500">4</div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Artifact</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">Image Distortion Example</td>
                            <td className="px-6 py-4"><span className="px-2 py-1 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold uppercase">Pending</span></td>
                            <td className="px-6 py-4 text-sm text-gray-500">Mar 21, 2026</td>
                        </tr>
                        <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">Flow Pulsation</td>
                            <td className="px-6 py-4"><span className="px-2 py-1 rounded-full text-[10px] bg-green-100 text-green-800 font-bold uppercase">Published</span></td>
                            <td className="px-6 py-4 text-sm text-gray-500">Feb 28, 2026</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Profile;
