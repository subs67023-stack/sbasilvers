import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';

export default function SilverTaken({ onSilverTaken }) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [formData, setFormData] = useState({
    regularCustomerId: '',
    fromNo: '',
    weight: '',
    touch: '',
    notes: ''
  });

  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchCustomers();
    fetchHistory();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/regular-billing/customers?limit=100');
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get('/regular-billing/silver-taken');
      if (response.data.success) {
        setHistory(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === parseInt(customerId));
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, regularCustomerId: customerId }));
  };

  const calculateFine = () => {
    const weight = parseFloat(formData.weight || 0);
    const touch = parseFloat(formData.touch || 0);
    return ((weight * touch) / 100).toFixed(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.regularCustomerId) {
      alert('Please select a customer');
      return;
    }

    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      alert('Please enter valid weight');
      return;
    }

    if (!formData.touch || parseFloat(formData.touch) <= 0) {
      alert('Please enter valid touch');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        regularCustomerId: formData.regularCustomerId,
        fromNo: formData.fromNo,
        weight: parseFloat(formData.weight),
        touch: parseFloat(formData.touch),
        fine: parseFloat(calculateFine()),
        notes: formData.notes
      };

      const response = await api.post('/regular-billing/silver-taken', payload);

      if (response.data.success) {
        alert('Silver taken recorded successfully!');
        
        // Reset form
        setFormData({
          regularCustomerId: '',
          fromNo: '',
          weight: '',
          touch: '',
          notes: ''
        });
        setSelectedCustomer(null);
        
        // Refresh data
        fetchCustomers();
        fetchHistory();
        if (onSilverTaken) onSilverTaken();
      }
    } catch (error) {
      console.error('Error recording silver taken:', error);
      alert('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fine = calculateFine();

  return (
    <div className="space-y-6">
      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg p-6"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6">💎 Record Silver Taken</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Customer Name *</label>
            <select
              value={formData.regularCustomerId}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            >
              <option value="">-- Select Customer --</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.phone ? `(${customer.phone})` : ''} - Balance: {parseFloat(customer.balanceSilver || 0).toFixed(3)}g
                </option>
              ))}
            </select>
          </div>

          {/* Customer Info */}
          {selectedCustomer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200"
            >
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-semibold">{selectedCustomer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Silver Balance</p>
                  <p className="font-semibold text-orange-600">
                    {parseFloat(selectedCustomer.balanceSilver || 0).toFixed(3)}g
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">{selectedCustomer.phone || '-'}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">From No (Reference)</label>
              <input
                type="text"
                value={formData.fromNo}
                onChange={(e) => setFormData(prev => ({ ...prev, fromNo: e.target.value }))}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="REG001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Weight (grams) *</label>
              <input
                type="number"
                step="0.001"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="0.000"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Touch (%) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.touch}
                onChange={(e) => setFormData(prev => ({ ...prev, touch: e.target.value }))}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="92.50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Fine (calculated)</label>
              <div className="w-full p-3 bg-gray-100 border-2 border-gray-300 rounded-lg text-lg font-bold text-orange-600">
                {fine}g
              </div>
            </div>
          </div>

          {/* Calculation Display */}
          {formData.weight && formData.touch && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-100 p-4 rounded-lg border-2 border-orange-300"
            >
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Calculation:</span> Fine = Weight × Touch ÷ 100
              </p>
              <p className="text-lg font-bold text-orange-700 mt-2">
                {fine}g = {formData.weight}g × {formData.touch}% ÷ 100
              </p>
              {selectedCustomer && (
                <p className="text-sm text-gray-600 mt-2">
                  New Balance: {parseFloat(selectedCustomer.balanceSilver || 0).toFixed(3)}g - {fine}g = 
                  <span className="font-bold text-orange-600 ml-1">
                    {(parseFloat(selectedCustomer.balanceSilver || 0) - parseFloat(fine)).toFixed(3)}g
                  </span>
                </p>
              )}
            </motion.div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              rows="3"
              placeholder="Additional notes..."
            />
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? '⏳ Processing...' : '✅ Record Silver Taken'}
          </motion.button>
        </form>
      </motion.div>

      {/* History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-lg p-6"
      >
        <h3 className="text-xl font-bold text-gray-800 mb-4">📜 Silver Taken History</h3>

        {history.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No records yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">From No</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Weight</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Touch</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Fine</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((record, index) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-orange-50"
                  >
                    <td className="px-4 py-3 text-sm">
                      {new Date(record.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{record.customer?.name}</td>
                    <td className="px-4 py-3 text-sm">{record.fromNo || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">{parseFloat(record.weight).toFixed(3)}g</td>
                    <td className="px-4 py-3 text-sm text-right">{parseFloat(record.touch).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-orange-600">
                      {parseFloat(record.fine).toFixed(3)}g
                    </td>
                    <td className="px-4 py-3 text-sm">{record.notes || '-'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
