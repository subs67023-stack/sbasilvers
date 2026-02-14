import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { generatePDF } from '../../utils/pdfGenerator';

export default function ProductCreateSaleSection({ onSaleCreated, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [wholesaleProducts, setWholesaleProducts] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Add Customer Modal State
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', gstNumber: '' });

    // Form State
    const [formData, setFormData] = useState({
        customerId: '',
        billingType: 'wholesale',
        date: new Date().toISOString().split('T')[0],
        includePreviousDue: true,
        notes: ''
    });

    const [items, setItems] = useState([
        {
            productId: '',
            description: '',
            pieces: 1,
            grossWeight: '',
            stoneWeight: 0,
            netWeight: '',
            wastage: 0,
            touch: 92.50,
            laborRatePerKg: 1000
        }
    ]);

    // Payment States
    const [paymentMode, setPaymentMode] = useState('none'); // none, silver, cash, multiple
    const [silverPaymentsList, setSilverPaymentsList] = useState([]);
    const [newSilverPayment, setNewSilverPayment] = useState({
        name: '',
        fromNo: '',
        weight: '',
        touch: '',
        fine: ''
    });

    const [payments, setPayments] = useState({
        cash: '',
        cashForSilver: {
            rate: '',
            weight: ''
        }
    });

    useEffect(() => {
        fetchCustomers();
        fetchWholesaleProducts();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/product-billing/customers');
            if (response.data.success) {
                setCustomers(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const fetchWholesaleProducts = async () => {
        try {
            const response = await api.get('/billing/wholesale-products'); // Can still browse shared products or product-billing specific if needed. Using shared for now.
            if (response.data.success) {
                setWholesaleProducts(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const handleCustomerSelect = (e) => {
        const custId = e.target.value;
        setFormData({ ...formData, customerId: custId });
        const cust = customers.find(c => c.id === parseInt(custId));
        setSelectedCustomer(cust || null);
    };

    const handleSaveCustomer = async (e) => {
        if (e) e.preventDefault();
        if (!newCustomer.name || !newCustomer.phone) {
            alert('Name and Phone are required');
            return;
        }
        try {
            const response = await api.post('/product-billing/customers', newCustomer);
            if (response.data.success) {
                const createdCustomer = response.data.data;
                setCustomers([...customers, createdCustomer]);
                setFormData({ ...formData, customerId: createdCustomer.id });
                setSelectedCustomer(createdCustomer);
                setShowAddCustomer(false);
                setNewCustomer({ name: '', phone: '', address: '', gstNumber: '' });
                alert('Customer added successfully!');
            }
        } catch (error) {
            alert('Error adding customer: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...items];
        updatedItems[index][field] = value;

        if (field === 'grossWeight' || field === 'stoneWeight') {
            const gross = parseFloat(updatedItems[index].grossWeight) || 0;
            const stone = parseFloat(updatedItems[index].stoneWeight) || 0;
            updatedItems[index].netWeight = (gross - stone).toFixed(3);
        }
        setItems(updatedItems);
    };

    const addItem = () => {
        setItems([...items, {
            productId: '',
            description: '',
            pieces: 1,
            grossWeight: '',
            stoneWeight: 0,
            netWeight: '',
            wastage: 0,
            touch: 92.50,
            laborRatePerKg: 1000
        }]);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    // Payment Logic
    const handleNewSilverPaymentChange = (field, value) => {
        const updated = { ...newSilverPayment, [field]: value };
        if (field === 'weight' || field === 'touch') {
            const w = parseFloat(updated.weight || 0);
            const t = parseFloat(updated.touch || 0);
            updated.fine = ((w * t) / 100).toFixed(3);
        }
        setNewSilverPayment(updated);
    };

    const addSilverPayment = () => {
        if (!newSilverPayment.weight || !newSilverPayment.touch) return;
        setSilverPaymentsList([...silverPaymentsList, newSilverPayment]);
        setNewSilverPayment({ name: '', fromNo: '', weight: '', touch: '', fine: '' });
    };

    const removeSilverPayment = (index) => {
        setSilverPaymentsList(silverPaymentsList.filter((_, i) => i !== index));
    };

    const calculateTotals = () => {
        let totalNetWeight = 0;
        let totalSilverWeight = 0;
        let subtotal = 0;

        items.forEach(item => {
            const net = parseFloat(item.netWeight) || 0;
            const wastage = parseFloat(item.wastage) || 0;
            const touch = parseFloat(item.touch) || 0;
            const laborRate = parseFloat(item.laborRatePerKg) || 0;
            const gross = parseFloat(item.grossWeight) || 0;

            const silver = ((touch + wastage) * net) / 100;
            const labor = (gross / 1000) * laborRate;

            totalNetWeight += net;
            totalSilverWeight += silver;
            subtotal += labor;
        });

        const totalAmount = subtotal; // No GST for now

        // Payments
        let paidSilver = 0; // In grams
        silverPaymentsList.forEach(p => paidSilver += parseFloat(p.fine || 0));

        // Cash Paid
        let paidAmount = parseFloat(payments.cash || 0);

        // Cash For Silver Calculation
        const paidSilverValue = (parseFloat(payments.cashForSilver.rate || 0) * parseFloat(payments.cashForSilver.weight || 0));

        let prevLabor = 0;
        let prevSilver = 0;
        if (selectedCustomer && formData.includePreviousDue) {
            prevLabor = parseFloat(selectedCustomer.balanceLabor || 0);
            prevSilver = parseFloat(selectedCustomer.balanceSilver || 0);
        }

        const billTotalLabor = totalAmount + prevLabor;
        const billTotalSilver = totalSilverWeight + prevSilver;

        const balanceLabor = billTotalLabor - paidAmount;

        // Balance Silver
        const c4sWeight = parseFloat(payments.cashForSilver.weight || 0);
        const balanceSilver = billTotalSilver - paidSilver - c4sWeight;

        return {
            totalNetWeight: totalNetWeight.toFixed(3),
            totalSilverWeight: totalSilverWeight.toFixed(3),
            subtotal: subtotal.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            paidAmount: paidAmount.toFixed(2),
            paidSilver: paidSilver.toFixed(3),
            prevLabor: prevLabor.toFixed(2),
            prevSilver: prevSilver.toFixed(3),
            billTotalLabor: billTotalLabor.toFixed(2),
            billTotalSilver: billTotalSilver.toFixed(3),
            balanceLabor: balanceLabor.toFixed(2),
            balanceSilver: balanceSilver.toFixed(3),
            cashForSilverValue: paidSilverValue.toFixed(2)
        };
    };

    const totals = calculateTotals();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                customerId: formData.customerId,
                billingType: 'wholesale',
                items: items,
                silverRate: 0,
                paidAmount: payments.cash || 0,
                paidSilver: totals.paidSilver,
                notes: formData.notes,
                paymentDetails: {
                    silverPayments: silverPaymentsList,
                    cashPayment: payments.cash,
                    cashForSilver: payments.cashForSilver
                }
            };

            // Append detailed payment info to notes if silver payments exist
            if (silverPaymentsList.length > 0) {
                let paymentNote = `\n[Silver Payments]:\n`;
                silverPaymentsList.forEach(p => {
                    paymentNote += `- ${p.weight}g @ ${p.touch}% = ${p.fine}g (Ref: ${p.fromNo})\n`;
                });
                payload.notes += paymentNote;
            }

            const response = await api.post('/product-billing/sales', payload);
            if (response.data.success) {
                alert('Product Bill Created Successfully!');
                if (onSaleCreated) onSaleCreated();
                try {
                    generatePDF(response.data.data);
                } catch (e) { console.error(e); }
            }
        } catch (error) {
            alert('Error creating bill: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 relative">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Create Product Bill</h2>
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">Cancel</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Customer</label>
                        <div className="flex gap-2">
                            <select
                                value={formData.customerId}
                                onChange={handleCustomerSelect}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setShowAddCustomer(true)}
                                className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            > + </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <input type="date" value={formData.date} disabled className="w-full p-2 border rounded bg-gray-50" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border p-2">Description</th>
                                <th className="border p-2 w-[50px]">Pcs</th>
                                <th className="border p-2">Gross Wt</th>
                                <th className="border p-2">Stone Wt</th>
                                <th className="border p-2 bg-gray-50">Net Wt</th>
                                <th className="border p-2">Wastage</th>
                                <th className="border p-2">Touch %</th>
                                <th className="border p-2">Labor /kg</th>
                                <th className="border p-2 text-right">Silver</th>
                                <th className="border p-2 text-right">Labor Amt</th>
                                <th className="border p-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index}>
                                    <td className="border p-1">
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            className="w-full p-1 border rounded text-xs"
                                            placeholder="Description"
                                        />
                                    </td>
                                    <td className="border p-1">
                                        <input type="number" value={item.pieces} onChange={(e) => handleItemChange(index, 'pieces', e.target.value)} className="w-full p-1 border rounded text-xs" />
                                    </td>
                                    <td className="border p-1">
                                        <input type="number" step="0.001" value={item.grossWeight} onChange={(e) => handleItemChange(index, 'grossWeight', e.target.value)} className="w-full p-1 border rounded text-xs" />
                                    </td>
                                    <td className="border p-1">
                                        <input type="number" step="0.001" value={item.stoneWeight} onChange={(e) => handleItemChange(index, 'stoneWeight', e.target.value)} className="w-full p-1 border rounded text-xs" />
                                    </td>
                                    <td className="border p-1 bg-gray-50">
                                        <input type="number" value={item.netWeight} readOnly className="w-full p-1 border-none bg-transparent font-semibold text-xs" />
                                    </td>
                                    <td className="border p-1">
                                        <input type="number" step="0.001" value={item.wastage} onChange={(e) => handleItemChange(index, 'wastage', e.target.value)} className="w-full p-1 border rounded text-xs" />
                                    </td>
                                    <td className="border p-1">
                                        <input type="number" step="0.01" value={item.touch} onChange={(e) => handleItemChange(index, 'touch', e.target.value)} className="w-full p-1 border rounded text-xs" />
                                    </td>
                                    <td className="border p-1">
                                        <input type="number" value={item.laborRatePerKg} onChange={(e) => handleItemChange(index, 'laborRatePerKg', e.target.value)} className="w-full p-1 border rounded text-xs" />
                                    </td>
                                    <td className="border p-1 text-right text-gray-600 text-xs">
                                        {(((parseFloat(item.touch) + parseFloat(item.wastage)) * parseFloat(item.netWeight)) / 100).toFixed(2)}
                                    </td>
                                    <td className="border p-1 text-right font-medium text-xs">
                                        {(parseFloat(item.grossWeight) / 1000 * parseFloat(item.laborRatePerKg)).toFixed(0)}
                                    </td>
                                    <td className="border p-1 text-center">
                                        <button type="button" onClick={() => removeItem(index)} className="text-red-500 font-bold">✕</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button type="button" onClick={addItem} className="mt-2 text-sm text-blue-600 font-semibold hover:underline">+ Add Item</button>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
                    <h3 className="text-lg font-bold mb-4 text-gray-800">Payment</h3>
                    <div className="flex gap-2 mb-4">
                        {['none', 'silver', 'cash', 'cashsilver', 'multiple'].map(mode => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setPaymentMode(mode)}
                                className={`px-3 py-1 rounded capitalize ${paymentMode === mode ? 'bg-blue-600 text-white shadow' : 'bg-white border hover:bg-gray-50'}`}
                            >
                                {mode === 'cash' ? 'Labor Payment' : mode === 'cashsilver' ? 'Cash for Silver' : mode}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence>
                        {paymentMode !== 'none' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">

                                {/* SILVER PAYMENT UI */}
                                {(paymentMode === 'silver' || paymentMode === 'multiple') && (
                                    <div className="bg-orange-50 p-4 rounded border border-orange-200">
                                        <h4 className="font-bold text-orange-800 text-sm mb-2">Detailed Silver Payment</h4>
                                        {silverPaymentsList.map((sp, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs bg-white p-2 rounded mb-1 border">
                                                <span>{sp.name} (Ref: {sp.fromNo})</span>
                                                <span className="font-mono">{sp.weight}g x {sp.touch}% = <b>{sp.fine}g</b></span>
                                                <button type="button" onClick={() => removeSilverPayment(i)} className="text-red-500 font-bold">×</button>
                                            </div>
                                        ))}
                                        <div className="grid grid-cols-5 gap-2 mt-2">
                                            <input placeholder="Name" className="p-1 text-sm border rounded" value={newSilverPayment.name} onChange={e => setNewSilverPayment({ ...newSilverPayment, name: e.target.value })} />
                                            <input placeholder="Ref No" className="p-1 text-sm border rounded" value={newSilverPayment.fromNo} onChange={e => setNewSilverPayment({ ...newSilverPayment, fromNo: e.target.value })} />
                                            <input placeholder="Weight" type="number" className="p-1 text-sm border rounded" value={newSilverPayment.weight} onChange={e => handleNewSilverPaymentChange('weight', e.target.value)} />
                                            <input placeholder="Touch" type="number" className="p-1 text-sm border rounded" value={newSilverPayment.touch} onChange={e => handleNewSilverPaymentChange('touch', e.target.value)} />
                                            <button type="button" onClick={addSilverPayment} className="bg-orange-600 text-white rounded px-2 font-bold">+</button>
                                        </div>
                                        <div className="text-right mt-2 text-sm font-bold text-orange-700">
                                            Total Silver Paid: {totals.paidSilver} g
                                        </div>
                                    </div>
                                )}

                                {/* CASH PAYMENT UI */}
                                {(paymentMode === 'cash' || paymentMode === 'multiple') && (
                                    <div className="bg-green-50 p-4 rounded border border-green-200">
                                        <label className="block text-sm font-bold text-green-800 mb-1">Cash / Bank Received (₹)</label>
                                        <input
                                            type="number"
                                            value={payments.cash}
                                            onChange={e => setPayments({ ...payments, cash: e.target.value })}
                                            className="w-full p-2 border rounded font-bold text-lg"
                                            placeholder="0.00"
                                        />
                                    </div>
                                )}

                                {/* CASH FOR SILVER UI */}
                                {(paymentMode === 'cashsilver' || paymentMode === 'multiple') && (
                                    <div className="bg-white p-4 rounded border border-green-200 mt-2">
                                        <h4 className="font-semibold text-green-700 mb-2">Cash for Silver</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-600">Rate (₹/g)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={payments.cashForSilver.rate}
                                                    onChange={e => setPayments({ ...payments, cashForSilver: { ...payments.cashForSilver, rate: e.target.value } })}
                                                    className="w-full p-2 border rounded-lg text-sm"
                                                    placeholder="Rate"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600">Weight (g)</label>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    value={payments.cashForSilver.weight}
                                                    onChange={e => setPayments({ ...payments, cashForSilver: { ...payments.cashForSilver, weight: e.target.value } })}
                                                    className="w-full p-2 border rounded-lg text-sm"
                                                    placeholder="Weight"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* SUMMARY */}
                <div className="bg-gray-50 p-6 rounded-lg border">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Total Silver Wt</span>
                                <span className="font-bold">{totals.totalSilverWeight} g</span>
                            </div>
                            <div className="flex justify-between text-gray-600 text-sm">
                                <span>+ Prev Silver</span>
                                <span>{totals.prevSilver} g</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 font-bold text-lg text-orange-600">
                                <span>Bal. Silver</span>
                                <span>{totals.balanceSilver} g</span>
                            </div>
                            <div className="flex justify-between text-green-600 text-sm">
                                <span>- Paid Silver</span>
                                <span>{totals.paidSilver} g</span>
                            </div>
                            {(parseFloat(totals.cashForSilverValue || 0) > 0) && (
                                <div className="flex justify-between text-green-600 text-xs">
                                    <span>- CashForSilver Wt</span>
                                    <span>{payments.cashForSilver.weight} g</span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Total Labor</span>
                                <span className="font-bold">₹{totals.subtotal}</span>
                            </div>
                            <div className="flex justify-between text-gray-600 text-sm">
                                <span>+ Prev Labor</span>
                                <span>₹{totals.prevLabor}</span>
                            </div>
                            <div className="flex justify-between text-green-600 font-bold">
                                <span>- Paid</span>
                                <span>₹{totals.paidAmount}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 font-bold text-lg text-red-600">
                                <span>Bal. Labor</span>
                                <span>₹{totals.balanceLabor}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold text-lg shadow-lg hover:from-blue-700 hover:to-purple-700"
                >
                    {loading ? 'Creating...' : 'Finalize Product Bill'}
                </button>
            </form>

            {/* ADD CUSTOMER MODAL */}
            <AnimatePresence>
                {showAddCustomer && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    >
                        <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                            <h3 className="text-lg font-bold mb-4">Add Product Customer</h3>
                            <div className="space-y-3">
                                <input placeholder="Name" className="w-full p-2 border rounded" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                                <input placeholder="Phone" className="w-full p-2 border rounded" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                                <textarea placeholder="Address" className="w-full p-2 border rounded" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} />
                                <div className="flex justify-end gap-2 mt-4">
                                    <button onClick={() => setShowAddCustomer(false)} className="px-3 py-1 text-gray-600">Cancel</button>
                                    <button onClick={handleSaveCustomer} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
