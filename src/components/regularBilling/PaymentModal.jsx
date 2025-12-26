import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

export default function PaymentModal({ open, sale, onClose }) {
  const [tab, setTab] = useState('silver');
  const [loading, setLoading] = useState(false);

  // multiple silver rows instead of single silverForm
  const [silverRows, setSilverRows] = useState([
    { name: '', fromNo: '', weight: '', touch: '', notes: '' }
  ]);

  const [cashForm, setCashForm] = useState({
    rate: '',
    weight: '',
    notes: ''
  });

  const [laborForm, setLaborForm] = useState({
    amount: '',
    notes: ''
  });

  if (!open || !sale) return null;

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

  const handleSilverSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      for (const row of silverRows) {
        const fine = parseFloat(calcRowFine(row));
        if (!fine || fine <= 0) continue; // skip empty rows

        const res = await api.post(
          `/regular-billing/sales/${sale.id}/silver-payment`,
          {
            silverWeight: fine,
            name: row.name,
            fromNo: row.fromNo,
            weight: parseFloat(row.weight || 0),
            touch: parseFloat(row.touch || 0),
            notes: row.notes
          }
        );
        if (!res.data.success) {
          throw new Error(res.data.message || 'Failed to add silver payment');
        }
      }
      alert('Silver payment(s) added');
      onClose();
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
        `/regular-billing/sales/${sale.id}/cash-for-silver`,
        {
          silverRate: parseFloat(cashForm.rate || 0),
          silverWeight: parseFloat(cashForm.weight || 0),
          notes: cashForm.notes
        }
      );
      if (res.data.success) {
        alert('Cash for silver added');
        onClose();
      }
    } catch (e) {
      console.error(e);
      alert('Error: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleLaborSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(
        `/regular-billing/sales/${sale.id}/labor-payment`,
        {
          laborAmount: parseFloat(laborForm.amount || 0),
          notes: laborForm.notes
        }
      );
      if (res.data.success) {
        alert('Labor payment added');
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
            className="bg-white rounded-lg p-6 w-full max-w-lg"
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

            <div className="mb-4 text-xs bg-gray-50 p-3 rounded border">
              <p>
                Customer:{' '}
                <span className="font-semibold">
                  {sale.customer?.name}
                </span>
              </p>
              <p>
                Balance Silver:{' '}
                <span className="font-semibold text-orange-600">
                  {parseFloat(sale.balanceSilver || 0).toFixed(3)} g
                </span>
              </p>
              <p>
                Balance Labor:{' '}
                <span className="font-semibold text-purple-600">
                  {parseFloat(sale.balanceLabor || 0).toFixed(2)}
                </span>
              </p>
            </div>

            <div className="flex gap-2 mb-4 text-xs">
              <button
                className={`flex-1 py-2 rounded ${
                  tab === 'silver'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100'
                }`}
                onClick={() => setTab('silver')}
              >
                Silver
              </button>
              <button
                className={`flex-1 py-2 rounded ${
                  tab === 'cash'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100'
                }`}
                onClick={() => setTab('cash')}
              >
                Cash for Silver
              </button>
              <button
                className={`flex-1 py-2 rounded ${
                  tab === 'labor'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100'
                }`}
                onClick={() => setTab('labor')}
              >
                Labor
              </button>
            </div>

            {tab === 'silver' && (
              <form onSubmit={handleSilverSubmit} className="space-y-3 text-xs">
                {silverRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="mb-2 border rounded p-2 bg-orange-50"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-[11px]">
                        Silver #{idx + 1}
                      </span>
                      {silverRows.length > 1 && (
                        <button
                          type="button"
                          className="text-red-500 text-[11px]"
                          onClick={() => removeSilverRow(idx)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1">Name</label>
                        <input
                          type="text"
                          value={row.name}
                          onChange={e =>
                            updateSilverRow(idx, 'name', e.target.value)
                          }
                          className="w-full border rounded px-2 py-1"
                          placeholder="Name"
                        />
                      </div>
                      <div>
                        <label className="block mb-1">Form No</label>
                        <input
                          type="text"
                          value={row.fromNo}
                          onChange={e =>
                            updateSilverRow(idx, 'fromNo', e.target.value)
                          }
                          className="w-full border rounded px-2 py-1"
                          placeholder="REG001"
                        />
                      </div>
                      <div>
                        <label className="block mb-1">Weight (g)</label>
                        <input
                          type="number"
                          step="0.001"
                          value={row.weight}
                          onChange={e =>
                            updateSilverRow(idx, 'weight', e.target.value)
                          }
                          className="w-full border rounded px-2 py-1"
                          placeholder="0.000"
                        />
                      </div>
                      <div>
                        <label className="block mb-1">Tunch %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={row.touch}
                          onChange={e =>
                            updateSilverRow(idx, 'touch', e.target.value)
                          }
                          className="w-full border rounded px-2 py-1"
                          placeholder="92.50"
                        />
                      </div>
                    </div>
                    <div className="mt-1">
                      <label className="block mb-1">Fine (auto)</label>
                      <div className="border rounded px-2 py-1 bg-gray-100 font-semibold">
                        {calcRowFine(row)} g
                      </div>
                    </div>
                    <div className="mt-1">
                      <label className="block mb-1">Notes</label>
                      <textarea
                        value={row.notes}
                        onChange={e =>
                          updateSilverRow(idx, 'notes', e.target.value)
                        }
                        className="w-full border rounded px-2 py-1"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addSilverRow}
                  className="w-full py-1 border border-dashed rounded text-xs mb-1"
                >
                  + Add Silver Item
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-orange-600 text-white rounded text-xs mt-2 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Save Silver Payment(s)'}
                </button>
              </form>
            )}

            {tab === 'cash' && (
              <form onSubmit={handleCashSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1">Silver Rate (₹/g)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cashForm.rate}
                      onChange={e =>
                        setCashForm(prev => ({
                          ...prev,
                          rate: e.target.value
                        }))
                      }
                      className="w-full border rounded px-2 py-1"
                      placeholder="100.00"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Silver Weight (g)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={cashForm.weight}
                      onChange={e =>
                        setCashForm(prev => ({
                          ...prev,
                          weight: e.target.value
                        }))
                      }
                      className="w-full border rounded px-2 py-1"
                      placeholder="0.000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1">Notes</label>
                  <textarea
                    value={cashForm.notes}
                    onChange={e =>
                      setCashForm(prev => ({
                        ...prev,
                        notes: e.target.value
                      }))
                    }
                    className="w-full border rounded px-2 py-1"
                    rows={2}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-green-600 text-white rounded text-xs mt-2 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Save Cash Payment'}
                </button>
              </form>
            )}

            {tab === 'labor' && (
              <form onSubmit={handleLaborSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block mb-1">Labor Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={laborForm.amount}
                    onChange={e =>
                      setLaborForm(prev => ({
                        ...prev,
                        amount: e.target.value
                      }))
                    }
                    className="w-full border rounded px-2 py-1"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block mb-1">Notes</label>
                  <textarea
                    value={laborForm.notes}
                    onChange={e =>
                      setLaborForm(prev => ({
                        ...prev,
                        notes: e.target.value
                      }))
                    }
                    className="w-full border rounded px-2 py-1"
                    rows={2}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-purple-600 text-white rounded text-xs mt-2 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Save Labor Payment'}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
