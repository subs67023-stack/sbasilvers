import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import * as XLSX from 'xlsx';

const BakiTransactionSection = () => {
  const [employees, setEmployees] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    type: 'given',
    amount: '',
    description: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchAllTransactions();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAllTransactions = async () => {
    setLoading(true);
    try {
      // Fetch all employees with their transactions
      const employeeResponse = await api.get('/employees');
      const allEmployees = employeeResponse.data.data || [];

      let allTransactions = [];
      for (const emp of allEmployees) {
        try {
          const txnResponse = await api.get(`/baki-transactions/employee/${emp.id}`);
          const empTransactions = (txnResponse.data.data || []).map(txn => ({
            ...txn,
            employeeName: emp.name
          }));
          allTransactions = [...allTransactions, ...empTransactions];
        } catch (error) {
          console.error(`Error fetching transactions for employee ${emp.id}:`, error);
        }
      }

      // Sort by date descending
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.amount) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await api.post('/baki-transactions', {
        employeeId: parseInt(formData.employeeId),
        date: formData.date,
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description
      });

      alert(`Baki ${formData.type === 'given' ? 'added' : 'returned'} successfully!`);
      setFormData({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        type: 'given',
        amount: '',
        description: ''
      });
      setShowForm(false);
      fetchAllTransactions();
      fetchEmployees(); // Refresh to update baki amounts
    } catch (error) {
      console.error('Error creating baki transaction:', error);
      alert('Failed to create baki transaction');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await api.delete(`/baki-transactions/${id}`);
      alert('Transaction deleted successfully!');
      fetchAllTransactions();
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredTransactions.map((txn, index) => ({
      'No': index + 1,
      'Date': new Date(txn.date).toLocaleDateString(),
      'Employee': txn.employeeName || 'Unknown',
      'Type': txn.type === 'given' ? 'Baki Given' : 'Baki Returned',
      'Amount': `₹${parseFloat(txn.amount).toFixed(2)}`,
      'Description': txn.description || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Baki Transactions');
    XLSX.writeFile(workbook, `Baki_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredTransactions = selectedEmployee
    ? transactions.filter(txn => txn.employeeId === parseInt(selectedEmployee))
    : transactions;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Baki Transactions</h3>
        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            📊 Export
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            {showForm ? '✕ Cancel' : '+ Add Baki Transaction'}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">📝 What is Baki Transaction?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Baki Given:</strong> When employee takes advance money (increases their debt)</li>
          <li>• <strong>Baki Returned:</strong> When employee returns money (reduces their debt)</li>
          <li>• Use this when employees borrow money mid-period, before salary calculation</li>
        </ul>
      </div>

      {/* Add Baki Transaction Form */}
      {showForm && (
        <div className="mb-8 bg-gray-50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Add Baki Transaction</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Employee *</label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.department} (Current Baki: ₹{parseFloat(emp.bakiAmount).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Transaction Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="given">Baki Uchal (Employee took money)</option>
                <option value="returned">Baki Jama (Employee returned money)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="₹"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                rows="2"
                placeholder="Add notes... e.g. 'Emergency medical expense' or 'Festival advance'"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Add Transaction
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter by Employee */}
      <div className="mb-4 flex gap-4 items-center">
        <label className="font-medium">Filter by Employee:</label>
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Employees</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
        {selectedEmployee && (
          <button
            onClick={() => setSelectedEmployee('')}
            className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Transaction List Table */}
      {loading ? (
        <p className="text-center py-8">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3 text-left">Date</th>
                <th className="border p-3 text-left">Employee</th>
                <th className="border p-3 text-center">Type</th>
                <th className="border p-3 text-right">Amount</th>
                <th className="border p-3 text-left">Description</th>
                <th className="border p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="border p-4 text-center text-gray-500">
                    No baki transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="border p-3">{new Date(txn.date).toLocaleDateString()}</td>
                    <td className="border p-3 font-medium">{txn.employeeName || 'Unknown'}</td>
                    <td className="border p-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          txn.type === 'given'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {txn.type === 'given' ? '📤 Baki Uchal' : '📥 Baki Jama'}
                      </span>
                    </td>
                    <td className={`border p-3 text-right font-semibold ${
                      txn.type === 'given' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {txn.type === 'given' ? '+' : '-'}₹{parseFloat(txn.amount).toFixed(2)}
                    </td>
                    <td className="border p-3 text-sm text-gray-600">
                      {txn.description || '-'}
                    </td>
                    <td className="border p-3 text-center">
                      <button
                        onClick={() => handleDelete(txn.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BakiTransactionSection;
