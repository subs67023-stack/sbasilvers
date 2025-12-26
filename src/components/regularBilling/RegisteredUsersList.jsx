import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import CustomerLedgerModal from './CustomerLedgerModal';

export default function RegisteredUsersList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCustomers();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/regular-billing/customers?search=${search}&limit=100`);
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await api.get(`/regular-billing/export/customers?search=${search}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `customers-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      alert('Customers exported successfully!');
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error exporting to Excel');
    }
  };

  const getTotalBalanceAmount = () => {
    return customers.reduce((sum, customer) => sum + parseFloat(customer.balanceLabor || 0), 0).toFixed(2);
  };

  const getTotalBalanceSilver = () => {
    return customers.reduce((sum, customer) => sum + parseFloat(customer.balanceSilver || 0), 0).toFixed(3);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-4 gap-4"
      >
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
          <p className="text-sm opacity-90">Total Customers</p>
          <p className="text-3xl font-bold">{customers.length}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-lg shadow-lg">
          <p className="text-sm opacity-90">Total Outstanding (₹)</p>
          <p className="text-3xl font-bold">₹{parseFloat(getTotalBalanceAmount()).toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
          <p className="text-sm opacity-90">Total Outstanding (Silver)</p>
          <p className="text-3xl font-bold">{parseFloat(getTotalBalanceSilver()).toLocaleString()} g</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
          <p className="text-sm opacity-90">With Balance</p>
          <p className="text-3xl font-bold">
            {customers.filter(c => parseFloat(c.balanceLabor) > 0 || parseFloat(c.balanceSilver) > 0).length}
          </p>
        </div>
      </motion.div>

      {/* Search & Export */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-4 rounded-lg shadow"
      >
        <div className="flex gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportExcel}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <span>📊</span>
            Export to Excel
          </motion.button>
        </div>
      </motion.div>

      {/* Customers Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow overflow-hidden"
      >
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No customers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance Labor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance Silver</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Side</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer, index) => {
                  const balanceLabor = parseFloat(customer.balanceLabor || 0);
                  const balanceSilver = parseFloat(customer.balanceSilver || 0);
                  const hasDue = balanceLabor > 0 || balanceSilver > 0;
                  const hasCredit = balanceLabor < 0 || balanceSilver < 0;

                  return (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {customer.name}
                      </td>
                      <td className="px-4 py-3 text-sm">{customer.phone || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{customer.address || 'N/A'}</td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${balanceLabor > 0 ? 'text-red-600' : balanceLabor < 0 ? 'text-blue-600' : 'text-green-600'
                        }`}>
                        ₹{Math.abs(balanceLabor).toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${balanceSilver > 0 ? 'text-red-600' : balanceSilver < 0 ? 'text-blue-600' : 'text-green-600'
                        }`}>
                        {Math.abs(balanceSilver).toFixed(3)} g
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasDue && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                            They Owe
                          </span>
                        )}
                        {hasCredit && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            You Owe
                          </span>
                        )}
                        {!hasDue && !hasCredit && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                            Clear
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedCustomerForLedger(customer)}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm font-semibold transition"
                        >
                          📖 Details
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* LEDGER MODAL */}
      {selectedCustomerForLedger && (
        <CustomerLedgerModal
          customer={selectedCustomerForLedger}
          onClose={() => setSelectedCustomerForLedger(null)}
        />
      )}
    </div>
  );
}
