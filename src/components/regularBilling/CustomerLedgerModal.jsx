import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { generateLedgerPDF } from '../../utils/regularPdfGenerator';

export default function CustomerLedgerModal({ customer, onClose }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ transactions: [], customer: null });
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        fetchLedger();
    }, [customer, dateRange]);

    const fetchLedger = async () => {
        if (!customer) return;
        setLoading(true);
        try {
            let url = `/regular-billing/customers/${customer.id}/ledger`;
            if (dateRange.start && dateRange.end) {
                url += `?startDate=${dateRange.start}&endDate=${dateRange.end}`;
            }
            const response = await api.get(url);
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching ledger:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => new Date(date).toLocaleDateString('en-GB');

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* HEADER */}
                    <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 flex justify-between items-center shrink-0">
                        <div>
                            <h2 className="text-xl font-bold tracking-wider">CUSTOMER LEDGER</h2>
                            <p className="text-blue-200 text-sm">Statement for: {customer.name} {customer.phone && `(${customer.phone})`}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => generateLedgerPDF(data, customer)}
                                className="bg-white text-blue-700 px-3 py-1 rounded shadow hover:bg-gray-100 transition-all font-bold text-sm flex items-center gap-1"
                            >
                                <span>📄</span> Download PDF
                            </button>
                            <button onClick={onClose} className="text-blue-200 hover:text-white px-3 py-1 rounded border border-blue-500 hover:border-white transition-all">
                                ✕ Close
                            </button>
                        </div>
                    </div>

                    {/* FILTERS */}
                    <div className="p-4 bg-gray-50 border-b flex gap-4 items-center">
                        <input type="date" className="p-2 border rounded" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                        <span className="text-gray-500">to</span>
                        <input type="date" className="p-2 border rounded" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                        <button onClick={() => setDateRange({ start: '', end: '' })} className="text-sm text-blue-600 hover:underline">Clear Filter</button>
                    </div>

                    {/* TABLE */}
                    <div className="flex-1 overflow-auto p-4 bg-gray-100">
                        <div className="bg-white shadow rounded overflow-hidden">
                            <table className="w-full text-xs md:text-sm border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-300">
                                    <tr>
                                        <th className="p-3 text-left font-bold text-gray-600 w-24">Date</th>
                                        <th className="p-3 text-left font-bold text-gray-600">Particulars</th>

                                        <th className="p-3 text-right font-bold text-orange-700 border-l">Silver Debit</th>
                                        <th className="p-3 text-right font-bold text-green-700">Silver Credit</th>
                                        <th className="p-3 text-right font-bold text-gray-800 bg-gray-50">Silver Bal</th>

                                        <th className="p-3 text-right font-bold text-purple-700 border-l">Amt Debit</th>
                                        <th className="p-3 text-right font-bold text-blue-700">Amt Credit</th>
                                        <th className="p-3 text-right font-bold text-gray-800 bg-gray-50">Amt Bal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan={8} className="p-8 text-center">Loading ledger...</td></tr>
                                    ) : data.transactions.length === 0 ? (
                                        <tr><td colSpan={8} className="p-8 text-center text-gray-500">No transactions found</td></tr>
                                    ) : (
                                        data.transactions.map((txn, idx) => {
                                            // Determine Debit/Credit
                                            // Silver: "Sale" adds (+), "Payment" subtracts (-).
                                            // Logic: silverWeight > 0 => Debit (Owe). silverWeight < 0 => Credit (Paid).
                                            // Labor: laborAmount > 0 => Debit (Owe). laborAmount < 0 => Credit (Paid).

                                            const sDebit = parseFloat(txn.silverWeight) > 0 ? parseFloat(txn.silverWeight) : 0;
                                            const sCredit = parseFloat(txn.silverWeight) < 0 ? Math.abs(parseFloat(txn.silverWeight)) : 0;

                                            const lDebit = parseFloat(txn.laborAmount) > 0 ? parseFloat(txn.laborAmount) : 0;
                                            const lCredit = parseFloat(txn.laborAmount) < 0 || parseFloat(txn.cashAmount) > 0 ? Math.abs(parseFloat(txn.laborAmount) || parseFloat(txn.cashAmount)) : 0;
                                            // Wait. CashForSilver: laborAmount=0, cashAmount>0.
                                            // BUT cashAmount in txn is just recorded. Is it crediting Labor Balance?
                                            // Check controller: 
                                            // cash_for_silver: laborAmount: 0. balanceLabor unchanged.
                                            // So CashForSilver does NOT affect Labor Balance. It affects Silver Balance (silver reduced).
                                            // So L Debit/Credit should be 0.
                                            // Labor Payment: laborAmount negative. So Credit.

                                            // Refined Logic:
                                            // Silver Debit: txn.silverWeight > 0
                                            // Silver Credit: txn.silverWeight < 0

                                            // Amt Debit: txn.laborAmount > 0
                                            // Amt Credit: txn.laborAmount < 0

                                            const aDebit = parseFloat(txn.laborAmount) > 0 ? parseFloat(txn.laborAmount) : 0;
                                            const aCredit = parseFloat(txn.laborAmount) < 0 ? Math.abs(parseFloat(txn.laborAmount)) : 0;

                                            return (
                                                <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-3 border-r text-gray-500">{formatDate(txn.transactionDate)}</td>
                                                    <td className="p-3 border-r">
                                                        <div className="font-semibold text-gray-700 uppercase text-xs mb-1 bg-gray-200 inline-block px-1 rounded">
                                                            {txn.type.replace(/_/g, ' ')}
                                                        </div>
                                                        <div className="text-gray-600">{txn.notes}</div>
                                                    </td>

                                                    {/* Silver Columns */}
                                                    <td className="p-3 text-right text-orange-700 font-medium">
                                                        {sDebit > 0 ? sDebit.toFixed(3) : '-'}
                                                    </td>
                                                    <td className="p-3 text-right text-green-700 font-medium border-r">
                                                        {sCredit > 0 ? sCredit.toFixed(3) : '-'}
                                                    </td>
                                                    <td className="p-3 text-right font-bold bg-gray-50 border-r">
                                                        {parseFloat(txn.balanceSilverAfter).toFixed(3)}
                                                    </td>

                                                    {/* Amount Columns */}
                                                    <td className="p-3 text-right text-purple-700 font-medium">
                                                        {aDebit > 0 ? aDebit.toFixed(2) : '-'}
                                                    </td>
                                                    <td className="p-3 text-right text-blue-700 font-medium border-r">
                                                        {aCredit > 0 ? aCredit.toFixed(2) : '-'}
                                                    </td>
                                                    <td className="p-3 text-right font-bold bg-gray-50">
                                                        {parseFloat(txn.balanceLaborAfter).toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
