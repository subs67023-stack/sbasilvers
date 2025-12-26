import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import * as XLSX from 'xlsx';

const EmployeeList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    dateOfJoin: new Date().toISOString().split('T')[0],
    department: '',
    phoneNumber: '',
    address: '',
    bakiAmount: '0'
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get('/employees');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      alert('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.dateOfJoin || !formData.department) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await api.post('/employees', formData);
      alert('Employee created successfully!');
      setFormData({
        name: '',
        dateOfJoin: new Date().toISOString().split('T')[0],
        department: '',
        phoneNumber: '',
        address: '',
        bakiAmount: '0'
      });
      setShowForm(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Failed to create employee');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    
    try {
      await api.delete(`/employees/${id}`);
      alert('Employee deleted successfully!');
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee');
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredEmployees.map((emp, index) => ({
      'No': index + 1,
      'Name': emp.name,
      'Date of Join': new Date(emp.dateOfJoin).toLocaleDateString(),
      'Department': emp.department,
      'Phone': emp.phoneNumber || '-',
      'Baki Amount': `₹${parseFloat(emp.bakiAmount).toFixed(2)}`
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    XLSX.writeFile(workbook, `Employees_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Employee List</h3>
        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            📊 Export
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showForm ? '✕ Cancel' : '+ New Employee'}
          </button>
        </div>
      </div>

      {/* Create Employee Form */}
      {showForm && (
        <div className="mb-8 bg-gray-50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Create New Employee</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date of Join *</label>
              <input
                type="date"
                value={formData.dateOfJoin}
                onChange={(e) => setFormData({ ...formData, dateOfJoin: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Department *</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Production, Polishing"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Initial Baki Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.bakiAmount}
                onChange={(e) => setFormData({ ...formData, bakiAmount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Optional"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Employee
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Employee Table */}
      {loading ? (
        <p className="text-center py-8">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3 text-left">No</th>
                <th className="border p-3 text-left">Name</th>
                <th className="border p-3 text-left">Date of Join</th>
                <th className="border p-3 text-right">Baki Amount</th>
                <th className="border p-3 text-left">Department</th>
                <th className="border p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="border p-4 text-center text-gray-500">
                    No employees found
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee, index) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="border p-3">{index + 1}</td>
                    <td className="border p-3 font-medium">{employee.name}</td>
                    <td className="border p-3">{new Date(employee.dateOfJoin).toLocaleDateString()}</td>
                    <td className="border p-3 text-right font-semibold">
                      ₹{parseFloat(employee.bakiAmount).toFixed(2)}
                    </td>
                    <td className="border p-3">{employee.department}</td>
                    <td className="border p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => navigate(`/regular/employee-ledger/${employee.id}`)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          📋 Details
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          🗑️
                        </button>
                      </div>
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

export default EmployeeList;
