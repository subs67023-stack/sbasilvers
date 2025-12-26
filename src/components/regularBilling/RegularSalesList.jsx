import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import CreateRegularSale from './CreateRegularSale';
import PaymentModal from './PaymentModal';
import { generateRegularPDF } from '../../utils/regularPdfGenerator';

export default function RegularSalesList() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editSale, setEditSale] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSale, setPaymentSale] = useState(null);
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [showLedger, setShowLedger] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchSales = async () => {
    setLoading(true);
    try {
      let query = '/regular-billing/sales?limit=100';
      if (searchTerm) query += `&search=${searchTerm}`;
      if (startDate) query += `&startDate=${startDate}`;
      if (endDate) query += `&endDate=${endDate}`;

      const res = await api.get(query);
      if (res.data.success) {
        setSales(res.data.data);
      }
    } catch (e) {
      console.error('Error fetching sales', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleExportSales = async () => {
    try {
      let query = '/regular-billing/export/sales?';
      if (searchTerm) query += `&search=${searchTerm}`;
      if (startDate) query += `&startDate=${startDate}`;
      if (endDate) query += `&endDate=${endDate}`;

      const response = await api.get(query, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Sales_Export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting sales:', error);
      alert('Error exporting sales');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSales();
  }

  const handleViewSale = async saleId => {
    try {
      const res = await api.get(`/regular-billing/sales/${saleId}`);
      if (res.data.success) {
        setSelectedSale(res.data.data);
      }
    } catch (e) {
      console.error('Error fetching sale details', e);
    }
  };

  const handleEditSale = async saleId => {
    try {
      const res = await api.get(`/regular-billing/sales/${saleId}`);
      if (res.data.success) {
        setEditSale(res.data.data);
        setShowCreate(true);
      }
    } catch (e) {
      console.error('Error fetching sale for edit', e);
    }
  };

  const handleDeleteSale = async (sale) => {
    if (!window.confirm(`Are you sure you want to delete sale ${sale.voucherNumber}? This cannot be undone.`)) return;

    try {
      const res = await api.delete(`/regular-billing/sales/${sale.id}`);
      if (res.data.success) {
        alert('Sale deleted successfully');
        fetchSales();
      }
    } catch (e) {
      console.error('Error deleting sale', e);
      alert('Error deleting sale: ' + (e.response?.data?.message || e.message));
    }
  }

  const handleMakePayment = sale => {
    setPaymentSale(sale);
    setShowPaymentModal(true);
  };

  const handleGeneratePdf = sale => {
    generateRegularPDF(sale);
  };

  const handleReturnSilver = async (saleId, netWeight, notes) => {
    try {
      const res = await api.post(
        `/regular-billing/sales/${saleId}/return-silver`,
        { netWeight, notes }
      );
      if (res.data.success) {
        alert('Return silver recorded');
        fetchSales();
        if (selectedSale && selectedSale.id === saleId) {
          handleViewSale(saleId);
        }
      }
    } catch (e) {
      console.error('Return silver error', e);
      alert(
        'Error: ' + (e.response?.data?.message || e.message)
      );
    }
  };

  const openLedger = async customer => {
    setLedgerCustomer(customer);
    try {
      const res = await api.get(
        `/regular-billing/customers/${customer.id}/ledger`
      );
      if (res.data.success) {
        setLedgerData(res.data.data);
        setShowLedger(true);
      }
    } catch (e) {
      console.error('Ledger fetch error', e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Regular Billing - Sales
          </h1>
          <div className="mt-2 flex gap-2">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search Voucher / Customer"
                className="pt-1 pb-1 px-3 border rounded text-sm w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Search</button>
            </form>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1 rounded text-sm border ${showFilters ? 'bg-gray-200 border-gray-400' : 'bg-white border-gray-300'}`}
            >
              Filters {showFilters ? '▲' : '▼'}
            </button>
            <button
              onClick={handleExportSales}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              📊 Export Excel
            </button>
          </div>
          {showFilters && (
            <div className="mt-2 p-3 bg-gray-50 border rounded flex gap-4 items-end">
              <div>
                <label className="text-xs text-gray-600 block">Start Date</label>
                <input type="date" className="p-1 border rounded text-sm"
                  value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600 block">End Date</label>
                <input type="date" className="p-1 border rounded text-sm"
                  value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <button onClick={fetchSales} className="px-3 py-1 bg-gray-700 text-white rounded text-sm h-8">Apply</button>
              <button onClick={() => { setStartDate(''); setEndDate(''); fetchSales(); }} className="px-3 py-1 text-blue-600 text-sm h-8">Clear</button>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setEditSale(null);
            setShowCreate(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 h-10"
        >
          Create New Sale
        </button>
      </div>

      {/* SALES TABLE */}
      {!showCreate && (
        <div className="bg-white rounded-lg shadow p-4">
          {loading ? (
            <p className="text-sm text-gray-600">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Voucher</th>
                    <th className="border p-2">Customer</th>
                    <th className="border p-2">Total Silver</th>
                    <th className="border p-2">Total Amount</th>
                    <th className="border p-2">Bal Silver</th>
                    <th className="border p-2">Bal Amount</th>
                    <th className="border p-2">Status</th>
                    <th className="border p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(sale => (
                    <tr key={sale.id}>
                      <td className="border p-2">
                        {new Date(sale.saleDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="border p-2">
                        {sale.voucherNumber}
                      </td>
                      <td className="border p-2">
                        <button
                          className="text-blue-600 underline"
                          onClick={() =>
                            openLedger(sale.customer || sale.customerId)
                          }
                        >
                          {sale.customer?.name || 'N/A'}
                        </button>
                      </td>
                      <td className="border p-2 text-right">
                        {parseFloat(sale.totalSilverWeight || 0).toFixed(3)}
                      </td>
                      <td className="border p-2 text-right">
                        {parseFloat(sale.totalLaborCharges || 0).toFixed(2)}
                      </td>
                      <td className="border p-2 text-right">
                        {parseFloat(sale.balanceSilver || 0).toFixed(3)}
                      </td>
                      <td className="border p-2 text-right">
                        {parseFloat(sale.balanceLabor || 0).toFixed(2)}
                      </td>
                      <td className="border p-2 text-center">
                        {sale.status === 'paid' && (
                          <span className="px-2 py-1 text-[11px] rounded bg-green-100 text-green-700 font-semibold">
                            PAID
                          </span>
                        )}
                        {sale.status === 'partial' && (
                          <span className="px-2 py-1 text-[11px] rounded bg-yellow-100 text-yellow-700 font-semibold">
                            PARTIAL
                          </span>
                        )}
                        {sale.status === 'pending' && (
                          <span className="px-2 py-1 text-[11px] rounded bg-red-100 text-red-700 font-semibold">
                            PENDING
                          </span>
                        )}
                      </td>
                      <td className="border p-2">
                        <div className="flex flex-wrap gap-1">
                          <button
                            className="px-2 py-1 text-[11px] bg-blue-500 text-white rounded"
                            onClick={() => handleViewSale(sale.id)}
                          >
                            View
                          </button>
                          <button
                            className="px-2 py-1 text-[11px] bg-indigo-500 text-white rounded"
                            onClick={() => handleEditSale(sale.id)}
                          >
                            Edit
                          </button>
                          <button
                            className="px-2 py-1 text-[11px] bg-emerald-500 text-white rounded"
                            onClick={() => handleMakePayment(sale)}
                          >
                            Pay
                          </button>
                          <button
                            className="px-2 py-1 text-[11px] bg-red-600 text-white rounded"
                            onClick={() => handleDeleteSale(sale)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td
                        className="border p-2 text-center text-gray-500"
                        colSpan={9}
                      >
                        No sales found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SALE VIEW MODAL */}
      <AnimatePresence>
        {selectedSale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setSelectedSale(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  Sale Details - {selectedSale.voucherNumber}
                </h2>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 text-xs bg-gray-700 text-white rounded"
                    onClick={() => handleGeneratePdf(selectedSale)}
                  >
                    Print Bill
                  </button>
                  <button
                    className="px-3 py-1 text-xs bg-red-500 text-white rounded"
                    onClick={() => setSelectedSale(null)}
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* HEADER */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="border rounded p-3">
                  <p className="font-semibold">
                    {selectedSale.customer?.name}
                  </p>
                  {selectedSale.customer?.address && (
                    <p className="text-xs text-gray-700">
                      {selectedSale.customer.address}
                    </p>
                  )}
                  {selectedSale.customer?.phone && (
                    <p className="text-xs text-gray-600 mt-1">
                      Phone: {selectedSale.customer.phone}
                    </p>
                  )}
                </div>
                <div className="border rounded p-3 text-right">
                  <p className="text-sm">
                    Voucher: {selectedSale.voucherNumber}
                  </p>
                  <p className="text-sm">
                    Date:{' '}
                    {new Date(
                      selectedSale.saleDate
                    ).toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>

              {/* MAIN TABLE (Items + Totals + Previous Due + Payments + Returns + Closing) */}
              <div className="overflow-x-auto text-xs">
                <table className="w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-1">Desc</th>
                      <th className="border p-1">Stamp</th>
                      <th className="border p-1">Pcs</th>
                      <th className="border p-1">Gross</th>
                      <th className="border p-1">Stone</th>
                      <th className="border p-1">Net</th>
                      <th className="border p-1">Touch</th>
                      <th className="border p-1">Wastage</th>
                      <th className="border p-1">Silver (g)</th>
                      <th className="border p-1">Labor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border p-1">
                          {item.description}
                        </td>
                        <td className="border p-1">
                          {item.stamp || '-'}
                        </td>
                        <td className="border p-1 text-center">
                          {item.pieces}
                        </td>
                        <td className="border p-1 text-right">
                          {parseFloat(item.grossWeight || 0).toFixed(3)}
                        </td>
                        <td className="border p-1 text-right">
                          {parseFloat(item.stoneWeight || 0).toFixed(3)}
                        </td>
                        <td className="border p-1 text-right">
                          {parseFloat(item.netWeight || 0).toFixed(3)}
                        </td>
                        <td className="border p-1 text-right">
                          {parseFloat(item.touch || 0).toFixed(2)}
                        </td>
                        <td className="border p-1 text-right">
                          {parseFloat(item.wastage || 0).toFixed(3)}
                        </td>
                        <td className="border p-1 text-right">
                          {parseFloat(item.silverWeight || 0).toFixed(3)}
                        </td>
                        <td className="border p-1 text-right">
                          {parseFloat(item.laborCharges || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}

                    {/* TOTAL ROW */}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="border p-1 text-right" colSpan={3}>
                        TOTAL
                      </td>
                      <td className="border p-1 text-right">
                        {parseFloat(
                          selectedSale.items.reduce(
                            (s, i) => s + parseFloat(i.grossWeight || 0),
                            0
                          )
                        ).toFixed(3)}
                      </td>
                      <td className="border p-1 text-right">
                        {parseFloat(
                          selectedSale.items.reduce(
                            (s, i) => s + parseFloat(i.stoneWeight || 0),
                            0
                          )
                        ).toFixed(3)}
                      </td>
                      <td className="border p-1 text-right">
                        {parseFloat(
                          selectedSale.items.reduce(
                            (s, i) => s + parseFloat(i.netWeight || 0),
                            0
                          )
                        ).toFixed(3)}
                      </td>
                      <td className="border p-1" />
                      <td className="border p-1" />
                      <td className="border p-1 text-right">
                        {parseFloat(selectedSale.totalSilverWeight || 0).toFixed(
                          3
                        )}
                      </td>
                      <td className="border p-1 text-right">
                        {parseFloat(
                          selectedSale.totalLaborCharges || 0
                        ).toFixed(2)}
                      </td>
                    </tr>

                    {/* PREVIOUS DUE SECTION */}
                    <tr className="bg-yellow-50">
                      <td className="border p-1 font-semibold" colSpan={7}>
                        Previous Due
                      </td>
                      <td className="border p-1 text-right font-medium">
                        Silver
                      </td>
                      <td className="border p-1 text-right">
                        {parseFloat(
                          selectedSale.previousBalanceSilver || 0
                        ).toFixed(3)}
                      </td>
                      <td className="border p-1 text-right">
                        {parseFloat(
                          selectedSale.previousBalanceLabor || 0
                        ).toFixed(2)}
                      </td>
                    </tr>

                    {/* PAYMENTS / RETURNS */}
                    {selectedSale.transactions
                      .filter(t => t.type !== 'sale')
                      .map((txn, idx) => (
                        <tr key={`txn-${idx}`} className="bg-green-50">
                          <td className="border p-1" colSpan={7}>
                            {txn.type === 'silver_payment' &&
                              'Silver Payment'}
                            {txn.type === 'cash_for_silver' &&
                              'Cash for Silver'}
                            {txn.type === 'labor_payment' &&
                              'Labor Payment'}
                            {txn.type === 'return_silver' && 'Return Silver'}
                            {txn.notes ? ` - ${txn.notes}` : ''}
                          </td>
                          <td className="border p-1 text-right font-medium">
                            Silver
                          </td>
                          <td className="border p-1 text-right">
                            {parseFloat(txn.silverWeight || 0).toFixed(3)}
                          </td>
                          <td className="border p-1 text-right">
                            {parseFloat(txn.laborAmount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}

                    {/* CLOSING BALANCE */}
                    <tr className="bg-blue-50">
                      <td className="border p-1 font-semibold" colSpan={7}>
                        Closing Balance
                      </td>
                      <td className="border p-1 text-right font-medium">
                        Silver
                      </td>
                      <td className="border p-1 text-right font-bold">
                        {parseFloat(
                          selectedSale.balanceSilver || 0
                        ).toFixed(3)}
                      </td>
                      <td className="border p-1 text-right font-bold">
                        {parseFloat(
                          selectedSale.balanceLabor || 0
                        ).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* RETURN SILVER SIMPLE FORM */}
              <div className="mt-4 border-t pt-3">
                <h3 className="text-sm font-semibold mb-2">
                  Return Silver
                </h3>
                <ReturnSilverForm
                  sale={selectedSale}
                  onReturn={(wt, notes) =>
                    handleReturnSilver(selectedSale.id, wt, notes)
                  }
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT SALE */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CreateRegularSale
              editSale={editSale}
              onSaleCreated={() => {
                setShowCreate(false);
                setEditSale(null);
                fetchSales();
              }}
              onCancelEdit={() => {
                setShowCreate(false);
                setEditSale(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* PAYMENT MODAL */}
      <PaymentModal
        open={showPaymentModal}
        sale={paymentSale}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentSale(null);
          fetchSales();
        }}
      />

      {/* LEDGER MODAL */}
      <AnimatePresence>
        {showLedger && ledgerCustomer && ledgerData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowLedger(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">
                  Ledger - {ledgerCustomer.name}
                </h2>
                <button
                  className="px-3 py-1 text-xs bg-red-500 text-white rounded"
                  onClick={() => setShowLedger(false)}
                >
                  Close
                </button>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Phone: {ledgerCustomer.phone || 'N/A'}
              </p>

              <div className="overflow-x-auto text-xs">
                <table className="w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-1">Date</th>
                      <th className="border p-1">Type</th>
                      <th className="border p-1">Voucher</th>
                      <th className="border p-1">Silver (±)</th>
                      <th className="border p-1">Labor (±)</th>
                      <th className="border p-1">Cash</th>
                      <th className="border p-1">Bal Silver</th>
                      <th className="border p-1">Bal Labor</th>
                      <th className="border p-1">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.transactions.map((tx, idx) => (
                      <tr key={idx}>
                        <td className="border p-1">
                          {new Date(
                            tx.transactionDate
                          ).toLocaleDateString('en-GB')}
                        </td>
                        <td className="border p-1">
                          {tx.type}
                        </td>
                        <td className="border p-1">
                          {tx.sale?.voucherNumber || '-'}
                        </td>
                        <td className="border p-1 text-right">
                          {parseFloat(tx.silverWeight || 0).toFixed(3)}
                        </td>
                        <td className="border p-1 text-right">
                          {parseFloat(tx.laborAmount || 0).toFixed(2)}
                        </td>
                        <td className="border p-1 text-right">
                          {parseFloat(tx.cashAmount || 0).toFixed(2)}
                        </td>
                        <td className="border p-1 text-right">
                          {parseFloat(
                            tx.balanceSilverAfter || 0
                          ).toFixed(3)}
                        </td>
                        <td className="border p-1 text-right">
                          {parseFloat(
                            tx.balanceLaborAfter || 0
                          ).toFixed(2)}
                        </td>
                        <td className="border p-1">
                          {tx.notes || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReturnSilverForm({ sale, onReturn }) {
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    const w = parseFloat(weight || 0);
    if (!w || w <= 0) {
      alert('Enter valid net weight');
      return;
    }
    onReturn(w, notes);
    setWeight('');
    setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end text-xs">
      <div>
        <label className="block mb-1">Net Weight (g)</label>
        <input
          type="number"
          step="0.001"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          className="border rounded px-2 py-1"
          placeholder="0.000"
        />
      </div>
      <div className="flex-1 min-w-[150px]">
        <label className="block mb-1">Notes</label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="border rounded px-2 py-1 w-full"
          placeholder="Return details"
        />
      </div>
      <button
        type="submit"
        className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
      >
        Save Return
      </button>
    </form>
  );
}
