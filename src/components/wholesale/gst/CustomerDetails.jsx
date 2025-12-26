import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';

const CustomerDetails = () => {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/gst-billing/customers');
            setCustomers(res.data.data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const handleCustomerSelect = async (e) => {
        const customerId = e.target.value;
        if (!customerId) {
            setSelectedCustomer(null);
            setLedger([]);
            return;
        }

        const customer = customers.find(c => c.id === parseInt(customerId));
        setSelectedCustomer(customer);
        fetchLedger(customerId);
    };

    const fetchLedger = async (customerId) => {
        setLoading(true);
        try {
            const res = await api.get(`/gst-billing/customers/${customerId}/ledger`);
            setLedger(res.data.data);
        } catch (error) {
            console.error('Error fetching ledger:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Customer Details</h2>

            {/* Search/Select Customer */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-sm font-medium mb-2 block">Select Customer to View Details</label>
                <select
                    className="w-full md:w-1/2 border p-2 rounded"
                    onChange={handleCustomerSelect}
                    value={selectedCustomer ? selectedCustomer.id : ''}
                >
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {selectedCustomer && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Info Card */}
                    <div className="bg-white p-6 rounded-lg shadow border border-blue-100">
                        <h3 className="text-lg font-bold text-blue-800 mb-4 border-b pb-2">Customer Profile</h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="font-semibold w-24 inline-block">Name:</span> {selectedCustomer.name}</p>
                            <p><span className="font-semibold w-24 inline-block">Phone:</span> {selectedCustomer.phone || '-'}</p>
                            <p><span className="font-semibold w-24 inline-block">Email:</span> {selectedCustomer.email || '-'}</p>
                            <p><span className="font-semibold w-24 inline-block">PAN:</span> {selectedCustomer.panNumber || '-'}</p>
                            <p><span className="font-semibold w-24 inline-block">GSTIN:</span> {selectedCustomer.gstNumber || '-'}</p>
                            <p><span className="font-semibold w-24 inline-block">Address:</span> {selectedCustomer.address || '-'}</p>
                        </div>
                    </div>

                    {/* Ledger / Recent Bills */}
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Bill History</h3>
                        {loading ? (
                            <p className="text-gray-500">Loading history...</p>
                        ) : ledger.length === 0 ? (
                            <p className="text-gray-500">No bills found for this customer.</p>
                        ) : (
                            <div className="overflow-y-auto max-h-64">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="p-2 text-left">Date</th>
                                            <th className="p-2 text-left">Bill No</th>
                                            <th className="p-2 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledger.map(bill => (
                                            <tr key={bill.id} className="border-b hover:bg-gray-50">
                                                <td className="p-2">{bill.date}</td>
                                                <td className="p-2 font-medium text-blue-600">{bill.billNumber}</td>
                                                <td className="p-2 text-right font-medium">₹{bill.grandTotal}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDetails;
