import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import * as XLSX from 'xlsx';

const SalarySection = () => {
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    daysWorked: '',
    pagar: '',
    totalPagar: '0',
    advance: '0',
    finalPagar: '0',
    bakiReturn: '0',
    givenPagar: '0',
    description: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchSalaries();
  }, []);

  // Auto-calculate Total Pagar
  useEffect(() => {
    const days = parseFloat(formData.daysWorked) || 0;
    const rate = parseFloat(formData.pagar) || 0;
    const total = days * rate;
    
    setFormData(prev => ({
      ...prev,
      totalPagar: total.toFixed(2)
    }));
  }, [formData.daysWorked, formData.pagar]);

  // Auto-calculate Final Pagar
  useEffect(() => {
    const total = parseFloat(formData.totalPagar) || 0;
    const advance = parseFloat(formData.advance) || 0;
    const final = total - advance;
    
    setFormData(prev => ({
      ...prev,
      finalPagar: final.toFixed(2)
    }));
  }, [formData.totalPagar, formData.advance]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const response = await api.get('/salaries');
      setSalaries(response.data.data || []);
    } catch (error) {
      console.error('Error fetching salaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.daysWorked || !formData.pagar) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await api.post('/salaries', {
        employeeId: parseInt(formData.employeeId),
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        daysWorked: parseFloat(formData.daysWorked),
        pagar: parseFloat(formData.pagar),
        totalPagar: parseFloat(formData.totalPagar),
        advance: parseFloat(formData.advance),
        finalPagar: parseFloat(formData.finalPagar),
        bakiReturn: parseFloat(formData.bakiReturn),
        givenPagar: parseFloat(formData.givenPagar),
        description: formData.description
      });

      alert('Salary record created successfully!');
      setFormData({
        employeeId: '',
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        daysWorked: '',
        pagar: '',
        totalPagar: '0',
        advance: '0',
        finalPagar: '0',
        bakiReturn: '0',
        givenPagar: '0',
        description: ''
      });
      setShowForm(false);
      fetchSalaries();
      fetchEmployees(); // Refresh to update baki amounts
    } catch (error) {
      console.error('Error creating salary:', error);
      alert('Failed to create salary record');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this salary record?')) return;

    try {
      await api.delete(`/salaries/${id}`);
      alert('Salary record deleted successfully!');
      fetchSalaries();
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting salary:', error);
      alert('Failed to delete salary record');
    }
  };

  const exportToExcel = () => {
    const dataToExport = salaries.map((salary, index) => ({
      'No': index + 1,
      'Employee': salary.employeeName || 'Unknown',
      'From Date': new Date(salary.fromDate).toLocaleDateString(),
      'To Date': new Date(salary.toDate).toLocaleDateString(),
      'Days Worked': salary.daysWorked,
      'Pagar': `₹${parseFloat(salary.pagar).toFixed(2)}`,
      'Total Pagar': `₹${parseFloat(salary.totalPagar).toFixed(2)}`,
      'Advance': `₹${parseFloat(salary.advance).toFixed(2)}`,
      'Final Pagar': `₹${parseFloat(salary.finalPagar).toFixed(2)}`,
      'Baki Return': `₹${parseFloat(salary.bakiReturn).toFixed(2)}`,
      'Given Pagar': `₹${parseFloat(salary.givenPagar).toFixed(2)}`,
      'Description': salary.description || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salaries');
    XLSX.writeFile(workbook, `Salaries_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Salary Management</h3>
        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            📊 Export
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {showForm ? '✕ Cancel' : '+ New Salary'}
          </button>
        </div>
      </div>

      {/* Create Salary Form */}
      {showForm && (
        <div className="mb-8 bg-gray-50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Create Salary Record</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Employee *</label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.department} (Baki: ₹{parseFloat(emp.bakiAmount).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">From Date *</label>
              <input
                type="date"
                value={formData.fromDate}
                onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">To Date *</label>
              <input
                type="date"
                value={formData.toDate}
                onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Days Worked * (Half days: 0.5, 1.5, etc.)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.daysWorked}
                onChange={(e) => setFormData({ ...formData, daysWorked: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="e.g. 5.5 for 5 and half days"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Pagar (Daily Rate) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.pagar}
                onChange={(e) => setFormData({ ...formData, pagar: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="₹"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Total Pagar (Auto)</label>
              <input
                type="number"
                step="0.01"
                value={formData.totalPagar}
                readOnly
                className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Advance</label>
              <input
                type="number"
                step="0.01"
                value={formData.advance}
                onChange={(e) => setFormData({ ...formData, advance: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="₹"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Final Pagar (Auto)</label>
              <input
                type="number"
                step="0.01"
                value={formData.finalPagar}
                readOnly
                className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Baki Return</label>
              <input
                type="number"
                step="0.01"
                value={formData.bakiReturn}
                onChange={(e) => setFormData({ ...formData, bakiReturn: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="₹"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Given Pagar *</label>
              <input
                type="number"
                step="0.01"
                value={formData.givenPagar}
                onChange={(e) => setFormData({ ...formData, givenPagar: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="₹"
                required
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                rows="2"
                placeholder="Add notes about this salary... e.g. 'Bonus for extra work' or 'Deduction for leave'"
              />
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Create Salary Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Salary List Table */}
      {loading ? (
        <p className="text-center py-8">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3 text-left">Employee</th>
                <th className="border p-3 text-left">Period</th>
                <th className="border p-3 text-center">Days</th>
                <th className="border p-3 text-right">Pagar</th>
                <th className="border p-3 text-right">Total Pagar</th>
                <th className="border p-3 text-right">Advance</th>
                <th className="border p-3 text-right">Final Pagar</th>
                <th className="border p-3 text-right">Baki Return</th>
                <th className="border p-3 text-right">Given Pagar</th>
                <th className="border p-3 text-left">Description</th>
                <th className="border p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {salaries.length === 0 ? (
                <tr>
                  <td colSpan="11" className="border p-4 text-center text-gray-500">
                    No salary records found
                  </td>
                </tr>
              ) : (
                salaries.map((salary) => (
                  <tr key={salary.id} className="hover:bg-gray-50">
                    <td className="border p-3 font-medium">{salary.employeeName || 'Unknown'}</td>
                    <td className="border p-3">
                      {new Date(salary.fromDate).toLocaleDateString()} - {new Date(salary.toDate).toLocaleDateString()}
                    </td>
                    <td className="border p-3 text-center">{parseFloat(salary.daysWorked).toFixed(1)}</td>
                    <td className="border p-3 text-right">₹{parseFloat(salary.pagar).toFixed(2)}</td>
                    <td className="border p-3 text-right">₹{parseFloat(salary.totalPagar).toFixed(2)}</td>
                    <td className="border p-3 text-right">₹{parseFloat(salary.advance).toFixed(2)}</td>
                    <td className="border p-3 text-right">₹{parseFloat(salary.finalPagar).toFixed(2)}</td>
                    <td className="border p-3 text-right text-red-600">₹{parseFloat(salary.bakiReturn).toFixed(2)}</td>
                    <td className="border p-3 text-right font-semibold text-green-600">
                      ₹{parseFloat(salary.givenPagar).toFixed(2)}
                    </td>
                    <td className="border p-3 text-sm text-gray-600">
                      {salary.description || '-'}
                    </td>
                    <td className="border p-3 text-center">
                      <button
                        onClick={() => handleDelete(salary.id)}
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

export default SalarySection;
