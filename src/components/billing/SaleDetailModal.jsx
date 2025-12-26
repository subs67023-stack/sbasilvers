import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
// Use the PDF generator we just updated
import { generatePDF } from '../../utils/pdfGenerator';

export default function SaleDetailModal({ sale, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);

  // Payment States
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMode: 'cash',
    referenceNumber: '',
    notes: ''
  });

  // Silver Payment States
  const [showSilverPaymentModal, setShowSilverPaymentModal] = useState(false);
  const [newSilverPayment, setNewSilverPayment] = useState({
    name: '',
    weight: '',
    touch: '',
    fine: ''
  });

  // Return Silver States (Wholesale specific feature)
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnData, setReturnData] = useState({
    silverWeight: '',
    notes: ''
  });

  // Helper to calculate totals from items
  const itemsTotal = sale.items.reduce((acc, item) => {
    return {
      gross: acc.gross + parseFloat(item.grossWeight || 0),
      net: acc.net + parseFloat(item.netWeight || 0),
      silver: acc.silver + parseFloat(item.silverWeight || 0),
      labor: acc.labor + parseFloat(item.laborCharges || 0)
    };
  }, { gross: 0, net: 0, silver: 0, labor: 0 });

  // Previous Due (Using stored values)
  const prevBalance = parseFloat(sale.previousBalance || 0);

  // Grand Total Not strictly needed if we rely on sale.totalAmount, but good for display checks
  const grandTotalAmount = parseFloat(sale.totalAmount || 0) + prevBalance;

  // Payments / Transactions
  const transactions = sale.transactions || [];

  // Handlers
  const handleAddPayment = async () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) return alert('Please enter valid amount');
    setLoading(true);
    try {
      // Use wholesale billing endpoint
      await api.post(`/billing/sales/${sale.id}/payment`, {
        amount: paymentData.amount,
        paymentMode: paymentData.paymentMode,
        referenceNumber: paymentData.referenceNumber,
        notes: paymentData.notes
      });

      alert('Payment added successfully!');
      setShowPaymentForm(false);
      setPaymentData({ amount: '', paymentMode: 'cash', referenceNumber: '', notes: '' });
      onUpdate();
    } catch (error) {
      console.error(error);
      alert('Error adding payment: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSilverPaymentSubmit = async () => {
    if (!newSilverPayment.weight || !newSilverPayment.touch) return alert('Fill required fields');
    setLoading(true);
    try {
      await api.post(`/billing/sales/${sale.id}/silver-payment`, {
        silverWeight: newSilverPayment.fine,
        weight: newSilverPayment.weight, // Extra details for notes if needed, but backend takes 'silverWeight'
        silverRate: sale.silverRate, // Pass current rate or from input if allowed? Backend uses 'silverRate' param
        notes: `Physical Silver Payment: ${newSilverPayment.weight}g @ ${newSilverPayment.touch}% = ${newSilverPayment.fine}g`
      });
      alert('Silver payment added!');
      setShowSilverPaymentModal(false);
      setNewSilverPayment({ name: '', weight: '', touch: '', fine: '' });
      onUpdate();
    } catch (e) {
      console.error(e);
      alert('Error adding silver payment: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleReturnSilverSubmit = async () => {
    if (!returnData.silverWeight) return alert('Weight required');
    setLoading(true);
    try {
      await api.post(`/billing/sales/${sale.id}/silver-return`, {
        silverWeight: returnData.silverWeight,
        notes: returnData.notes
      });
      alert('Return processed successfully!');
      setShowReturnModal(false);
      setReturnData({ silverWeight: '', notes: '' });
      onUpdate();
    } catch (e) {
      console.error(e);
      alert('Error processing return: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const calculateFine = (w, t) => {
    const we = parseFloat(w) || 0;
    const to = parseFloat(t) || 0;
    setNewSilverPayment({ ...newSilverPayment, weight: w, touch: t, fine: ((we * to) / 100).toFixed(3) });
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
          className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4 flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-xl font-bold tracking-wider">WHOLESALE SALE PREVIEW</h2>
              <p className="text-gray-400 text-sm">{sale.voucherNumber} | {formatDate(sale.saleDate)}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white px-3 py-1 rounded border border-gray-600 hover:border-white transition-all">
              ✕ Close
            </button>
          </div>

          {/* CONTENT - SCROLLABLE */}
          <div className="flex-1 overflow-auto p-6 bg-gray-50">

            {/* SINGLE CONTINUOUS TABLE */}
            <div className="bg-white shadow-sm border border-gray-300">
              <table className="w-full text-xs md:text-sm border-collapse">
                {/* Table Header */}
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase border-b border-gray-300">
                  <tr>
                    <th className="p-2 border-r border-gray-300 w-8">#</th>
                    <th className="p-2 border-r border-gray-300 text-left">Description</th>
                    <th className="p-2 border-r border-gray-300 w-16">Stamp</th>
                    <th className="p-2 border-r border-gray-300 w-12 text-center">Pcs</th>
                    <th className="p-2 border-r border-gray-300 text-right">Gross</th>
                    <th className="p-2 border-r border-gray-300 text-right">Stone</th>
                    <th className="p-2 border-r border-gray-300 text-right">Net</th>
                    <th className="p-2 border-r border-gray-300 text-right w-16">Touch</th>
                    <th className="p-2 border-r border-gray-300 text-right">Wstg</th>
                    <th className="p-2 border-r border-gray-300 text-right">Rate</th>
                    <th className="p-2 border-r border-gray-300 text-right bg-orange-50 text-orange-800">Silver</th>
                    <th className="p-2 text-right bg-green-50 text-green-800">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">

                  {/* Customer Header Row */}
                  <tr className="bg-gray-50 text-gray-800">
                    <td colSpan={12} className="p-3 border-b border-gray-300">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold block text-lg">{sale.customer?.name}</span>
                          <span className="text-xs text-gray-500">{sale.customer?.address} {sale.customer?.phone}</span>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${sale.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {sale.status?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* ITEMS */}
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2 border-r text-center text-gray-500">{idx + 1}</td>
                      <td className="p-2 border-r font-medium">{item.description}</td>
                      <td className="p-2 border-r text-center">{item.stamp || '-'}</td>
                      <td className="p-2 border-r text-center">{item.pieces || 1}</td>
                      <td className="p-2 border-r text-right">{parseFloat(item.grossWeight).toFixed(3)}</td>
                      <td className="p-2 border-r text-right text-gray-500">{parseFloat(item.stoneWeight || 0).toFixed(3)}</td>
                      <td className="p-2 border-r text-right font-semibold">{parseFloat(item.netWeight).toFixed(3)}</td>
                      <td className="p-2 border-r text-right">{parseFloat(item.touch).toFixed(2)}</td>
                      <td className="p-2 border-r text-right text-gray-500">{parseFloat(item.wastage || 0).toFixed(3)}</td>
                      <td className="p-2 border-r text-right">{parseFloat(item.laborRatePerKg || 0).toFixed(0)}</td>
                      <td className="p-2 border-r text-right font-bold text-orange-700 bg-orange-50/50">
                        {parseFloat(item.silverWeight).toFixed(3)}
                      </td>
                      <td className="p-2 text-right font-bold text-green-700 bg-green-50/50">
                        {parseFloat(item.itemAmount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  {/* TOTAL ROW */}
                  <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                    <td colSpan={4} className="p-2 border-r text-right">TOTAL</td>
                    <td className="p-2 border-r text-right">{itemsTotal.gross.toFixed(3)}</td>
                    <td className="p-2 border-r text-right" />
                    <td className="p-2 border-r text-right">{itemsTotal.net.toFixed(3)}</td>
                    <td className="p-2 border-r" colSpan={3} />
                    <td className="p-2 border-r text-right text-orange-700 bg-orange-100">
                      {itemsTotal.silver.toFixed(3)}
                    </td>
                    <td className="p-2 text-right text-green-700 bg-green-100">
                      {parseFloat(sale.subtotal || 0).toFixed(2)}
                    </td>
                  </tr>

                  {/* GST ROWS */}
                  {sale.gstApplicable && (
                    <>
                      <tr className="bg-gray-50 text-gray-600">
                        <td colSpan={11} className="p-2 border-r text-right">CGST</td>
                        <td className="p-2 text-right font-medium">{parseFloat(sale.cgst || 0).toFixed(2)}</td>
                      </tr>
                      <tr className="bg-gray-50 text-gray-600">
                        <td colSpan={11} className="p-2 border-r text-right">SGST</td>
                        <td className="p-2 text-right font-medium">{parseFloat(sale.sgst || 0).toFixed(2)}</td>
                      </tr>
                      <tr className="bg-gray-100 font-bold border-b border-gray-300">
                        <td colSpan={11} className="p-2 border-r text-right">Total Amount</td>
                        <td className="p-2 text-right font-bold text-green-800">{parseFloat(sale.totalAmount || 0).toFixed(2)}</td>
                      </tr>
                    </>
                  )}

                  {/* PREVIOUS DUE ROW */}
                  <tr className="bg-yellow-50 font-bold text-yellow-800 border-b border-yellow-200">
                    <td colSpan={10} className="p-2 border-r text-right">PREVIOUS DUE</td>
                    <td className="p-2 border-r text-right">
                      {parseFloat(sale.previousBalanceSilver || 0).toFixed(3)}
                    </td>
                    <td className="p-2 text-right">
                      {parseFloat(sale.previousBalanceLabor || 0).toFixed(2)}
                    </td>
                  </tr>

                  {/* GRAND TOTAL (Before Payments) if Prev Due exists */}
                  <tr className="bg-gray-200 font-bold border-b border-gray-400">
                    <td colSpan={10} className="p-2 border-r text-right uppercase">Total Due</td>
                    <td className="p-2 border-r text-right text-orange-900">
                      {(itemsTotal.silver + parseFloat(sale.previousBalanceSilver || 0)).toFixed(3)}
                    </td>
                    <td className="p-2 text-right text-green-900">
                      {(itemsTotal.labor + parseFloat(sale.previousBalanceLabor || 0)).toFixed(2)}
                    </td>
                  </tr>

                  {/* TRANSACTIONS (Payments & Returns) */}
                  {transactions.length > 0 && (
                    <>
                      <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <td colSpan={12} className="p-1 px-4 border-b border-gray-200 text-left">
                          Transaction History
                        </td>
                      </tr>
                      {transactions.map((txn, idx) => {
                        if (txn.type === 'sale') return null;

                        let typeLabel = txn.type.toUpperCase().replace('_', ' ');

                        return (
                          <tr key={idx} className={`${txn.type.includes('return') ? 'bg-red-50' : 'bg-white'}`}>
                            <td className="p-2 border-r text-center text-xs text-gray-500">{formatDate(txn.transactionDate)}</td>
                            <td colSpan={9} className="p-2 border-r text-left">
                              <span className="font-semibold text-xs px-2 py-0.5 rounded bg-gray-200 mr-2">
                                {typeLabel}
                              </span>
                              <span className="text-sm text-gray-600">{txn.notes}</span>
                            </td>
                            <td className="p-2 border-r text-right font-medium">
                              {parseFloat(txn.silverWeight) !== 0 ? (
                                <span className={parseFloat(txn.silverWeight) < 0 ? 'text-green-600' : 'text-red-600'}>
                                  {parseFloat(txn.silverWeight).toFixed(3)}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="p-2 text-right font-medium">
                              {txn.type === 'cash_for_silver' ? (
                                <span className="text-green-600 font-bold">
                                  {/* Show Cash Value */}
                                  {parseFloat(txn.cashAmount || 0).toFixed(2)}
                                </span>
                              ) : (
                                parseFloat(txn.amount) !== 0 ? (
                                  <span className={parseFloat(txn.amount) < 0 ? 'text-green-600' : 'text-red-600'}>
                                    {Math.abs(parseFloat(txn.amount)).toFixed(2)}
                                  </span>
                                ) : '-'
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </>
                  )}

                  {/* CLOSING BALANCE */}
                  <tr className="bg-gray-800 text-white font-bold text-lg border-t-2 border-black">
                    <td colSpan={10} className="p-3 border-r border-gray-600 text-right">CLOSING BALANCE</td>
                    <td className="p-3 border-r border-gray-600 text-right text-orange-300">
                      {parseFloat(sale.balanceSilver || 0).toFixed(3)} g
                    </td>
                    <td className="p-3 text-right text-green-300">
                      ₹{parseFloat(sale.balanceLabor || 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ACTION BUTTONS (Bottom) */}
            <div className="mt-8 flex flex-wrap gap-4 justify-end print:hidden">
              <button
                onClick={() => generatePDF(sale)}
                className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
              >
                Print PDF
              </button>

              <button
                onClick={() => setShowReturnModal(true)}
                className="px-6 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 transition"
              >
                Return Silver
              </button>

              <button
                onClick={() => setShowSilverPaymentModal(true)}
                className="px-6 py-2 bg-orange-600 text-white rounded shadow hover:bg-orange-700 transition"
              >
                Pay with Silver
              </button>

              <button
                onClick={() => setShowPaymentForm(true)}
                className="px-6 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 transition"
              >
                Add Payment
              </button>
            </div>

          </div>

          {/* MODALS */}

          {/* Pay Amount Modal */}
          {showPaymentForm && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowPaymentForm(false)}>
              <div className="bg-white p-6 rounded-lg w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold mb-4">Add Payment</h3>
                <input type="number" placeholder="Amount (₹)" className="w-full border p-2 mb-2 rounded"
                  value={paymentData.amount} onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })} />
                <select
                  value={paymentData.paymentMode}
                  onChange={e => setPaymentData({ ...paymentData, paymentMode: e.target.value })}
                  className="w-full border p-2 mb-2 rounded"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank Transfer</option>
                </select>
                <textarea placeholder="Notes" className="w-full border p-2 mb-4 rounded"
                  value={paymentData.notes} onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })} />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowPaymentForm(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                  <button onClick={handleAddPayment} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">
                    {loading ? 'Saving...' : 'Save Payment'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pay Silver Modal */}
          {showSilverPaymentModal && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowSilverPaymentModal(false)}>
              <div className="bg-white p-6 rounded-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold mb-4 text-orange-700">Pay with Silver</h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input type="number" placeholder="Weight (g)" className="flex-1 border p-2 rounded"
                      value={newSilverPayment.weight} onChange={e => calculateFine(e.target.value, newSilverPayment.touch)} />
                    <input type="number" placeholder="Touch %" className="flex-1 border p-2 rounded"
                      value={newSilverPayment.touch} onChange={e => calculateFine(newSilverPayment.weight, e.target.value)} />
                  </div>
                  <div className="bg-orange-50 p-2 text-right font-bold text-orange-800 rounded">
                    Fine: {newSilverPayment.fine} g
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowSilverPaymentModal(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                  <button onClick={handleSilverPaymentSubmit} disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded">
                    {loading ? 'Saving...' : 'Save Payment'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Return Silver Modal */}
          {showReturnModal && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowReturnModal(false)}>
              <div className="bg-white p-6 rounded-lg w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold mb-4 text-red-700">Return Silver</h3>
                <p className="text-xs text-gray-500 mb-4">This will record a silver return for this sale.</p>
                <div className="space-y-3">
                  <input type="number" placeholder="Silver Weight (g)" className="w-full border p-2 rounded font-bold"
                    value={returnData.silverWeight} onChange={e => setReturnData({ ...returnData, silverWeight: e.target.value })} />
                  <textarea placeholder="Notes / Reason" className="w-full border p-2 rounded"
                    value={returnData.notes} onChange={e => setReturnData({ ...returnData, notes: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowReturnModal(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                  <button onClick={handleReturnSilverSubmit} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded">
                    {loading ? 'Processing...' : 'Confirm Return'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </motion.div>
    </AnimatePresence >
  );
}
