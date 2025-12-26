import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import * as XLSX from 'xlsx';
import RegularDashboard from './RegularDashboard';

const BullenLedger = () => {
  const { bullenName } = useParams();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLedger();
  }, [bullenName]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/regular-bullen/ledger/${encodeURIComponent(bullenName)}`);
      setEntries(response.data.data || []);
    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const dataToExport = entries.map(entry => {
      const base = {
        'Date': new Date(entry.date).toLocaleDateString(),
        'Transaction Type': entry.transactionType === 'sale' ? 'Sale' : entry.transactionType === 'purchase' ? 'Purchase' : 'Badal',
        'Sale Type': entry.saleType === 'gut' ? 'Gut' : 'Kach'
      };

      if (entry.transactionType === 'badal') {
        if (entry.saleType === 'gut') {
          return {
            ...base,
            'Weight (g)': entry.weight ? parseFloat(entry.weight).toFixed(3) : '-',
            'Badal (g)': entry.badal ? parseFloat(entry.badal).toFixed(3) : '-',
            'Raw Silver (g)': entry.rawSilver ? parseFloat(entry.rawSilver).toFixed(3) : '-',
            'Touch': entry.touch ? parseFloat(entry.touch).toFixed(2) : '-',
            'Total Silver (g)': entry.totalSilver ? parseFloat(entry.totalSilver).toFixed(3) : '-',
            'Description': entry.description || '-'
          };
        } else {
          return {
            ...base,
            'Form No': entry.formNo || '-',
            'Weight (g)': entry.weight ? parseFloat(entry.weight).toFixed(3) : '-',
            'Touch': entry.touch ? parseFloat(entry.touch).toFixed(2) : '-',
            'Fine (g)': entry.fine ? parseFloat(entry.fine).toFixed(3) : '-',
            'Badal (g)': entry.badal ? parseFloat(entry.badal).toFixed(3) : '-',
            'Gut Return (g)': entry.gutReturn ? parseFloat(entry.gutReturn).toFixed(3) : '-',
            'Description': entry.description || '-'
          };
        }
      } else {
        return {
          ...base,
          'Form No': entry.formNo || '-',
          'Weight (g)': parseFloat(entry.weight).toFixed(3),
          'Touch': entry.touch ? parseFloat(entry.touch).toFixed(2) : '-',
          'Fine (g)': entry.fine ? parseFloat(entry.fine).toFixed(3) : '-',
          'Bhav': parseFloat(entry.bhav).toFixed(2),
          'Total Amount': parseFloat(entry.totalAmount).toFixed(2),
          'Description': entry.description || '-'
        };
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bullen Ledger');
    XLSX.writeFile(workbook, `${bullenName}_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getTransactionLabel = (entry) => {
  // Determine sale type label
  const saleTypeLabel = entry.saleType === 'gut' ? 'Gut' : 'Kachi';
  
  // Combine with transaction type
  if (entry.transactionType === 'sale') {
    return `${saleTypeLabel} Sale`;
  }
  if (entry.transactionType === 'purchase') {
    return `${saleTypeLabel} Purchase`;
  }
  if (entry.transactionType === 'badal') {
    return `${saleTypeLabel} Badal`;
  }
  
  return '';
};


  const getTransactionColor = (entry) => {
  // Different colors for each of the 6 types
  if (entry.transactionType === 'sale') {
    return entry.saleType === 'gut' 
      ? 'bg-green-100 text-green-800'   // Gut Sale
      : 'bg-emerald-100 text-emerald-800'; // Kachi Sale
  }
  
  if (entry.transactionType === 'purchase') {
    return entry.saleType === 'gut'
      ? 'bg-blue-100 text-blue-800'     // Gut Purchase
      : 'bg-indigo-100 text-indigo-800'; // Kachi Purchase
  }
  
  if (entry.transactionType === 'badal') {
    return entry.saleType === 'gut'
      ? 'bg-purple-100 text-purple-800'  // Gut Badal
      : 'bg-violet-100 text-violet-800';  // Kachi Badal
  }
  
  return 'bg-gray-100 text-gray-800';
};


  return (
    <RegularDashboard>
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate('/regular-billing/bullen-list')}
            className="text-purple-600 hover:text-purple-800 mb-2 flex items-center gap-1"
          >
            ← Back to Bullen List
          </button>
          <h2 className="text-2xl font-bold">Ledger: {bullenName}</h2>
          <p className="text-gray-600">All transactions for this bullen</p>
        </div>
        <button
          onClick={exportToExcel}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          📊 Export to Excel
        </button>
      </div>

      {loading ? (
        <p className="text-center py-8">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-center py-8 text-gray-500">No transactions found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Date</th>
                <th className="border p-2 text-left">Type</th>
                <th className="border p-2 text-left">Form No</th>
                <th className="border p-2 text-right">Weight (g)</th>
                <th className="border p-2 text-right">Touch</th>
                <th className="border p-2 text-right">Fine (g)</th>
                <th className="border p-2 text-right">Bhav</th>
                <th className="border p-2 text-right">Badal (g)</th>
                <th className="border p-2 text-right">Raw Silver (g)</th>
                <th className="border p-2 text-right">Total Silver (g)</th>
                <th className="border p-2 text-right">Gut Return (g)</th>
                <th className="border p-2 text-right">Total Amount</th>
                <th className="border p-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="border p-2">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTransactionColor(entry)}`}>
                      {getTransactionLabel(entry)}
                    </span>
                  </td>
                  <td className="border p-2">{entry.formNo || '-'}</td>
                  <td className="border p-2 text-right">{entry.weight ? parseFloat(entry.weight).toFixed(3) : '-'}</td>
                  <td className="border p-2 text-right">{entry.touch ? parseFloat(entry.touch).toFixed(2) : '-'}</td>
                  <td className="border p-2 text-right">{entry.fine ? parseFloat(entry.fine).toFixed(3) : '-'}</td>
                  <td className="border p-2 text-right">{entry.bhav ? `₹${parseFloat(entry.bhav).toFixed(2)}` : '-'}</td>
                  <td className="border p-2 text-right">{entry.badal ? parseFloat(entry.badal).toFixed(3) : '-'}</td>
                  <td className="border p-2 text-right">{entry.rawSilver ? parseFloat(entry.rawSilver).toFixed(3) : '-'}</td>
                  <td className="border p-2 text-right">{entry.totalSilver ? parseFloat(entry.totalSilver).toFixed(3) : '-'}</td>
                  <td className="border p-2 text-right">{entry.gutReturn ? parseFloat(entry.gutReturn).toFixed(3) : '-'}</td>
                  <td className="border p-2 text-right font-semibold">{entry.totalAmount ? `₹${parseFloat(entry.totalAmount).toFixed(2)}` : '-'}</td>
                  <td className="border p-2">{entry.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </RegularDashboard>
  );
};

export default BullenLedger;
