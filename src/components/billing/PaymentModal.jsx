import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

export default function PaymentModal({ open, sale, onClose, onUpdate }) {
    const [tab, setTab] = useState('silver');
    const [loading, setLoading] = useState(false);

    // Silver Payment (Return) State
    const [silverRows, setSilverRows] = useState([
        { name: '', fromNo: '', weight: '', touch: '', notes: '' }
    ]);

    // Cash for Silver State
    const [cashForSilverForm, setCashForSilverForm] = useState({
        silverWeight: '',
        silverRate: '',
        paymentAmount: '', // Calculated
        notes: ''
    });

    // Cash/Amount Payment State (Labor)
    const [cashForm, setCashForm] = useState({
        amount: '',
        paymentMode: 'cash',
        referenceNumber: '',
        notes: ''
    });

    if (!open || !sale) return null;

    // Helper to calc fine weight for a row
    const calcRowFine = row => {
        const weight = parseFloat(row.weight || 0);
        const touch = parseFloat(row.touch || 0);
        if (!weight || !touch) return '0.000';
        return ((weight * touch) / 100).toFixed(3);
    };

    const addSilverRow = () => {
        setSilverRows(prev => [
            ...prev,
            { name: '', fromNo: '', weight: '', touch: '', notes: '' }
        ]);
    };

    const updateSilverRow = (idx, field, value) => {
        setSilverRows(prev =>
            prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
        );
    };

    const removeSilverRow = idx => {
        setSilverRows(prev => prev.filter((_, i) => i !== idx));
    };

    // Cash for Silver Handlers
    const handleC4SChange = (field, value) => {
        const newForm = { ...cashForSilverForm, [field]: value };

        // Auto calc amount if rate and weight present
        if (field === 'silverWeight' || field === 'silverRate') {
            const w = parseFloat(field === 'silverWeight' ? value : newForm.silverWeight) || 0;
            const r = parseFloat(field === 'silverRate' ? value : newForm.silverRate) || 0;
            newForm.paymentAmount = (w * r).toFixed(2);
        }
        setCashForSilverForm(newForm);
    };

    const handleSilverSubmit = async e => {
        e.preventDefault();
        setLoading(true);
        try {
            for (const row of silverRows) {
                const fine = parseFloat(calcRowFine(row));
                if (!fine || fine <= 0) continue;

                const detailNotes = `Name: ${row.name || '-'}, FromRatio: ${row.fromNo || '-'}, Wt: ${row.weight}, T: ${row.touch} | ${row.notes}`;

                const res = await api.post(
                    `/billing/sales/${sale.id}/silver-return`,
                    {
                        silverWeight: fine,
                        notes: detailNotes
                    }
                );
                if (!res.data.success) throw new Error(res.data.message);
            }
            alert('Silver return(s) recorded successfully');
            if (onUpdate) onUpdate();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Error: ' + (e.response?.data?.message || e.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCashForSilverSubmit = async e => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post(`/billing/sales/${sale.id}/cash-for-silver`, {
                silverWeight: parseFloat(cashForSilverForm.silverWeight),
                silverRate: parseFloat(cashForSilverForm.silverRate),
                notes: cashForSilverForm.notes
            });
            if (res.data.success) {
                alert('Cash for Silver recorded successfully');
                if (onUpdate) onUpdate();
                onClose();
            }
        } catch (e) {
            console.error(e);
            alert('Error: ' + (e.response?.data?.message || e.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCashSubmit = async e => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post(
                `/billing/sales/${sale.id}/payment`,
                {
                    amount: parseFloat(cashForm.amount || 0),
                    paymentMode: cashForm.paymentMode,
                    referenceNumber: cashForm.referenceNumber,
                    notes: cashForm.notes
                }
            );
            if (res.data.success) {
                alert('Payment recorded successfully');
                if (onUpdate) onUpdate();
                onClose();
            }
        } catch (e) {
            console.error(e);
            alert('Error: ' + (e.response?.data?.message || e.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {open && sale && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">
                                Make Payment - {sale.voucherNumber}
                            </h2>
                            <button
                                className="px-3 py-1 text-xs bg-red-500 text-white rounded"
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </div>

                        <div className="mb-4 text-xs bg-gray-50 p-3 rounded border grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-gray-600">Customer</p>
                                <p className="font-bold text-sm">{sale.customer?.name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-600">Pending Balances</p>
                                <div className="flex justify-end gap-3">
                                    <span className="text-orange-600 font-bold whitespace-nowrap">
                                        Build Silver: {parseFloat(sale.balanceSilver || 0).toFixed(3)}
                                    </span>
                                    <span className="text-green-600 font-bold whitespace-nowrap">
                                        Amt: {parseFloat(sale.balanceLabor || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mb-4 text-sm border-b pb-1">
                            <button
                                className={`px-4 py-2 rounded-t font-medium ${tab === 'silver'
                                        ? 'bg-orange-600 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                onClick={() => setTab('silver')}
                            >
                                Silver Return
                            </button>
                            <button
                                className={`px-4 py-2 rounded-t font-medium ${tab === 'c4s'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                onClick={() => setTab('c4s')}
                            >
                                Cash for Silver
                            </button>
                            <button
                                className={`px-4 py-2 rounded-t font-medium ${tab === 'cash'
                                        ? 'bg-green-600 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                onClick={() => setTab('cash')}
                            >
                                Amount Payment
                            </button>
                        </div>

                        <div className="bg-white min-h-[300px]">
                            {tab === 'silver' && (
                                <form onSubmit={handleSilverSubmit} className="space-y-3 text-xs">
                                    <div className="p-2 bg-orange-50 text-orange-800 rounded mb-2 text-[11px]">
                                        Add items being returned/paid in silver. Fine weight will be credited to 'Balance Silver'.
                                    </div>
                                    {silverRows.map((row, idx) => (
                                        <div
                                            key={idx}
                                            className="mb-2 border rounded p-3 bg-gray-50 border-orange-100"
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-orange-700">Item #{idx + 1}</span>
                                                {silverRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="text-red-500 hover:text-red-700"
                                                        onClick={() => removeSilverRow(idx)}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                                                <div>
                                                    <label className="block mb-1 text-gray-500">Item Name</label>
                                                    <input
                                                        type="text"
                                                        value={row.name}
                                                        onChange={e => updateSilverRow(idx, 'name', e.target.value)}
                                                        className="w-full border rounded px-2 py-1"
                                                        placeholder="e.g. Chain"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block mb-1 text-gray-500">From / Ref</label>
                                                    <input
                                                        type="text"
                                                        value={row.fromNo}
                                                        onChange={e => updateSilverRow(idx, 'fromNo', e.target.value)}
                                                        className="w-full border rounded px-2 py-1"
                                                        placeholder="Ref Details"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block mb-1 text-gray-500 font-bold">Gross Wt</label>
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        value={row.weight}
                                                        onChange={e => updateSilverRow(idx, 'weight', e.target.value)}
                                                        className="w-full border rounded px-2 py-1 font-semibold"
                                                        placeholder="0.000"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block mb-1 text-gray-500">Touch %</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={row.touch}
                                                        onChange={e => updateSilverRow(idx, 'touch', e.target.value)}
                                                        className="w-full border rounded px-2 py-1"
                                                        placeholder="92.50"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 mt-2 border-t pt-2">
                                                <div className="flex-1">
                                                    <label className="block mb-1 text-gray-500">Notes</label>
                                                    <input
                                                        type="text"
                                                        value={row.notes}
                                                        onChange={e => updateSilverRow(idx, 'notes', e.target.value)}
                                                        className="w-full border rounded px-2 py-1"
                                                        placeholder="Remarks..."
                                                    />
                                                </div>
                                                <div className="text-right bg-white px-3 py-1 rounded border border-orange-200">
                                                    <span className="block text-[10px] text-gray-500 uppercase tracking-wider">Fine Silver</span>
                                                    <span className="font-bold text-lg text-orange-600 block leading-none">
                                                        {calcRowFine(row)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={addSilverRow}
                                        className="w-full py-2 border border-dashed border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        + Add Another Item
                                    </button>

                                    <div className="pt-4 border-t mt-4">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-3 bg-orange-600 text-white rounded font-bold shadow hover:bg-orange-700 disabled:opacity-50 transition-colors"
                                        >
                                            {loading ? 'Processing...' : 'Submit Silver Return'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {tab === 'c4s' && (
                                <form onSubmit={handleCashForSilverSubmit} className="space-y-4 text-xs max-w-md mx-auto py-4">
                                    <div className="p-3 bg-blue-50 text-blue-800 rounded border border-blue-100 text-[11px] mb-2">
                                        Convert silver to cash value. Reduces <strong>Balance Silver</strong>, but logs cash value.
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block mb-1 font-bold text-gray-700">Silver Weight (g)</label>
                                            <input
                                                type="number"
                                                step="0.001"
                                                value={cashForSilverForm.silverWeight}
                                                onChange={e => handleC4SChange('silverWeight', e.target.value)}
                                                className="w-full border rounded p-2"
                                                placeholder="0.000"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-1 font-bold text-gray-700">Rate (₹/g)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={cashForSilverForm.silverRate}
                                                onChange={e => handleC4SChange('silverRate', e.target.value)}
                                                className="w-full border rounded p-2"
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="p-3 bg-gray-100 rounded text-center">
                                        <p className="text-gray-500 mb-1">Total Value</p>
                                        <p className="text-xl font-bold text-gray-800">
                                            ₹ {cashForSilverForm.paymentAmount || '0.00'}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block mb-1 font-medium text-gray-700">Notes</label>
                                        <textarea
                                            value={cashForSilverForm.notes}
                                            onChange={e => handleC4SChange('notes', e.target.value)}
                                            className="w-full border rounded p-2"
                                            rows={2}
                                            placeholder="Optional remarks"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 bg-blue-600 text-white rounded font-bold shadow hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                                    >
                                        {loading ? 'Processing...' : 'Submit Cash for Silver'}
                                    </button>
                                </form>
                            )}

                            {tab === 'cash' && (
                                <form onSubmit={handleCashSubmit} className="space-y-4 text-xs max-w-md mx-auto py-4">
                                    <div className="p-3 bg-green-50 text-green-800 rounded border border-green-100">
                                        <label className="block text-sm font-bold mb-1 text-green-900">Payment Amount (₹)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={cashForm.amount}
                                            onChange={e => setCashForm({ ...cashForm, amount: e.target.value })}
                                            className="w-full border-2 border-green-200 rounded p-2 text-2xl font-bold text-green-700 focus:border-green-500 outline-none"
                                            placeholder="0.00"
                                            autoFocus
                                            required
                                        />
                                        <p className="text-[10px] mt-1 opacity-75">Reduces 'Balance Amount' (Labor charges)</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block mb-1 font-medium text-gray-700">Payment Mode</label>
                                            <select
                                                value={cashForm.paymentMode}
                                                onChange={e => setCashForm({ ...cashForm, paymentMode: e.target.value })}
                                                className="w-full border rounded p-2 bg-gray-50"
                                            >
                                                <option value="cash">Cash</option>
                                                <option value="bank">Bank Transfer / UPI</option>
                                                <option value="check">Cheque</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block mb-1 font-medium text-gray-700">Reference No.</label>
                                            <input
                                                type="text"
                                                value={cashForm.referenceNumber}
                                                onChange={e => setCashForm({ ...cashForm, referenceNumber: e.target.value })}
                                                className="w-full border rounded p-2"
                                                placeholder="Txn ID / Cheque No"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block mb-1 font-medium text-gray-700">Notes / Remarks</label>
                                        <textarea
                                            value={cashForm.notes}
                                            onChange={e => setCashForm({ ...cashForm, notes: e.target.value })}
                                            className="w-full border rounded p-2"
                                            rows={3}
                                            placeholder="Optional"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 bg-green-600 text-white rounded font-bold shadow hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                                    >
                                        {loading ? 'Processing...' : 'Record Payment'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
