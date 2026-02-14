import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import CustomerLedgerModal from './CustomerLedgerModal';

export default function ProductCustomersSection() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showLedgerModal, setShowLedgerModal] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, [search]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/product-billing/customers?search=${search}&limit=100`);
            if (response.data.success) {
                setCustomers(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or phone..."
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">Loading...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bal Labor</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bal Silver</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {customers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium">{customer.name}</td>
                                        <td className="px-4 py-3 text-sm">{customer.phone}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{customer.address || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                                            ₹{parseFloat(customer.balanceLabor || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">
                                            {parseFloat(customer.balanceSilver || 0).toFixed(3)} g
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => {
                                                    setSelectedCustomer(customer);
                                                    setShowLedgerModal(true);
                                                }}
                                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm font-semibold transition"
                                            >
                                                📖 Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Customer Ledger Modal */}
            {showLedgerModal && selectedCustomer && (
                <CustomerLedgerModal
                    customer={selectedCustomer}
                    onClose={() => {
                        setShowLedgerModal(false);
                        setSelectedCustomer(null);
                    }}
                />
            )}
        </div>
    );
}
