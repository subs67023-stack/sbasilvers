import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

export default function ProductPaymentModal({ open, sale, onClose, onUpdate }) {
    const [loading, setLoading] = useState(false);
    const [paymentMode, setPaymentMode] = useState('cash'); // cash, silver, cashsilver, multiple

    // Payment States
    const [payments, setPayments] = useState({
        cash: '',
        cashForSilver: {
            rate: '',
            weight: ''
        }
    });

    const [silverPaymentsList, setSilverPaymentsList] = useState([]);
    const [newSilverPayment, setNewSilverPayment] = useState({
        name: '',
        fromNo: '',
        weight: '',
        touch: '',
        fine: ''
    });

    // Silver Helper Functions
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

    const calculateTotalPaidSilver = () => {
        let total = 0;
        silverPaymentsList.forEach(p => total += parseFloat(p.fine || 0));
        return total.toFixed(3);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        const cashAmount = parseFloat(payments.cash || 0);
        const silverTotal = parseFloat(calculateTotalPaidSilver());
        const cashForSilverWt = parseFloat(payments.cashForSilver.weight || 0);
        const cashForSilverRate = parseFloat(payments.cashForSilver.rate || 0);

        if (cashAmount <= 0 && silverTotal <= 0 && cashForSilverWt <= 0) {
            alert('Please enter at least one payment amount (Cash or Silver)');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                amount: cashAmount, // Labor Payment
                paidSilver: silverTotal, // Silver Payment
                cashForSilver: {
                    weight: cashForSilverWt,
                    rate: cashForSilverRate
                },
                paymentMode: paymentMode,
                notes: 'Payment Received',
                paymentDetails: {
                    silverPayments: silverPaymentsList,
                    cashPayment: payments.cash,
                    cashForSilver: payments.cashForSilver
                }
            };

            // Construct detailed notes
            if (silverPaymentsList.length > 0) {
                let paymentNote = `\n[Silver Payments]:\n`;
                silverPaymentsList.forEach(p => {
                    paymentNote += `- ${p.weight}g @ ${p.touch}% = ${p.fine}g (Ref: ${p.fromNo})\n`;
                });
                payload.notes += paymentNote;
            }
            if (cashForSilverWt > 0) {
                payload.notes += `\n[Cash for Silver]: ${cashForSilverWt}g @ ₹${cashForSilverRate}/g`;
            }


            const res = await api.post(`/product-billing/sales/${sale.id}/payment`, payload);

            if (res.data.success) {
                alert('Payment Recorded Successfully');
                onUpdate();
                onClose();
            }
        } catch (error) {
            console.error('Payment error', error);
            alert('Error recording payment: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-lg p-6 w-[500px] shadow-xl max-h-[90vh] overflow-y-auto"
            >
                <h3 className="text-xl font-bold mb-4">Record Payment</h3>
                <div className="bg-gray-100 p-3 rounded mb-4 text-sm">
                    <p>Voucher: <b>{sale.voucherNumber}</b></p>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="text-red-600 font-bold">Labor Due: ₹{sale.balanceLabor}</div>
                        <div className="text-orange-600 font-bold">Silver Due: {sale.balanceSilver} g</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Payment Mode Selector */}
                    <div className="flex gap-2 mb-2">
                        {['cash', 'silver', 'cashsilver', 'multiple'].map(mode => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setPaymentMode(mode)}
                                className={`px-2 py-1 text-xs rounded capitalize ${paymentMode === mode ? 'bg-blue-600 text-white shadow' : 'bg-white border hover:bg-gray-50'}`}
                            >
                                {mode === 'cash' ? 'Cash' : mode === 'cashsilver' ? 'Cash/Silver' : mode}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence>
                        {/* SILVER PAYMENT UI */}
                        {(paymentMode === 'silver' || paymentMode === 'multiple') && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-orange-50 p-4 rounded border border-orange-200">
                                <h4 className="font-bold text-orange-800 text-sm mb-2">Silver Payment</h4>
                                {silverPaymentsList.map((sp, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs bg-white p-2 rounded mb-1 border">
                                        <span>{sp.name || 'Item'} ({sp.weight}g)</span>
                                        <span className="font-mono font-bold">= {sp.fine}g</span>
                                        <button type="button" onClick={() => removeSilverPayment(i)} className="text-red-500 font-bold">×</button>
                                    </div>
                                ))}
                                <div className="grid grid-cols-5 gap-1 mt-2">
                                    <input placeholder="Wt" type="number" className="p-1 text-xs border rounded w-full" value={newSilverPayment.weight} onChange={e => handleNewSilverPaymentChange('weight', e.target.value)} />
                                    <input placeholder="Touch" type="number" className="p-1 text-xs border rounded w-full" value={newSilverPayment.touch} onChange={e => handleNewSilverPaymentChange('touch', e.target.value)} />
                                    <input placeholder="Name" className="p-1 text-xs border rounded w-full col-span-2" value={newSilverPayment.name} onChange={e => setNewSilverPayment({ ...newSilverPayment, name: e.target.value })} />
                                    <button type="button" onClick={addSilverPayment} className="bg-orange-600 text-white rounded font-bold">+</button>
                                </div>
                                <div className="text-right mt-1 text-xs font-bold text-orange-700">
                                    Total: {calculateTotalPaidSilver()} g
                                </div>
                            </motion.div>
                        )}

                        {/* CASH PAYMENT UI */}
                        {(paymentMode === 'cash' || paymentMode === 'multiple') && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-green-50 p-4 rounded border border-green-200">
                                <label className="block text-xs font-bold text-green-800 mb-1">Cash Amount (₹)</label>
                                <input
                                    type="number"
                                    value={payments.cash}
                                    onChange={e => setPayments({ ...payments, cash: e.target.value })}
                                    className="w-full p-2 border rounded font-bold text-lg"
                                    placeholder="0.00"
                                />
                            </motion.div>
                        )}

                        {/* CASH FOR SILVER UI */}
                        {(paymentMode === 'cashsilver' || paymentMode === 'multiple') && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-blue-50 p-4 rounded border border-blue-200">
                                <h4 className="font-semibold text-blue-700 text-xs mb-2">Cash for Silver (Sell Silver for Cash)</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] text-gray-600">Rate (₹/g)</label>
                                        <input
                                            type="number"
                                            value={payments.cashForSilver.rate}
                                            onChange={e => setPayments({ ...payments, cashForSilver: { ...payments.cashForSilver, rate: e.target.value } })}
                                            className="w-full p-1 border rounded text-sm"
                                            placeholder="Rate"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-600">Weight (g)</label>
                                        <input
                                            type="number"
                                            value={payments.cashForSilver.weight}
                                            onChange={e => setPayments({ ...payments, cashForSilver: { ...payments.cashForSilver, weight: e.target.value } })}
                                            className="w-full p-1 border rounded text-sm"
                                            placeholder="Wt"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded hover:shadow-lg disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Payment'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
