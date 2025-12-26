import React, { useState } from 'react';
import WholesaleDashboard from './WholesaleDashboard';
import CreateBill from '../../components/wholesale/gst/CreateBill';
import SaleList from '../../components/wholesale/gst/SaleList';
import CustomerDetails from '../../components/wholesale/gst/CustomerDetails';

const GSTBilling = () => {
    const [activeTab, setActiveTab] = useState('create');
    const [editingBill, setEditingBill] = useState(null);

    const handleEditBill = (bill) => {
        setEditingBill(bill);
        setActiveTab('create');
    };

    const handleBillSaved = () => {
        setEditingBill(null);
        // Optionally switch to list or stay on create
    };


    const tabs = [
        { id: 'create', label: 'Create Bill', icon: '📝' },
        { id: 'list', label: 'Sale List', icon: '📋' },
        { id: 'customers', label: 'Customer Details', icon: '👥' }
    ];

    return (
        <WholesaleDashboard>
            <div className="bg-white rounded-lg shadow-lg min-h-[calc(100vh-6rem)]">
                {/* Tab Header */}
                <div className="flex border-b">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 text-sm font-medium transition-colors
                ${activeTab === tab.id
                                    ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <span className="text-xl">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'create' && <CreateBill editingBill={editingBill} onBillSaved={handleBillSaved} />}
                    {activeTab === 'list' && <SaleList onEdit={handleEditBill} />}
                    {activeTab === 'customers' && <CustomerDetails />}
                </div>
            </div>
        </WholesaleDashboard>
    );
};

export default GSTBilling;
