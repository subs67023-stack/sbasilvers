import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { numberToWords } from '../../../utils/numberToWords';
import { generateGSTBillPDF } from '../../../utils/generateGSTBillPDF';


const CreateBill = ({ editingBill, onBillSaved }) => {
    // Current Date formatted as YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [billDetails, setBillDetails] = useState({
        customerId: '',
        date: today,
        state: 'Maharashtra', // Default
        stateCode: '27', // Default for MH
        transportMode: '',
        dispatchedThrough: '',
        destination: '',
        placeOfSupply: '',
        pinCode: '',
        pinCode: '',
        paymentMode: 'Cash',
        paymentDate: today
    });

    // Items State
    const [items, setItems] = useState([
        { srNo: 1, description: '', hsn: '', quantity: 0, ratePerGm: 0, amount: 0 }
    ]);

    // Derived Totals
    const [totals, setTotals] = useState({
        totalQuantity: 0,
        totalAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        roundOff: 0,
        grandTotal: 0
    });

    const [amountInWordsStr, setAmountInWordsStr] = useState('');

    // New Customer Modal State
    const [showNewCustomer, setShowNewCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        address: '',
        panNumber: '',
        gstNumber: '',
        email: '',
        phone: ''
    });

    // State Constants
    const states = [
        { name: 'Maharashtra', code: '27' },
        { name: 'Gujarat', code: '24' },
        { name: 'Karnataka', code: '29' },
        // Add more as needed or fetch from an API
    ];

    useEffect(() => {
        fetchCustomers();
    }, []);

    // Populate form if editing
    useEffect(() => {
        if (editingBill) {
            setBillDetails({
                customerId: editingBill.customerId,
                date: editingBill.date,
                state: editingBill.state,
                stateCode: editingBill.stateCode,
                transportMode: editingBill.transportMode || '',
                dispatchedThrough: editingBill.dispatchedThrough || '',
                destination: editingBill.destination || '',
                placeOfSupply: editingBill.placeOfSupply || '',
                pinCode: editingBill.pinCode || '',
                placeOfSupply: editingBill.placeOfSupply || '',
                pinCode: editingBill.pinCode || '',
                paymentMode: editingBill.paymentMode || 'Cash',
                paymentDate: editingBill.paymentDate || today
            });
            const itemsToLoad = editingBill.items || [];
            setItems(itemsToLoad.map(item => ({
                ...item,
                srNo: item.srNo, // Ensure correct mapping
            })));
        } else {
            // Reset form if not editing (or switching back to create mode manually?)
            // For now, let's keep it simple. If editingBill becomes null, we reset.
            resetForm();
        }
    }, [editingBill]);

    const resetForm = () => {
        // Current Date formatted as YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];
        setBillDetails({
            customerId: '',
            date: today,
            state: 'Maharashtra',
            stateCode: '27',
            transportMode: '',
            dispatchedThrough: '',
            destination: '',
            placeOfSupply: '',
            pinCode: '',
            pinCode: '',
            paymentMode: 'Cash',
            paymentDate: today
        });
        setItems([
            { srNo: 1, description: '', hsn: '', quantity: 0, ratePerGm: 0, amount: 0 }
        ]);
        setAmountInWordsStr('');
    };


    useEffect(() => {
        calculateTotals();
    }, [items, billDetails.state]);

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/gst-billing/customers');
            setCustomers(res.data.data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const handleBillChange = (e) => {
        const { name, value } = e.target;

        if (name === 'state') {
            const selectedState = states.find(s => s.name === value);
            setBillDetails(prev => ({
                ...prev,
                state: value,
                stateCode: selectedState ? selectedState.code : ''
            }));
        } else {
            setBillDetails(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        // Auto-calculate amount if qty or rate changes
        if (field === 'quantity' || field === 'ratePerGm') {
            const qty = parseFloat(newItems[index].quantity) || 0;
            const rate = parseFloat(newItems[index].ratePerGm) || 0;
            newItems[index].amount = (qty * rate).toFixed(2);
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, {
            srNo: items.length + 1,
            description: '',
            hsn: '',
            quantity: 0,
            ratePerGm: 0,
            amount: 0
        }]);
    };

    const removeItem = (index) => {
        if (items.length === 1) return;
        const newItems = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, srNo: i + 1 }));
        setItems(newItems);
    };

    const calculateTotals = () => {
        const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
        const totalAmt = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

        let cgst = 0, sgst = 0, igst = 0;

        if (billDetails.state.toLowerCase() === 'maharashtra') {
            cgst = totalAmt * 0.015; // 1.5%
            sgst = totalAmt * 0.015; // 1.5%
        } else {
            igst = totalAmt * 0.03; // 3%
        }

        const totalWithTax = totalAmt + cgst + sgst + igst;
        const grandTotal = Math.round(totalWithTax);
        const roundOff = grandTotal - totalWithTax;

        setTotals({
            totalQuantity: totalQty,
            totalAmount: totalAmt,
            cgst: parseFloat(cgst.toFixed(2)),
            sgst: parseFloat(sgst.toFixed(2)),
            igst: parseFloat(igst.toFixed(2)),
            roundOff: parseFloat(roundOff.toFixed(2)),
            grandTotal: grandTotal
        });

        // Convert to words
        const words = numberToWords(grandTotal);
        setAmountInWordsStr(words ? `Rupees ${words}` : '');
    };

    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/gst-billing/customers', newCustomer);
            if (res.data.status === 'success') {
                setCustomers([...customers, res.data.data]);
                setBillDetails(prev => ({ ...prev, customerId: res.data.data.id }));
                setShowNewCustomer(false);
                setNewCustomer({ name: '', address: '', panNumber: '', gstNumber: '', email: '', phone: '' }); // Reset
            }
        } catch (error) {
            console.error('Error creating customer:', error);
            alert('Failed to create customer');
        }
    };

    const handleSubmit = async () => {
        if (!billDetails.customerId) {
            alert('Please select a customer');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...billDetails,
                ...totals,
                cgstAmount: totals.cgst,
                sgstAmount: totals.sgst,
                igstAmount: totals.igst,
                amountInWords: amountInWordsStr,
                items: items
            };

            let res;
            if (editingBill) {
                res = await api.put(`/gst-billing/bills/${editingBill.id}`, payload);
            } else {
                res = await api.post('/gst-billing/bills', payload);
            }


            // Ask to download PDF
            if (window.confirm('Bill Created! Do you want to download the PDF?')) {
                // Use the created bill from response
                if (res.data && res.data.data) {
                    generateGSTBillPDF(res.data.data);
                }
            }
            alert('Bill Created Successfully!');

            // Reset form or redirect? 
            // Possibly reset form for next bill:
            setItems([{ srNo: 1, description: '', hsn: '', quantity: 0, ratePerGm: 0, amount: 0 }]);
            setBillDetails(prev => ({ ...prev, customerId: '', date: today }));
        } catch (error) {
            console.error('Error creating bill:', error);
            alert('Failed to create bill');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Create New Bill</h2>

            {/* Customer & Date Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Customer</label>
                    <div className="flex gap-2">
                        <select
                            name="customerId"
                            value={billDetails.customerId}
                            onChange={handleBillChange}
                            className="flex-1 border p-2 rounded"
                        >
                            <option value="">Select Customer</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => setShowNewCustomer(true)}
                            className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700"
                        >
                            +
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Date</label>
                    <input
                        type="date"
                        name="date"
                        value={billDetails.date}
                        onChange={handleBillChange}
                        className="border p-2 rounded"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">State</label>
                    <div className="flex gap-2">
                        <select
                            name="state"
                            value={billDetails.state}
                            onChange={handleBillChange}
                            className="flex-1 border p-2 rounded"
                        >
                            {states.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                            <option value="Other">Other</option>
                        </select>
                        <input
                            type="text"
                            readOnly
                            value={billDetails.stateCode}
                            className="w-16 border p-2 rounded bg-gray-100 text-center"
                            title="State Code"
                        />
                    </div>
                </div>
            </div>

            {/* Transport Details (Optional) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium">Dispatched Through</label>
                    <input type="text" name="dispatchedThrough" value={billDetails.dispatchedThrough} onChange={handleBillChange} className="border p-2 rounded text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium">Destination</label>
                    <input type="text" name="destination" value={billDetails.destination} onChange={handleBillChange} className="border p-2 rounded text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium">Place of Supply</label>
                    <input type="text" name="placeOfSupply" value={billDetails.placeOfSupply} onChange={handleBillChange} className="border p-2 rounded text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium">Pin Code</label>
                    <input type="text" name="pinCode" value={billDetails.pinCode} onChange={handleBillChange} className="border p-2 rounded text-sm" />
                </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border p-2 text-center w-12">Sr.</th>
                            <th className="border p-2 text-left">Description</th>
                            <th className="border p-2 text-center w-24">HSN</th>
                            <th className="border p-2 text-center w-24">Qty</th>
                            <th className="border p-2 text-right w-32">Rate/Gm</th>
                            <th className="border p-2 text-right w-32">Amount</th>
                            <th className="border p-2 w-16"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td className="border p-2 text-center">{item.srNo}</td>
                                <td className="border p-2">
                                    <input
                                        className="w-full p-1 border rounded"
                                        value={item.description}
                                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                        placeholder="Item Description"
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        className="w-full p-1 border rounded text-center"
                                        value={item.hsn}
                                        onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        className="w-full p-1 border rounded text-center"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        type="number"
                                        className="w-full p-1 border rounded text-right"
                                        value={item.ratePerGm}
                                        onChange={(e) => handleItemChange(index, 'ratePerGm', e.target.value)}
                                    />
                                </td>
                                <td className="border p-2">
                                    <input
                                        readOnly
                                        className="w-full p-1 border-none bg-transparent text-right font-medium"
                                        value={item.amount}
                                    />
                                </td>
                                <td className="border p-2 text-center">
                                    <button onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">×</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button
                    onClick={addItem}
                    className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
                >
                    + Add Item
                </button>
            </div>

            {/* Calculations & Footer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Side: Amount in Words & Payment Mode */}
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded">
                        <label className="text-sm font-medium text-gray-600">Amount in Words</label>
                        <p className="text-lg font-bold italic">{amountInWordsStr}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Payment Mode</label>
                        <select
                            name="paymentMode"
                            value={billDetails.paymentMode}
                            onChange={handleBillChange}
                            className="w-full border p-2 rounded mt-1"
                        >
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Online">Online Transfer</option>
                            <option value="Credit">Credit</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Payment Date</label>
                        <input
                            type="date"
                            name="paymentDate"
                            value={billDetails.paymentDate}
                            onChange={handleBillChange}
                            className="w-full border p-2 rounded mt-1"
                        />
                    </div>
                </div>

                {/* Right Side: Totals */}
                <div className="bg-gray-50 p-4 rounded space-y-2">
                    <div className="flex justify-between">
                        <span>Total Quantity:</span>
                        <span className="font-semibold">{totals.totalQuantity.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Total Amount:</span>
                        <span className="font-semibold">{totals.totalAmount.toFixed(2)}</span>
                    </div>
                    {billDetails.state === 'Maharashtra' ? (
                        <>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>CGST (1.5%):</span>
                                <span>{totals.cgst}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>SGST (1.5%):</span>
                                <span>{totals.sgst}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>IGST (3%):</span>
                            <span>{totals.igst}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Round Off:</span>
                        <span>{totals.roundOff}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2 text-xl font-bold">
                        <span>Grand Total:</span>
                        <span>₹ {totals.grandTotal}</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
                {/* PDF Generation will be integrated here */}
                {/* <button className="px-6 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">Preview Bill</button> */}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-8 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Processing...' : (editingBill ? 'Update Bill' : 'Create Bill')}
                </button>
            </div>

            {/* New Customer Modal */}
            {showNewCustomer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Add New Customer</h3>
                        <form onSubmit={handleCreateCustomer} className="space-y-3">
                            <input
                                className="w-full border p-2 rounded"
                                placeholder="Customer Name *"
                                required
                                value={newCustomer.name}
                                onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                            />
                            <input
                                className="w-full border p-2 rounded"
                                placeholder="Phone Number"
                                value={newCustomer.phone}
                                onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                            />
                            <textarea
                                className="w-full border p-2 rounded"
                                placeholder="Address"
                                value={newCustomer.address}
                                onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                            />
                            <input
                                className="w-full border p-2 rounded"
                                placeholder="PAN Number"
                                value={newCustomer.panNumber}
                                onChange={e => setNewCustomer({ ...newCustomer, panNumber: e.target.value })}
                            />
                            <input
                                className="w-full border p-2 rounded"
                                placeholder="GST Number"
                                value={newCustomer.gstNumber}
                                onChange={e => setNewCustomer({ ...newCustomer, gstNumber: e.target.value })}
                            />
                            <input
                                className="w-full border p-2 rounded"
                                placeholder="Email"
                                value={newCustomer.email}
                                onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                            />
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowNewCustomer(false)} className="flex-1 border p-2 rounded">Cancel</button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded">Save Customer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateBill;
