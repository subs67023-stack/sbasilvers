import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { generateCustomerLedgerPDF, generateKharediPDF, generateVeekhariPDF } from '../../utils/pitalKaamPdfGenerator';
import { formatDate } from '../../utils/dateUtils';

export default function PitalCustomerLedgerModal({ customerName, customerType = 'kharedi', onClose }) {
  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState(null);

  useEffect(() => {
    if (customerName) {
      fetchLedger();
    }
  }, [customerName, customerType]);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/pital-kaam/customers/${encodeURIComponent(customerName)}/ledger?type=${customerType}`);
      if (res.data.success) {
        setLedgerData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching customer ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!customerName) return null;

  const isKharedi = customerType === 'kharedi';
  const summary = ledgerData?.summary || {};
  const entries = ledgerData?.entries || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className={`text-white p-5 flex justify-between items-center ${
          isKharedi
            ? 'bg-gradient-to-r from-amber-700 to-amber-900'
            : 'bg-gradient-to-r from-emerald-700 to-teal-900'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{isKharedi ? '🛒' : '💰'}</span>
              <h2 className="text-xl font-bold">
                {isKharedi ? 'Kharedi Party Statement:' : 'Veekhari Customer Statement:'} {customerName}
              </h2>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                isKharedi ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}>
                {isKharedi ? 'Supplier / Party' : 'Buyer / Customer'}
              </span>
            </div>
            <p className="text-white/80 text-xs mt-0.5">
              {isKharedi ? 'Brass metal purchases recorded from this party' : 'Brass metal sales recorded to this customer'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold p-1 rounded-lg hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`p-4 rounded-xl border ${isKharedi ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className={`text-xs font-semibold ${isKharedi ? 'text-amber-800' : 'text-emerald-800'}`}>
                {isKharedi ? 'Total Weight Purchased' : 'Total Weight Sold'}
              </p>
              <p className="text-xl font-black text-gray-900 mt-0.5">
                {parseFloat(summary.totalKg || 0).toFixed(3)} kg
              </p>
              <p className="text-[11px] text-gray-500">{summary.count || 0} transactions</p>
            </div>

            <div className={`p-4 rounded-xl border ${isKharedi ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className={`text-xs font-semibold ${isKharedi ? 'text-amber-800' : 'text-emerald-800'}`}>
                {isKharedi ? 'Total Purchase Amount' : 'Total Sale Amount'}
              </p>
              <p className={`text-xl font-black mt-0.5 ${isKharedi ? 'text-amber-950' : 'text-emerald-950'}`}>
                ₹{parseFloat(summary.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-gray-500">Gross billing total</p>
            </div>

            <div className={`p-4 rounded-xl border ${isKharedi ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className={`text-xs font-semibold ${isKharedi ? 'text-amber-800' : 'text-emerald-800'}`}>
                Average Rate / kg
              </p>
              <p className="text-xl font-black text-gray-900 mt-0.5">
                ₹{parseFloat(summary.avgRate || 0).toFixed(2)}/kg
              </p>
              <p className="text-[11px] text-gray-500">Weighted average</p>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className={`font-semibold ${isKharedi ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}>
                <tr>
                  <th className="py-2.5 px-3 text-left">Date</th>
                  <th className="py-2.5 px-3 text-left">Bill No.</th>
                  <th className="py-2.5 px-3 text-right">Weight (kg)</th>
                  <th className="py-2.5 px-3 text-right">Rate / kg (₹)</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  <th className="py-2.5 px-3 text-center">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">
                      Loading statement transactions...
                    </td>
                  </tr>
                ) : entries.length > 0 ? (
                  entries.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="py-2 px-3 text-gray-700 whitespace-nowrap">
                        {formatDate(item.date)}
                      </td>
                      <td className="py-2 px-3 font-semibold text-gray-900">
                        {item.billNo}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-gray-900">
                        {parseFloat(item.kg).toFixed(3)} kg
                      </td>
                      <td className="py-2 px-3 text-right text-gray-600">
                        ₹{parseFloat(item.ratePerKg).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900">
                        ₹{parseFloat(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => isKharedi ? generateKharediPDF(item) : generateVeekhariPDF(item)}
                          className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
                          title="Download PDF Receipt"
                        >
                          📄
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-gray-500">
                      No transactions recorded for this {isKharedi ? 'party' : 'customer'} yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Total Transactions: {entries.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => generateCustomerLedgerPDF(customerName, customerType, entries, summary)}
              disabled={entries.length === 0}
              className={`px-4 py-2 text-white text-xs font-semibold rounded-xl shadow transition flex items-center gap-1.5 disabled:opacity-50 ${
                isKharedi ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <span>📄</span> Download Statement PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
