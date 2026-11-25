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

const JamaKharchSilver = () => {
  const [activeTab, setActiveTab] = useState('JAMA'); // 'JAMA' | 'KHARCHA' | 'ALL' | 'ANALYSIS'
  const [silverFormType, setSilverFormType] = useState('fine'); // 'fine' | 'raw'
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateSortOrder, setDateSortOrder] = useState('desc'); // 'desc' = latest first, 'asc' = oldest first
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  // Forms
  const [fineFormData, setFineFormData] = useState({
    date: getTodayDate(),
    silverWeight: '',
    name: '',
    description: ''
  });

  const [rawFormData, setRawFormData] = useState({
    date: getTodayDate(),
    formNo: '',
    grossWeight: '',
    touch: '',
    totalSilver: '',
    name: '',
    description: ''
  });

  // Analysis State
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
        (txn.silverWeight && String(txn.silverWeight).includes(searchTerm)) ||
        (txn.silverType && txn.silverType.toLowerCase().includes(lower))
      );
    }
    setFilteredTransactions(sortTransactions(result, dateSortOrder));
  }, [searchTerm, transactions, dateSortOrder]);

  // Auto-calculate Total Silver when Gross Weight or Touch changes
  useEffect(() => {
    const grossWeight = parseFloat(rawFormData.grossWeight) || 0;
    const touch = parseFloat(rawFormData.touch) || 0;

    if (grossWeight > 0 && touch > 0) {
      const totalSilver = (grossWeight * touch) / 100;
      setRawFormData(prev => ({
        ...prev,
        totalSilver: Math.round(totalSilver * 1000) / 1000
      }));
    }
  }, [rawFormData.grossWeight, rawFormData.touch]);

  const fetchOverallAnalysis = async () => {
    try {
      const response = await api.get('/wholesale-jama-kharch/silver/analysis');
      if (response.data?.status === 'success') {
        setAnalysisData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching silver overall analysis:', error);
    }
  };

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

      const response = await api.get(`/wholesale-jama-kharch/silver/analysis${queryStr}`);
      if (response.data?.status === 'success') {
        setFilteredAnalysis(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching filtered silver analysis:', error);
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
        ? '/wholesale-jama-kharch/silver?type=ALL'
        : `/wholesale-jama-kharch/silver?type=${activeTab}`;
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
      const response = await api.get('/wholesale-jama-kharch/silver/pdf', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `wholesale-silver-report-${getTodayDate()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredTransactions.map(txn => ({
      'Date': formatDate(txn.date),
      'Type': txn.type,
      'Silver Type': txn.silverType === 'raw' ? 'Raw' : 'Fine',
      'Silver Weight (g)': Math.round(parseFloat(txn.silverWeight) || 0),
      'Name': txn.name,
      'Description': txn.description || '-',
      'Form No': txn.formNo || '-',
      'Gross Weight': txn.grossWeight || '-',
      'Touch': txn.touch || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${activeTab} Silver`);
    XLSX.writeFile(workbook, `Wholesale_Silver_${activeTab}_${getTodayDate()}.xlsx`);
  };

  const handleFineSubmit = async (e) => {
    e.preventDefault();
    try {
      const submissionType = activeTab === 'ALL' ? 'JAMA' : activeTab;
      await api.post('/wholesale-jama-kharch/silver', {
        ...fineFormData,
        type: submissionType,
        silverType: 'fine'
      });

      alert('Fine silver transaction saved successfully!');
      setFineFormData({
        date: getTodayDate(),
        silverWeight: '',
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

  const handleRawSubmit = async (e) => {
    e.preventDefault();
    try {
      const submissionType = activeTab === 'ALL' ? 'JAMA' : activeTab;
      await api.post('/wholesale-jama-kharch/silver', {
        ...rawFormData,
        type: submissionType,
        silverType: 'raw',
        silverWeight: rawFormData.totalSilver
      });

      alert('Raw silver transaction saved successfully!');
      setRawFormData({
        date: getTodayDate(),
        formNo: '',
        grossWeight: '',
        touch: '',
        totalSilver: '',
        name: '',
        description: ''
      });
      fetchTransactions();
      fetchOverallAnalysis();
    } catch (error) {
      console.error('Error saving raw silver:', error);
      alert('Failed to save transaction');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await api.delete(`/wholesale-jama-kharch/silver/${id}`);
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
              <span>💎</span> Wholesale Jama / Kharch (Silver)
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Fine & Raw silver debit/credit ledger, automatic date sorting & stock analysis
            </p>
          </div>

          {/* Quick Stats Badges */}
          {analysisData && (
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-emerald-900">
                <span className="font-semibold block text-[10px] uppercase text-emerald-700">Total Silver Jama</span>
                <span className="font-bold text-sm">
                  {Math.round(analysisData.totalJama).toLocaleString('en-IN')} g
                  <span className="text-[10px] font-normal text-emerald-700 ml-1">
                    ({(analysisData.totalJama / 1000).toFixed(2)} kg)
                  </span>
                </span>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5 text-rose-900">
                <span className="font-semibold block text-[10px] uppercase text-rose-700">Total Silver Kharcha</span>
                <span className="font-bold text-sm">
                  {Math.round(analysisData.totalKharcha).toLocaleString('en-IN')} g
                  <span className="text-[10px] font-normal text-rose-700 ml-1">
                    ({(analysisData.totalKharcha / 1000).toFixed(2)} kg)
                  </span>
                </span>
              </div>
              <div className={`border rounded-lg px-3 py-1.5 ${
                analysisData.netBalance >= 0 
                  ? 'bg-blue-50 border-blue-200 text-blue-900' 
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <span className="font-semibold block text-[10px] uppercase text-gray-600">Net Silver Stock</span>
                <span className="font-bold text-sm">
                  {Math.round(analysisData.netBalance).toLocaleString('en-IN')} g
                  <span className="text-[10px] font-normal ml-1">
                    ({(analysisData.netBalance / 1000).toFixed(2)} kg)
                  </span>
                </span>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 text-purple-900">
                <span className="font-semibold block text-[10px] uppercase text-purple-700">Today's Net</span>
                <span className="font-bold text-sm">
                  {analysisData.todayNet >= 0 ? '+' : ''}{Math.round(analysisData.todayNet).toLocaleString('en-IN')} g
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
            <span>📥</span> JAMA (चांदी आवक)
          </button>
          <button
            onClick={() => setActiveTab('KHARCHA')}
            className={`px-5 py-2.5 rounded-t-lg font-bold text-sm transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'KHARCHA'
                ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
            }`}
          >
            <span>📤</span> KHARCHA (चांदी जावक)
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
            {/* Form Toggle: Fine vs Raw Silver */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-gray-200 gap-2">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <span>➕</span> Add New Silver Entry (
                  <span className={activeTab === 'KHARCHA' ? 'text-rose-600' : 'text-emerald-600'}>
                    {activeTab === 'KHARCHA' ? 'KHARCHA' : 'JAMA'}
                  </span>
                  )
                </h3>
                <div className="flex bg-gray-200 p-0.5 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSilverFormType('fine')}
                    className={`px-3 py-1 rounded-md transition ${
                      silverFormType === 'fine' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ✨ Fine Silver
                  </button>
                  <button
                    type="button"
                    onClick={() => setSilverFormType('raw')}
                    className={`px-3 py-1 rounded-md transition ${
                      silverFormType === 'raw' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🪙 Raw Silver (Touch)
                  </button>
                </div>
              </div>

              {/* Form 1: Fine Silver */}
              {silverFormType === 'fine' ? (
                <form onSubmit={handleFineSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Date <span className="text-blue-600 font-normal">(Today / Any Date)</span>
                    </label>
                    <input
                      type="date"
                      value={fineFormData.date}
                      onChange={(e) => setFineFormData({ ...fineFormData, date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    />
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {isToday(fineFormData.date) ? '⭐️ Today will be on top' : '📌 Will sort to its exact date'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Silver Weight (Grams)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={fineFormData.silverWeight}
                      onChange={(e) => setFineFormData({ ...fineFormData, silverWeight: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="In grams (e.g. 150.50)"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Party / Person Name</label>
                    <input
                      type="text"
                      value={fineFormData.name}
                      onChange={(e) => setFineFormData({ ...fineFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Customer / Karigar name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Description / Remarks</label>
                    <input
                      type="text"
                      value={fineFormData.description}
                      onChange={(e) => setFineFormData({ ...fineFormData, description: e.target.value })}
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
                      <span>💾</span> Save Fine Silver {activeTab === 'KHARCHA' ? 'Kharcha' : 'Jama'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Form 2: Raw Silver */
                <form onSubmit={handleRawSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={rawFormData.date}
                      onChange={(e) => setRawFormData({ ...rawFormData, date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    />
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {isToday(rawFormData.date) ? '⭐️ Today on top' : '📌 To exact date'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Form No.</label>
                    <input
                      type="text"
                      value={rawFormData.formNo}
                      onChange={(e) => setRawFormData({ ...rawFormData, formNo: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="e.g. F-101"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Gross Weight (g)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={rawFormData.grossWeight}
                      onChange={(e) => setRawFormData({ ...rawFormData, grossWeight: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Gross wt"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Touch (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={rawFormData.touch}
                      onChange={(e) => setRawFormData({ ...rawFormData, touch: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="e.g. 70"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Net Silver (Auto)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={rawFormData.totalSilver}
                      readOnly
                      className="w-full px-3 py-2 border rounded-lg bg-gray-100 font-bold text-blue-900 cursor-not-allowed"
                      placeholder="Auto"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Party / Remarks</label>
                    <input
                      type="text"
                      value={rawFormData.name}
                      onChange={(e) => setRawFormData({ ...rawFormData, name: e.target.value, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Name / note"
                      required
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
                      <span>💾</span> Save Raw Silver {activeTab === 'KHARCHA' ? 'Kharcha' : 'Jama'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Search and Action Bar */}
            <div className="mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex-1 w-full max-w-md">
                <input
                  type="text"
                  placeholder="Search by name, description, weight, or date..."
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
                        <th className="p-3 text-left">Silver Type</th>
                        <th className="p-3 text-left">Silver Weight (g)</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Details</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={activeTab === 'ALL' ? 7 : 6} className="p-8 text-center text-gray-500">
                            No transactions found.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((txn) => {
                          const todayRow = isToday(txn.date);
                          const roundedWeight = Math.round(parseFloat(txn.silverWeight) || 0);
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

                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                                    txn.silverType === 'raw'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-indigo-100 text-indigo-800'
                                  }`}
                                >
                                  {txn.silverType === 'raw' ? '🪙 Raw' : '✨ Fine'}
                                </span>
                              </td>

                              <td className="p-3 font-black text-gray-900">
                                {roundedWeight} g
                                {roundedWeight >= 1000 && (
                                  <span className="text-[11px] font-normal text-gray-500 ml-1">
                                    ({(roundedWeight / 1000).toFixed(2)} kg)
                                  </span>
                                )}
                              </td>

                              <td className="p-3 font-medium text-gray-800">{txn.name}</td>
                              <td className="p-3 text-gray-600">
                                {txn.silverType === 'raw' && txn.grossWeight ? (
                                  <span className="text-xs">
                                    Gross: {txn.grossWeight}g | Touch: {txn.touch}% {txn.formNo ? `| Form: ${txn.formNo}` : ''}
                                  </span>
                                ) : (
                                  txn.description || '-'
                                )}
                              </td>
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
                <p className="mt-2 text-sm text-gray-600">Calculating silver analysis...</p>
              </div>
            ) : currentAnalysis ? (
              <>
                {/* Primary Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">1. Total Silver Jama</p>
                    <p className="text-2xl font-black text-emerald-950 mt-1">
                      {Math.round(currentAnalysis.totalJama).toLocaleString('en-IN')} g
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">
                      Fine: {Math.round(currentAnalysis.fineJama)}g | Raw: {Math.round(currentAnalysis.rawJama)}g
                    </p>
                  </div>

                  <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-800">2. Total Silver Kharcha</p>
                    <p className="text-2xl font-black text-rose-950 mt-1">
                      {Math.round(currentAnalysis.totalKharcha).toLocaleString('en-IN')} g
                    </p>
                    <p className="text-xs text-rose-700 mt-1">
                      Fine: {Math.round(currentAnalysis.fineKharcha)}g | Raw: {Math.round(currentAnalysis.rawKharcha)}g
                    </p>
                  </div>

                  <div className={`border-2 rounded-xl p-5 shadow-sm ${
                    currentAnalysis.netBalance >= 0
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-amber-50 border-amber-300'
                  }`}>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-700">3. Net Silver Stock</p>
                    <p className={`text-2xl font-black mt-1 ${
                      currentAnalysis.netBalance >= 0 ? 'text-blue-950' : 'text-amber-900'
                    }`}>
                      {Math.round(currentAnalysis.netBalance).toLocaleString('en-IN')} g
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Equivalent to {(currentAnalysis.netBalance / 1000).toFixed(2)} kg
                    </p>
                  </div>

                  <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-800">4. Today's Net Silver</p>
                    <p className={`text-2xl font-black mt-1 ${
                      currentAnalysis.todayNet >= 0 ? 'text-purple-950' : 'text-rose-900'
                    }`}>
                      {currentAnalysis.todayNet >= 0 ? '+' : ''}{Math.round(currentAnalysis.todayNet).toLocaleString('en-IN')} g
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      Jama: {Math.round(currentAnalysis.todayJama)}g | Kharcha: {Math.round(currentAnalysis.todayKharcha)}g
                    </p>
                  </div>
                </div>

                {/* Monthly Silver Breakdown */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span>📅</span> Monthly Silver Flow Breakdown
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 font-bold border-b">
                          <th className="p-3 text-left">Month</th>
                          <th className="p-3 text-right">Total Jama (g)</th>
                          <th className="p-3 text-right">Total Kharcha (g)</th>
                          <th className="p-3 text-right">Net Balance (g)</th>
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
                                {m.jama.toLocaleString('en-IN')} g
                              </td>
                              <td className="p-3 text-right font-medium text-rose-700">
                                {m.kharcha.toLocaleString('en-IN')} g
                              </td>
                              <td className={`p-3 text-right font-bold ${
                                m.balance >= 0 ? 'text-blue-900' : 'text-rose-900'
                              }`}>
                                {m.balance.toLocaleString('en-IN')} g
                              </td>
                              <td className="p-3 text-center text-gray-600">{m.count}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Party-wise Silver Ledger Table */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <span>👥</span> Party / Karigar Wise Silver Ledger
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
                          <th className="p-3 text-right">Jama (g)</th>
                          <th className="p-3 text-right">Kharcha (g)</th>
                          <th className="p-3 text-right">Balance (g)</th>
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
                                {p.jama.toLocaleString('en-IN')} g
                              </td>
                              <td className="p-3 text-right font-medium text-rose-700">
                                {p.kharcha.toLocaleString('en-IN')} g
                              </td>
                              <td className={`p-3 text-right font-bold ${
                                p.balance >= 0 ? 'text-blue-900' : 'text-rose-900'
                              }`}>
                                {p.balance.toLocaleString('en-IN')} g
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

export default JamaKharchSilver;
