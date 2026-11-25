import React, { useState, useEffect } from 'react';
import WholesaleDashboard from './WholesaleDashboard';
import api from '../../utils/api';
import * as XLSX from 'xlsx';

const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const raw = String(dateStr).split('T')[0];
  const parts = raw.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const isToday = (dateStr) => {
  if (!dateStr) return false;
  return String(dateStr).split('T')[0] === getTodayDate();
};

const sortTransactions = (items, order = 'desc') => {
  return [...items].sort((a, b) => {
    const dateA = a.date ? String(a.date).split('T')[0] : '';
    const dateB = b.date ? String(b.date).split('T')[0] : '';
    const cmp = order === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    if (cmp !== 0) return cmp;
    return order === 'asc' ? (a.id || 0) - (b.id || 0) : (b.id || 0) - (a.id || 0);
  });
};

const JamaKharchCash = () => {
  const [activeTab, setActiveTab] = useState('JAMA'); // 'JAMA' | 'KHARCHA' | 'ALL' | 'ANALYSIS'
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateSortOrder, setDateSortOrder] = useState('desc'); // 'desc' = latest first, 'asc' = oldest first
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    date: getTodayDate(),
    amount: '',
    name: '',
    description: ''
  });

  // Overall & Analysis State
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisFilter, setAnalysisFilter] = useState({
    period: 'all',
    startDate: '',
    endDate: ''
  });
  const [partySearch, setPartySearch] = useState('');

  useEffect(() => {
    fetchOverallAnalysis();
  }, []);

  useEffect(() => {
    if (activeTab === 'ANALYSIS') {
      fetchFilteredAnalysis();
    } else {
      fetchTransactions();
    }
  }, [activeTab]);

  useEffect(() => {
    let result = transactions;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = transactions.filter(txn =>
        (txn.name && txn.name.toLowerCase().includes(lower)) ||
        (txn.description && txn.description.toLowerCase().includes(lower)) ||
        (txn.date && txn.date.includes(searchTerm)) ||
        formatDate(txn.date).includes(searchTerm) ||
        (txn.amount && String(txn.amount).includes(searchTerm))
      );
    }
    setFilteredTransactions(sortTransactions(result, dateSortOrder));
  }, [searchTerm, transactions, dateSortOrder]);

  // Overall KPI fetch
  const fetchOverallAnalysis = async () => {
    try {
      const response = await api.get('/wholesale-jama-kharch/cash/analysis');
      if (response.data?.status === 'success') {
        setAnalysisData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching overall analysis:', error);
    }
  };

  // Filtered analysis fetch for Analysis tab
  const [filteredAnalysis, setFilteredAnalysis] = useState(null);
  const fetchFilteredAnalysis = async (customStart = '', customEnd = '') => {
    setAnalysisLoading(true);
    try {
      const params = [];
      const s = customStart !== undefined ? customStart : analysisFilter.startDate;
      const e = customEnd !== undefined ? customEnd : analysisFilter.endDate;
      if (s) params.push(`startDate=${s}`);
      if (e) params.push(`endDate=${e}`);
      const queryStr = params.length > 0 ? `?${params.join('&')}` : '';

      const response = await api.get(`/wholesale-jama-kharch/cash/analysis${queryStr}`);
      if (response.data?.status === 'success') {
        setFilteredAnalysis(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching filtered analysis:', error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handlePeriodChange = (period) => {
    const today = getTodayDate();
    let s = '';
    let e = '';

    if (period === 'today') {
      s = today;
      e = today;
    } else if (period === 'this_month') {
      const d = new Date();
      s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      e = today;
    }

    setAnalysisFilter({ period, startDate: s, endDate: e });
    fetchFilteredAnalysis(s, e);
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'ALL'
        ? '/wholesale-jama-kharch/cash?type=ALL'
        : `/wholesale-jama-kharch/cash?type=${activeTab}`;
      const response = await api.get(url);
      const sorted = sortTransactions(response.data.data || []);
      setTransactions(sorted);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get('/wholesale-jama-kharch/cash/pdf', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `wholesale-cash-report-${getTodayDate()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    }
  };

  // Excel Export
  const exportToExcel = () => {
    const dataToExport = filteredTransactions.map(txn => ({
      'Date': formatDate(txn.date),
      'Type': txn.type,
      'Amount (₹)': parseFloat(txn.amount).toFixed(2),
      'Name': txn.name,
      'Description': txn.description || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${activeTab} Cash`);
    XLSX.writeFile(workbook, `Wholesale_Cash_${activeTab}_${getTodayDate()}.xlsx`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submissionType = activeTab === 'ALL' ? 'JAMA' : activeTab;
      await api.post('/wholesale-jama-kharch/cash', {
        ...formData,
        type: submissionType
      });

      alert('Transaction saved successfully!');
      setFormData({
        date: getTodayDate(),
        amount: '',
        name: '',
        description: ''
      });
      fetchTransactions();
      fetchOverallAnalysis();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Failed to save transaction');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await api.delete(`/wholesale-jama-kharch/cash/${id}`);
      alert('Transaction deleted successfully!');
      fetchTransactions();
      fetchOverallAnalysis();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const currentAnalysis = activeTab === 'ANALYSIS' ? (filteredAnalysis || analysisData) : analysisData;

  return (
    <WholesaleDashboard>
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header with Title & Top Summary Badges */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <span>💵</span> Wholesale Jama / Kharch (Cash)
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Complete cash debit/credit ledger, automatic date sorting & financial analysis
            </p>
          </div>

          {/* Quick Stats Badges */}
          {analysisData && (
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-emerald-900">
                <span className="font-semibold block text-[10px] uppercase text-emerald-700">Total Jama</span>
                <span className="font-bold text-sm">₹{analysisData.totalJama.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5 text-rose-900">
                <span className="font-semibold block text-[10px] uppercase text-rose-700">Total Kharcha</span>
                <span className="font-bold text-sm">₹{analysisData.totalKharcha.toLocaleString('en-IN')}</span>
              </div>
              <div className={`border rounded-lg px-3 py-1.5 ${
                analysisData.netBalance >= 0 
                  ? 'bg-blue-50 border-blue-200 text-blue-900' 
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <span className="font-semibold block text-[10px] uppercase text-gray-600">Net Balance</span>
                <span className="font-bold text-sm">₹{analysisData.netBalance.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 text-purple-900">
                <span className="font-semibold block text-[10px] uppercase text-purple-700">Today's Net</span>
                <span className="font-bold text-sm">
                  {analysisData.todayNet >= 0 ? '+' : ''}₹{analysisData.todayNet.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('JAMA')}
            className={`px-5 py-2.5 rounded-t-lg font-bold text-sm transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'JAMA'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
            }`}
          >
            <span>📥</span> JAMA (आवक)
          </button>
          <button
            onClick={() => setActiveTab('KHARCHA')}
            className={`px-5 py-2.5 rounded-t-lg font-bold text-sm transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'KHARCHA'
                ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
            }`}
          >
            <span>📤</span> KHARCHA (जावक)
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-5 py-2.5 rounded-t-lg font-bold text-sm transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'ALL'
                ? 'bg-blue-700 text-white border-blue-800 shadow-sm'
                : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
            }`}
          >
            <span>📜</span> ALL LEDGER
          </button>
          <button
            onClick={() => setActiveTab('ANALYSIS')}
            className={`px-5 py-2.5 rounded-t-lg font-bold text-sm transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'ANALYSIS'
                ? 'bg-purple-700 text-white border-purple-800 shadow-sm'
                : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
            }`}
          >
            <span>📊</span> ANALYSIS (विश्लेषण)
          </button>
        </div>

        {/* ======================================================== */}
        {/* TABS 1, 2, 3: JAMA / KHARCHA / ALL LEDGER */}
        {/* ======================================================== */}
        {activeTab !== 'ANALYSIS' && (
          <div>
            {/* Create Transaction Form (Shown for JAMA, KHARCHA, and ALL) */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-8">
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>➕</span> Add New Cash Entry (
                <span className={activeTab === 'KHARCHA' ? 'text-rose-600' : 'text-emerald-600'}>
                  {activeTab === 'KHARCHA' ? 'KHARCHA' : 'JAMA'}
                </span>
                )
              </h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Date <span className="text-blue-600 font-normal">(Today / Any Date)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {isToday(formData.date) ? '⭐️ Today will be on top' : '📌 Will sort to its exact date'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="₹ 0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Party / Person Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Customer / Vendor name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Description / Remarks</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Optional notes"
                  />
                </div>

                <div className="col-span-full flex justify-end">
                  <button
                    type="submit"
                    className={`px-6 py-2.5 text-white font-bold rounded-lg shadow transition-colors flex items-center gap-2 ${
                      activeTab === 'KHARCHA'
                        ? 'bg-rose-700 hover:bg-rose-800'
                        : 'bg-emerald-700 hover:bg-emerald-800'
                    }`}
                  >
                    <span>💾</span> Save {activeTab === 'KHARCHA' ? 'Kharcha' : 'Jama'} Entry
                  </button>
                </div>
              </form>
            </div>

            {/* Search and Action Bar */}
            <div className="mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex-1 w-full max-w-md">
                <input
                  type="text"
                  placeholder="Search by name, description, amount, or date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-semibold shadow-sm"
                >
                  📄 PDF Report
                </button>
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm font-semibold shadow-sm"
                >
                  📊 Export Excel
                </button>
              </div>
            </div>

            {/* Transaction History Table */}
            <div>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                <h3 className="text-base font-bold text-gray-800">
                  Transaction List ({filteredTransactions.length})
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Sort by Date:</span>
                  <button
                    type="button"
                    onClick={() => setDateSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1.5 shadow-sm transition-all"
                    title="Click to toggle Date sort order"
                  >
                    <span>{dateSortOrder === 'desc' ? '📅 Newest First ⬇️' : '📅 Oldest First ⬆️'}</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-10">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading transactions...</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 font-bold border-b">
                        <th
                          onClick={() => setDateSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                          className="p-3 text-left cursor-pointer hover:bg-gray-200 transition-colors select-none group"
                          title="Click to toggle Date sort (Newest / Oldest)"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Date</span>
                            <span className="text-blue-600 font-bold text-xs">
                              {dateSortOrder === 'desc' ? '▼' : '▲'}
                            </span>
                          </div>
                        </th>
                        {activeTab === 'ALL' && <th className="p-3 text-left">Type</th>}
                        <th className="p-3 text-left">Amount (₹)</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Description</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={activeTab === 'ALL' ? 6 : 5} className="p-8 text-center text-gray-500">
                            No transactions found.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((txn) => {
                          const todayRow = isToday(txn.date);
                          return (
                            <tr
                              key={txn.id}
                              className={`transition-colors ${
                                todayRow ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <td className="p-3 whitespace-nowrap">
                                <span className="font-bold text-gray-800">{formatDate(txn.date)}</span>
                                {todayRow && (
                                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800 uppercase tracking-wider">
                                    Today
                                  </span>
                                )}
                              </td>

                              {activeTab === 'ALL' && (
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                      txn.type === 'JAMA'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {txn.type}
                                  </span>
                                </td>
                              )}

                              <td className="p-3 font-bold text-gray-900">
                                ₹{parseFloat(txn.amount).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </td>

                              <td className="p-3 font-medium text-gray-800">{txn.name}</td>
                              <td className="p-3 text-gray-600">{txn.description || '-'}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleDelete(txn.id)}
                                  className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition"
                                  title="Delete entry"
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: ANALYSIS (विश्लेषण) */}
        {/* ======================================================== */}
        {activeTab === 'ANALYSIS' && (
          <div className="space-y-6">
            {/* Period Filter Bar */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-700 mr-1">Period:</span>
                <button
                  onClick={() => handlePeriodChange('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    analysisFilter.period === 'all'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-white text-gray-700 border hover:bg-gray-100'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => handlePeriodChange('today')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    analysisFilter.period === 'today'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-white text-gray-700 border hover:bg-gray-100'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => handlePeriodChange('this_month')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    analysisFilter.period === 'this_month'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-white text-gray-700 border hover:bg-gray-100'
                  }`}
                >
                  This Month
                </button>
              </div>

              {/* Custom Date Range */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-700">Custom Date:</span>
                <input
                  type="date"
                  value={analysisFilter.startDate}
                  onChange={(e) => setAnalysisFilter({ ...analysisFilter, period: 'custom', startDate: e.target.value })}
                  className="px-2 py-1 text-xs border rounded bg-white"
                />
                <span className="text-xs text-gray-500">to</span>
                <input
                  type="date"
                  value={analysisFilter.endDate}
                  onChange={(e) => setAnalysisFilter({ ...analysisFilter, period: 'custom', endDate: e.target.value })}
                  className="px-2 py-1 text-xs border rounded bg-white"
                />
                <button
                  onClick={() => fetchFilteredAnalysis()}
                  className="px-3 py-1 text-xs font-bold bg-purple-600 text-white rounded hover:bg-purple-700 shadow-sm"
                >
                  Apply
                </button>
              </div>
            </div>

            {analysisLoading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
                <p className="mt-2 text-sm text-gray-600">Calculating analysis...</p>
              </div>
            ) : currentAnalysis ? (
              <>
                {/* 4 Primary Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">1. Total Jama (Credit)</p>
                    <p className="text-2xl font-black text-emerald-950 mt-1">
                      ₹{currentAnalysis.totalJama.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">Total cash received</p>
                  </div>

                  <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-800">2. Total Kharcha (Debit)</p>
                    <p className="text-2xl font-black text-rose-950 mt-1">
                      ₹{currentAnalysis.totalKharcha.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-rose-700 mt-1">Total cash paid / spent</p>
                  </div>

                  <div className={`border-2 rounded-xl p-5 shadow-sm ${
                    currentAnalysis.netBalance >= 0
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-amber-50 border-amber-300'
                  }`}>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-700">3. Net Cash Balance</p>
                    <p className={`text-2xl font-black mt-1 ${
                      currentAnalysis.netBalance >= 0 ? 'text-blue-950' : 'text-amber-900'
                    }`}>
                      ₹{currentAnalysis.netBalance.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Jama minus Kharcha</p>
                  </div>

                  <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-800">4. Today's Net Flow</p>
                    <p className={`text-2xl font-black mt-1 ${
                      currentAnalysis.todayNet >= 0 ? 'text-purple-950' : 'text-rose-900'
                    }`}>
                      {currentAnalysis.todayNet >= 0 ? '+' : ''}₹{currentAnalysis.todayNet.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      Jama: ₹{currentAnalysis.todayJama.toLocaleString('en-IN')} | Kharcha: ₹{currentAnalysis.todayKharcha.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Monthly Financial Breakdown */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span>📅</span> Monthly Cash Flow Breakdown
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 font-bold border-b">
                          <th className="p-3 text-left">Month</th>
                          <th className="p-3 text-right">Total Jama (₹)</th>
                          <th className="p-3 text-right">Total Kharcha (₹)</th>
                          <th className="p-3 text-right">Net Balance (₹)</th>
                          <th className="p-3 text-center">Entries</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {currentAnalysis.monthlyBreakdown?.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="p-4 text-center text-gray-500">
                              No monthly records found.
                            </td>
                          </tr>
                        ) : (
                          currentAnalysis.monthlyBreakdown?.map((m, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-3 font-bold text-gray-800">{m.month}</td>
                              <td className="p-3 text-right font-medium text-emerald-700">
                                ₹{m.jama.toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 text-right font-medium text-rose-700">
                                ₹{m.kharcha.toLocaleString('en-IN')}
                              </td>
                              <td className={`p-3 text-right font-bold ${
                                m.balance >= 0 ? 'text-blue-900' : 'text-rose-900'
                              }`}>
                                ₹{m.balance.toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 text-center text-gray-600">{m.count}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Party-wise Breakdown Table */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <span>👥</span> Party / Customer Wise Cash Ledger
                    </h3>
                    <input
                      type="text"
                      placeholder="Filter by party name..."
                      value={partySearch}
                      onChange={(e) => setPartySearch(e.target.value)}
                      className="px-3 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-purple-500 w-full md:w-64"
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 font-bold border-b">
                          <th className="p-3 text-left">Party / Name</th>
                          <th className="p-3 text-right">Jama (₹)</th>
                          <th className="p-3 text-right">Kharcha (₹)</th>
                          <th className="p-3 text-right">Balance (₹)</th>
                          <th className="p-3 text-center">Entries</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {currentAnalysis.partyBreakdown
                          ?.filter(p => !partySearch || p.name.toLowerCase().includes(partySearch.toLowerCase()))
                          .map((p, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-3 font-bold text-gray-800">{p.name}</td>
                              <td className="p-3 text-right font-medium text-emerald-700">
                                ₹{p.jama.toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 text-right font-medium text-rose-700">
                                ₹{p.kharcha.toLocaleString('en-IN')}
                              </td>
                              <td className={`p-3 text-right font-bold ${
                                p.balance >= 0 ? 'text-blue-900' : 'text-rose-900'
                              }`}>
                                ₹{p.balance.toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 text-center text-gray-600">{p.count}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </WholesaleDashboard>
  );
};

export default JamaKharchCash;
