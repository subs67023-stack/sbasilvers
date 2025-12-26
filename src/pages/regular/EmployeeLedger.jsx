import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import RegularDashboard from './RegularDashboard';

const EmployeeLedger = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployeeData();
    fetchLedger();
  }, [id]);

  const fetchEmployeeData = async () => {
    try {
      const response = await api.get(`/employees/${id}`);
      setEmployee(response.data.data);
    } catch (error) {
      console.error('Error fetching employee:', error);
      alert('Failed to fetch employee details');
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/employees/${id}/ledger`);
      setSalaries(response.data.data || []);
    } catch (error) {
      console.error('Error fetching ledger:', error);
      alert('Failed to fetch ledger');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totals = salaries.reduce((acc, salary) => ({
    totalPagar: acc.totalPagar + parseFloat(salary.totalPagar),
    advance: acc.advance + parseFloat(salary.advance),
    finalPagar: acc.finalPagar + parseFloat(salary.finalPagar),
    bakiReturn: acc.bakiReturn + parseFloat(salary.bakiReturn),
    givenPagar: acc.givenPagar + parseFloat(salary.givenPagar)
  }), { totalPagar: 0, advance: 0, finalPagar: 0, bakiReturn: 0, givenPagar: 0 });

  const [bakiTransactions, setBakiTransactions] = useState([]);

  useEffect(() => {
    fetchBakiTransactions();
  }, [id]);

  const fetchBakiTransactions = async () => {
    try {
      const response = await api.get(`/baki-transactions/employee/${id}`);
      setBakiTransactions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching baki transactions:', error);
    }
  };

  // ===== NEW PDF EXPORT FUNCTION =====
const exportToPDF = () => {
  const doc = new jsPDF('l', 'mm', 'a4'); // landscape mode
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 10;

  // --- HEADER SECTION ---
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(`Employee Ledger: ${employee?.name || 'N/A'}`, 14, yPosition);
  yPosition += 8;

  // Employee Info
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`Department: ${employee?.department || 'N/A'}`, 14, yPosition);
  yPosition += 5;
  doc.text(`Date of Join: ${employee ? new Date(employee.dateOfJoin).toLocaleDateString() : 'N/A'}`, 14, yPosition);
  yPosition += 5;
  doc.setFont(undefined, 'bold');
  doc.setTextColor(220, 38, 38); // Red
  doc.text(`Current Baki: Rs.${parseFloat(employee?.bakiAmount || 0).toFixed(2)}`, 14, yPosition);
  doc.setTextColor(0, 0, 0); // Reset to black
  yPosition += 8;

  // Calculate table width (same for both tables)
  const tableWidth = pageWidth - 20; // 10mm margin on each side

  // --- SALARY TABLE ---
  const salaryTableData = salaries.map((salary) => [
    new Date(salary.fromDate).toLocaleDateString(),
    new Date(salary.toDate).toLocaleDateString(),
    parseFloat(salary.daysWorked || 0).toFixed(2),
    parseFloat(salary.pagar).toFixed(2),
    parseFloat(salary.totalPagar).toFixed(2),
    parseFloat(salary.advance).toFixed(2),
    parseFloat(salary.finalPagar).toFixed(2),
    parseFloat(salary.bakiReturn).toFixed(2),
    parseFloat(salary.givenPagar).toFixed(2)
  ]);

  // Add totals row
  salaryTableData.push([
    'TOTALS:',
    '',
    '',
    '',
    totals.totalPagar.toFixed(2),
    totals.advance.toFixed(2),
    totals.finalPagar.toFixed(2),
    totals.bakiReturn.toFixed(2),
    totals.givenPagar.toFixed(2)
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['From Date', 'To Date', 'Days Worked', 'Pagar (Rate)', 'Total Pagar', 'Advance', 'Final Pagar', 'Baki Jama', 'Given Pagar']],
    body: salaryTableData,
    tableWidth: tableWidth,
    headStyles: {
      fillColor: [229, 231, 235],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    margin: { left: 10, right: 10 },
    columnStyles: {
      0: { halign: 'left', cellWidth: 25 },
      1: { halign: 'left', cellWidth: 25 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 25 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'right', cellWidth: 25 },
      7: { halign: 'right', cellWidth: 25, textColor: [220, 38, 38] },
      8: { halign: 'right', cellWidth: 28, textColor: [34, 197, 94] }
    },
    didParseCell: (data) => {
      // Format currency columns
      if (data.section === 'body' && data.column.index > 2 && data.column.index !== 2) {
        data.cell.text = ['Rs.' + (data.cell.text[0] || '0')];
      }
    }
  });

  yPosition = doc.lastAutoTable.finalY + 10;

  // --- BAKI TRANSACTIONS SECTION ---
  if (bakiTransactions.length > 0) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Baki Transactions', 14, yPosition);
    yPosition += 8;

    const bakiTableData = bakiTransactions.map((txn) => [
      new Date(txn.date).toLocaleDateString(),
      txn.type === 'given' ? 'Baki Uchal' : 'Baki Jama',
      txn.type === 'given' ? `+${parseFloat(txn.amount).toFixed(2)}` : `-${parseFloat(txn.amount).toFixed(2)}`,
      txn.description || '-'
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Type', 'Amount (Rs.)', 'Description']],
      body: bakiTableData,
      tableWidth: tableWidth, // Same width as salary table
      headStyles: {
        fillColor: [216, 180, 254],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: 2
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [0, 0, 0],
        cellPadding: 2
      },
      alternateRowStyles: {
        fillColor: [243, 232, 255]
      },
      margin: { left: 10, right: 10 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 'auto' },
        1: { halign: 'center', cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 'auto', textColor: [220, 38, 38] },
        3: { halign: 'left', cellWidth: 'auto' }
      }
    });
  }

  // Generate filename and save
  const fileName = `${employee?.name}_Ledger_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

  return (
    <RegularDashboard>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => navigate('/regular/employee')}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-1"
            >
              ← Back to Employees
            </button>
            <h2 className="text-2xl font-bold">
              Employee Ledger: {employee?.name || 'Loading...'}
            </h2>
            {employee && (
              <div className="text-gray-600 mt-2">
                <p>Department: {employee.department}</p>
                <p>Date of Join: {new Date(employee.dateOfJoin).toLocaleDateString()}</p>
                <p className="font-semibold text-red-600">
                  Current Baki: ₹{parseFloat(employee.bakiAmount).toFixed(2)}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={exportToPDF}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            📊 Export to PDF
          </button>
        </div>

        {loading ? (
          <p className="text-center py-8">Loading...</p>
        ) : salaries.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No salary transactions found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-3 text-left">From Date</th>
                    <th className="border p-3 text-left">To Date</th>
                    <th className="border p-3 text-center">Days Worked</th>
                    <th className="border p-3 text-right">Pagar (Rate)</th>
                    <th className="border p-3 text-right">Total Pagar</th>
                    <th className="border p-3 text-right">Advance</th>
                    <th className="border p-3 text-right">Final Pagar</th>
                    <th className="border p-3 text-right">Baki Jama</th>
                    <th className="border p-3 text-right">Given Pagar</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.map((salary) => (
                    <tr key={salary.id} className="hover:bg-gray-50">
                      <td className="border p-3">{new Date(salary.fromDate).toLocaleDateString()}</td>
                      <td className="border p-3">{new Date(salary.toDate).toLocaleDateString()}</td>
                      <td className="border p-3 text-center">{salary.daysWorked}</td>
                      <td className="border p-3 text-right">₹{parseFloat(salary.pagar).toFixed(2)}</td>
                      <td className="border p-3 text-right">₹{parseFloat(salary.totalPagar).toFixed(2)}</td>
                      <td className="border p-3 text-right">₹{parseFloat(salary.advance).toFixed(2)}</td>
                      <td className="border p-3 text-right">₹{parseFloat(salary.finalPagar).toFixed(2)}</td>
                      <td className="border p-3 text-right text-red-600">₹{parseFloat(salary.bakiReturn).toFixed(2)}</td>
                      <td className="border p-3 text-right font-semibold text-green-600">
                        ₹{parseFloat(salary.givenPagar).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-blue-50 font-semibold">
                    <td colSpan="4" className="border p-3 text-right">TOTALS:</td>
                    <td className="border p-3 text-right">₹{totals.totalPagar.toFixed(2)}</td>
                    <td className="border p-3 text-right">₹{totals.advance.toFixed(2)}</td>
                    <td className="border p-3 text-right">₹{totals.finalPagar.toFixed(2)}</td>
                    <td className="border p-3 text-right text-red-600">₹{totals.bakiReturn.toFixed(2)}</td>
                    <td className="border p-3 text-right text-green-600">₹{totals.givenPagar.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Baki Transactions Section */}
              {bakiTransactions.length > 0 && (
                <>
                  <h3 className="text-xl font-bold mt-8 mb-4">Baki Transactions</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-purple-100">
                          <th className="border p-3 text-left">Date</th>
                          <th className="border p-3 text-center">Type</th>
                          <th className="border p-3 text-right">Amount</th>
                          <th className="border p-3 text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bakiTransactions.map((txn) => (
                          <tr key={txn.id} className="hover:bg-gray-50">
                            <td className="border p-3">{new Date(txn.date).toLocaleDateString()}</td>
                            <td className="border p-3 text-center">
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  txn.type === 'given'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {txn.type === 'given' ? 'Baki Uchal' : 'Baki Jama'}
                              </span>
                            </td>
                            <td className={`border p-3 text-right font-semibold ${
                              txn.type === 'given' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {txn.type === 'given' ? '+' : '-'}₹{parseFloat(txn.amount).toFixed(2)}
                            </td>
                            <td className="border p-3">{txn.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </RegularDashboard>
  );
};

export default EmployeeLedger;
