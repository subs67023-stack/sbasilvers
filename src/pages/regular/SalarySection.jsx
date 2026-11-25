import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '../../utils/dateUtils';

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
    addToBaki: false,
    finalPagar: '0',
    bakiReturn: '0',
    givenPagar: '0',
    description: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchSalaries();
  }, []);

  // Auto-calculate Total Pagar = daysWorked * pagar
  useEffect(() => {
    const days = parseFloat(formData.daysWorked) || 0;
    const rate = parseFloat(formData.pagar) || 0;
    const total = days * rate;
    
    setFormData(prev => ({
      ...prev,
      totalPagar: total.toFixed(2)
    }));
  }, [formData.daysWorked, formData.pagar]);

  // Auto-calculate Final Pagar and Given Pagar based on addToBaki toggle
  useEffect(() => {
    const total = parseFloat(formData.totalPagar) || 0;
    const advance = parseFloat(formData.advance) || 0;
    const bakiReturn = parseFloat(formData.bakiReturn) || 0;
    
    let final = total;
    let given = total;

    if (formData.addToBaki) {
      // Advance is added into Baki debt: employee gets FULL pagar (minus baki return if any)
      final = total;
      given = Math.max(0, total - bakiReturn);
    } else {
      // Advance is deducted from this salary payment
      final = Math.max(0, total - advance);
      given = Math.max(0, total - advance - bakiReturn);
    }
    
    setFormData(prev => ({
      ...prev,
      finalPagar: final.toFixed(2),
      givenPagar: given.toFixed(2)
    }));
  }, [formData.totalPagar, formData.advance, formData.addToBaki, formData.bakiReturn]);

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
        advance: parseFloat(formData.advance) || 0,
        addToBaki: Boolean(formData.addToBaki),
        finalPagar: parseFloat(formData.finalPagar),
        bakiReturn: parseFloat(formData.bakiReturn) || 0,
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
        addToBaki: false,
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
      alert('Failed to create salary record: ' + (error.response?.data?.message || error.message));
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

  // Export to PDF with compact raised header and DD/MM/YYYY formatting
  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 8; // Compact header placed high up

    // Header Title
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Employee Salary Report', 14, yPosition);

    // Subtitle / Date
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`Generated on: ${formatDate(new Date())} | Records: ${salaries.length}`, pageWidth - 14, yPosition, { align: 'right' });
    doc.setTextColor(0);

    yPosition += 6;

    const totals = salaries.reduce((acc, s) => ({
      totalPagar: acc.totalPagar + (parseFloat(s.totalPagar) || 0),
      advance: acc.advance + (parseFloat(s.advance) || 0),
      finalPagar: acc.finalPagar + (parseFloat(s.finalPagar) || 0),
      bakiReturn: acc.bakiReturn + (parseFloat(s.bakiReturn) || 0),
      givenPagar: acc.givenPagar + (parseFloat(s.givenPagar) || 0)
    }), { totalPagar: 0, advance: 0, finalPagar: 0, bakiReturn: 0, givenPagar: 0 });

    const tableData = salaries.map((s, index) => [
      index + 1,
      s.employeeName || 'Unknown',
      `${formatDate(s.fromDate)} - ${formatDate(s.toDate)}`,
      parseFloat(s.daysWorked || 0).toFixed(1),
      `Rs.${parseFloat(s.pagar || 0).toFixed(2)}`,
      `Rs.${parseFloat(s.totalPagar || 0).toFixed(2)}`,
      `Rs.${parseFloat(s.advance || 0).toFixed(2)}${s.addToBaki ? ' (Baki)' : ''}`,
      `Rs.${parseFloat(s.finalPagar || 0).toFixed(2)}`,
      `Rs.${parseFloat(s.bakiReturn || 0).toFixed(2)}`,
      `Rs.${parseFloat(s.givenPagar || 0).toFixed(2)}`,
      s.description || '-'
    ]);

    // Totals summary row
    tableData.push([
      'Total',
      '',
      '',
      '',
      '',
      `Rs.${totals.totalPagar.toFixed(2)}`,
      `Rs.${totals.advance.toFixed(2)}`,
      `Rs.${totals.finalPagar.toFixed(2)}`,
      `Rs.${totals.bakiReturn.toFixed(2)}`,
      `Rs.${totals.givenPagar.toFixed(2)}`,
      ''
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Employee', 'Period', 'Days', 'Rate', 'Total Pagar', 'Advance', 'Final Pagar', 'Baki Return', 'Given Pagar', 'Notes']],
      body: tableData,
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left', cellWidth: 32 },
        2: { halign: 'center', cellWidth: 38 },
        3: { halign: 'center', cellWidth: 14 },
        4: { halign: 'right', cellWidth: 20 },
        5: { halign: 'right', cellWidth: 24 },
        6: { halign: 'right', cellWidth: 24 },
        7: { halign: 'right', cellWidth: 24 },
        8: { halign: 'right', cellWidth: 22 },
        9: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
        10: { halign: 'left' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 243, 246];
        }
      },
      margin: { left: 10, right: 10 }
    });

    doc.save(`Salary_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Find currently selected employee object for Baki display
  const selectedEmployee = employees.find(emp => String(emp.id) === String(formData.employeeId));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Salary Management</h3>
        <div className="flex gap-3">
          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium shadow-sm transition-colors"
          >
            📄 Export PDF
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors"
          >
            {showForm ? '✕ Cancel' : '+ New Salary'}
          </button>
        </div>
      </div>

      {/* Create Salary Form */}
      {showForm && (
        <div className="mb-8 bg-gray-50 p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Create Salary Record</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Employee Selection with Bold Remaining Baki */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Employee *</label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                required
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.department} (Baki: ₹{parseFloat(emp.bakiAmount || 0).toFixed(2)})
                  </option>
                ))}
              </select>

              {/* Prominent Remaining Baki in Bold */}
              {selectedEmployee ? (
                <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Remaining Baki:</span>
                  <span className="text-lg font-bold text-red-600">
                    ₹{parseFloat(selectedEmployee.bakiAmount || 0).toFixed(2)}
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-xs text-gray-400">Select an employee to see current remaining baki</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">From Date *</label>
              <input
                type="date"
                value={formData.fromDate}
                onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">To Date *</label>
              <input
                type="date"
                value={formData.toDate}
                onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Days Worked * (Half days: 0.5, 1.5, etc.)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.daysWorked}
                onChange={(e) => setFormData({ ...formData, daysWorked: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                placeholder="e.g. 5.5"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Pagar (Daily Rate) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.pagar}
                onChange={(e) => setFormData({ ...formData, pagar: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                placeholder="₹"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Total Pagar (Auto)</label>
              <input
                type="number"
                step="0.01"
                value={formData.totalPagar}
                readOnly
                className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-800 font-semibold cursor-not-allowed"
              />
            </div>

            {/* Advance with Button to Add in Baki */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Advance</label>
                {parseFloat(formData.advance) > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, addToBaki: !prev.addToBaki }))}
                    className={`text-xs px-2.5 py-1 rounded-md font-bold transition-all shadow-sm border ${
                      formData.addToBaki
                        ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {formData.addToBaki ? '✓ Added in Baki (Full Pagar)' : '+ Add in Baki?'}
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                value={formData.advance}
                onChange={(e) => setFormData({ ...formData, advance: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                placeholder="₹"
              />
              {parseFloat(formData.advance) > 0 && (
                <p className={`text-xs mt-1 ${formData.addToBaki ? 'text-amber-700 font-semibold' : 'text-gray-500'}`}>
                  {formData.addToBaki
                    ? '⚠️ Advance will be added to Baki debt. Full pagar will be given!'
                    : 'Advance will be deducted from this salary.'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Final Pagar (Auto)</label>
              <input
                type="number"
                step="0.01"
                value={formData.finalPagar}
                readOnly
                className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-800 font-semibold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Baki Return</label>
              <input
                type="number"
                step="0.01"
                value={formData.bakiReturn}
                onChange={(e) => setFormData({ ...formData, bakiReturn: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                placeholder="₹"
              />
              {selectedEmployee && parseFloat(selectedEmployee.bakiAmount) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Current Baki: <strong className="text-red-600">₹{parseFloat(selectedEmployee.bakiAmount).toFixed(2)}</strong>
                </p>
              )}
            </div>

            {/* Auto-calculated Given Pagar */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Given Pagar (Auto) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.givenPagar}
                onChange={(e) => setFormData({ ...formData, givenPagar: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-green-50 text-green-700 font-bold focus:ring-2 focus:ring-green-500"
                placeholder="₹"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.addToBaki ? 'Full Pagar - Baki Return' : 'Total Pagar - Advance - Baki Return'}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1 text-gray-700">Description (Optional)</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                placeholder="Add notes about this salary... e.g. 'Bonus for extra work' or 'Deduction for leave'"
              />
            </div>

            <div className="md:col-span-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 shadow-sm transition-colors"
              >
                Create Salary Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Salary List Table */}
      {loading ? (
        <p className="text-center py-8 text-gray-500">Loading salaries...</p>
      ) : (
        <div className="overflow-x-auto shadow-sm rounded-lg border">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm">
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
            <tbody className="text-sm">
              {salaries.length === 0 ? (
                <tr>
                  <td colSpan="11" className="border p-6 text-center text-gray-500">
                    No salary records found
                  </td>
                </tr>
              ) : (
                salaries.map((salary) => (
                  <tr key={salary.id} className="hover:bg-gray-50 transition-colors">
                    <td className="border p-3 font-semibold text-gray-800">{salary.employeeName || 'Unknown'}</td>
                    <td className="border p-3 whitespace-nowrap">
                      {formatDate(salary.fromDate)} - {formatDate(salary.toDate)}
                    </td>
                    <td className="border p-3 text-center">{parseFloat(salary.daysWorked).toFixed(1)}</td>
                    <td className="border p-3 text-right">₹{parseFloat(salary.pagar).toFixed(2)}</td>
                    <td className="border p-3 text-right">₹{parseFloat(salary.totalPagar).toFixed(2)}</td>
                    <td className="border p-3 text-right">
                      <div>₹{parseFloat(salary.advance).toFixed(2)}</div>
                      {salary.addToBaki ? (
                        <span className="inline-block px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800 rounded font-semibold mt-0.5">
                          Added to Baki
                        </span>
                      ) : null}
                    </td>
                    <td className="border p-3 text-right">₹{parseFloat(salary.finalPagar).toFixed(2)}</td>
                    <td className="border p-3 text-right text-red-600 font-medium">₹{parseFloat(salary.bakiReturn).toFixed(2)}</td>
                    <td className="border p-3 text-right font-bold text-green-600 text-base">
                      ₹{parseFloat(salary.givenPagar).toFixed(2)}
                    </td>
                    <td className="border p-3 text-sm text-gray-600">
                      {salary.description || '-'}
                    </td>
                    <td className="border p-3 text-center">
                      <button
                        onClick={() => handleDelete(salary.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium transition-colors"
                        title="Delete Record"
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
