import React, { useState, useEffect } from 'react';
import RegularDashboard from './RegularDashboard';
import api from '../../utils/api';
import { generateKharediPDF, generateVeekhariPDF } from '../../utils/pitalKaamPdfGenerator';
import PitalCustomerLedgerModal from '../../components/regularBilling/PitalCustomerLedgerModal';

export default function PitalKaam() {
  const [activeTab, setActiveTab] = useState('kharedi'); // 'kharedi' | 'veekhari' | 'analysis' | 'customers'
  const [loading, setLoading] = useState(false);

  // Separated suggested names for Kharedi vs Veekhari (NEVER MIX)
  const [suggestedKharediNames, setSuggestedKharediNames] = useState([]);
  const [suggestedVeekhariNames, setSuggestedVeekhariNames] = useState([]);

  // KHAREDI STATE
  const [kharediForm, setKharediForm] = useState({
    id: null,
    date: new Date().toISOString().split('T')[0],
    name: '',
    kg: '',
    ratePerKg: '',
    total: '',
    notes: ''
  });
  const [kharediList, setKharediList] = useState([]);
  const [kharediSummary, setKharediSummary] = useState({ totalKg: 0, totalAmount: 0, avgRate: 0, count: 0 });
  const [kharediSearch, setKharediSearch] = useState('');

  // VEEKHARI STATE
  const [veekhariForm, setVeekhariForm] = useState({
    id: null,
    date: new Date().toISOString().split('T')[0],
    name: '',
    kg: '',
    ratePerKg: '',
    total: '',
    takenRatePerKg: '', // internal taken rate per kg
    notes: ''
  });
  const [veekhariList, setVeekhariList] = useState([]);
  const [veekhariSummary, setVeekhariSummary] = useState({ totalKg: 0, totalAmount: 0, totalCost: 0, totalProfit: 0, avgRate: 0, count: 0 });
  const [veekhariSearch, setVeekhariSearch] = useState('');

  // ANALYSIS STATE
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisDateRange, setAnalysisDateRange] = useState({ startDate: '', endDate: '' });

  // CUSTOMERS STATE (Separated between Kharedi Parties and Veekhari Customers)
  const [customerSubTab, setCustomerSubTab] = useState('kharedi'); // 'kharedi' | 'veekhari'
  const [kharediParties, setKharediParties] = useState([]);
  const [veekhariCustomers, setVeekhariCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedLedgerTarget, setSelectedLedgerTarget] = useState(null); // { name, type }

  useEffect(() => {
    fetchNames();
    fetchKharedi();
    fetchVeekhari();
    fetchAnalysis();
    fetchCustomers();
  }, []);

  // Fetch separate autocomplete names
  const fetchNames = async () => {
    try {
      const res = await api.get('/pital-kaam/names');
      if (res.data.success) {
        setSuggestedKharediNames(res.data.kharediNames || []);
        setSuggestedVeekhariNames(res.data.veekhariNames || []);
      }
    } catch (err) {
      console.error('Error fetching names:', err);
    }
  };

  // 1. Fetch Kharedi
  const fetchKharedi = async (search = '') => {
    try {
      setLoading(true);
      const res = await api.get(`/pital-kaam/kharedi${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      if (res.data.success) {
        setKharediList(res.data.data || []);
        if (res.data.summary) setKharediSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching kharedi:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Veekhari
  const fetchVeekhari = async (search = '') => {
    try {
      setLoading(true);
      const res = await api.get(`/pital-kaam/veekhari${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      if (res.data.success) {
        setVeekhariList(res.data.data || []);
        if (res.data.summary) setVeekhariSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching veekhari:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Analysis
  const fetchAnalysis = async (start = '', end = '') => {
    try {
      let url = '/pital-kaam/analysis';
      const params = [];
      if (start) params.push(`startDate=${start}`);
      if (end) params.push(`endDate=${end}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await api.get(url);
      if (res.data.success) {
        setAnalysisData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching analysis:', err);
    }
  };

  // 4. Fetch Customers (Separate Kharedi Parties from Veekhari Customers)
  const fetchCustomers = async (search = '') => {
    try {
      const res = await api.get(`/pital-kaam/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      if (res.data.success) {
        setKharediParties(res.data.kharediParties || []);
        setVeekhariCustomers(res.data.veekhariCustomers || []);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  // Auto calculate total for Kharedi
  useEffect(() => {
    const kg = parseFloat(kharediForm.kg) || 0;
    const rate = parseFloat(kharediForm.ratePerKg) || 0;
    if (kg > 0 && rate > 0) {
      setKharediForm(prev => ({ ...prev, total: (kg * rate).toFixed(2) }));
    }
  }, [kharediForm.kg, kharediForm.ratePerKg]);

  // Auto calculate total for Veekhari
  useEffect(() => {
    const kg = parseFloat(veekhariForm.kg) || 0;
    const rate = parseFloat(veekhariForm.ratePerKg) || 0;
    if (kg > 0 && rate > 0) {
      setVeekhariForm(prev => ({ ...prev, total: (kg * rate).toFixed(2) }));
    }
  }, [veekhariForm.kg, veekhariForm.ratePerKg]);

  // Handle Kharedi Submit (Save & generate PDF)
  const handleKharediSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!kharediForm.name.trim()) {
      alert('Please enter or select Party Name');
      return;
    }
    const kg = parseFloat(kharediForm.kg);
    const rate = parseFloat(kharediForm.ratePerKg);
    if (!kg || kg <= 0 || !rate || rate <= 0) {
      alert('Please enter valid Weight (kg) and Rate/kg');
      return;
    }

    try {
      setLoading(true);
      let res;
      if (kharediForm.id) {
        res = await api.put(`/pital-kaam/${kharediForm.id}`, kharediForm);
      } else {
        res = await api.post('/pital-kaam/kharedi', kharediForm);
      }

      if (res.data.success) {
        const savedEntry = res.data.data;
        // Generate PDF right after save (NO type in PDF)
        generateKharediPDF(savedEntry);

        alert(kharediForm.id ? 'Kharedi entry updated successfully!' : 'Kharedi entry saved & PDF voucher generated!');
        setKharediForm({
          id: null,
          date: new Date().toISOString().split('T')[0],
          name: '',
          kg: '',
          ratePerKg: '',
          total: '',
          notes: ''
        });

        fetchKharedi();
        fetchNames();
        fetchAnalysis();
        fetchCustomers();
      }
    } catch (err) {
      console.error('Error saving kharedi:', err);
      alert('Failed to save kharedi: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle Veekhari Submit (Save & generate PDF - WITHOUT taken rate on PDF, WITHOUT type)
  const handleVeekhariSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!veekhariForm.name.trim()) {
      alert('Please enter or select Customer Name');
      return;
    }
    const kg = parseFloat(veekhariForm.kg);
    const rate = parseFloat(veekhariForm.ratePerKg);
    if (!kg || kg <= 0 || !rate || rate <= 0) {
      alert('Please enter valid Weight (kg) and Rate/kg');
      return;
    }

    try {
      setLoading(true);
      let res;
      if (veekhariForm.id) {
        res = await api.put(`/pital-kaam/${veekhariForm.id}`, veekhariForm);
      } else {
        res = await api.post('/pital-kaam/veekhari', veekhariForm);
      }

      if (res.data.success) {
        const savedEntry = res.data.data;
        // Generate PDF right after save (NO taken rate, NO type in PDF)
        generateVeekhariPDF(savedEntry);

        alert(veekhariForm.id ? 'Veekhari entry updated successfully!' : 'Veekhari entry saved & Customer Bill PDF generated!');
        setVeekhariForm({
          id: null,
          date: new Date().toISOString().split('T')[0],
          name: '',
          kg: '',
          ratePerKg: '',
          total: '',
          takenRatePerKg: '',
          notes: ''
        });

        fetchVeekhari();
        fetchNames();
        fetchAnalysis();
        fetchCustomers();
      }
    } catch (err) {
      console.error('Error saving veekhari:', err);
      alert('Failed to save veekhari: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (id, type) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      const res = await api.delete(`/pital-kaam/${id}`);
      if (res.data.success) {
        alert('Entry deleted successfully');
        if (type === 'kharedi') fetchKharedi();
        else fetchVeekhari();
        fetchAnalysis();
        fetchCustomers();
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
      alert('Failed to delete entry');
    }
  };

  return (
    <RegularDashboard>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🪙</span>
              <h1 className="text-2xl font-bold text-gray-900">Pital Kaam (पीतळ काम)</h1>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
                Brass Management
              </span>
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Kharedi (Purchase), Veekhari (Sales), Profit Analysis & Separate Customer Ledgers.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                fetchNames();
                fetchKharedi();
                fetchVeekhari();
                fetchAnalysis();
                fetchCustomers();
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              <span>🔄</span> Refresh Data
            </button>
          </div>
        </div>

        {/* 4 Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200">
          {/* Tab 1: Kharedi */}
          <button
            onClick={() => setActiveTab('kharedi')}
            className={`px-6 py-3 font-bold text-sm transition border-b-2 flex items-center gap-2 ${
              activeTab === 'kharedi'
                ? 'text-amber-700 border-amber-600 bg-amber-50/60 rounded-t-xl'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <span>🛒</span> Kharedi (खरेदी)
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {kharediSummary.count || 0}
            </span>
          </button>

          {/* Tab 2: Veekhari */}
          <button
            onClick={() => setActiveTab('veekhari')}
            className={`px-6 py-3 font-bold text-sm transition border-b-2 flex items-center gap-2 ${
              activeTab === 'veekhari'
                ? 'text-emerald-700 border-emerald-600 bg-emerald-50/60 rounded-t-xl'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <span>💰</span> Veekhari (विक्री)
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {veekhariSummary.count || 0}
            </span>
          </button>

          {/* Tab 3: Analysis */}
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-6 py-3 font-bold text-sm transition border-b-2 flex items-center gap-2 ${
              activeTab === 'analysis'
                ? 'text-purple-700 border-purple-600 bg-purple-50/60 rounded-t-xl'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <span>📊</span> Analysis (विश्लेषण)
          </button>

          {/* Tab 4: Customers */}
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-6 py-3 font-bold text-sm transition border-b-2 flex items-center gap-2 ${
              activeTab === 'customers'
                ? 'text-indigo-700 border-indigo-600 bg-indigo-50/60 rounded-t-xl'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <span>👥</span> Customers (ग्राहक / पार्टी)
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              {kharediParties.length + veekhariCustomers.length}
            </span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: KHAREDI (खरेदी - PURCHASE) */}
        {/* ======================================================== */}
        {activeTab === 'kharedi' && (
          <div className="space-y-6">
            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
                <p className="text-xs text-amber-700 font-medium">Total Kharedi Weight</p>
                <p className="text-2xl font-black text-amber-950 mt-1">{kharediSummary.totalKg.toFixed(3)} kg</p>
                <p className="text-[11px] text-amber-700">Total brass metal purchased</p>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
                <p className="text-xs text-amber-700 font-medium">Total Kharedi Amount</p>
                <p className="text-2xl font-black text-amber-950 mt-1">₹{kharediSummary.totalAmount.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-amber-700">Total purchase expense</p>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
                <p className="text-xs text-amber-700 font-medium">Average Purchase Rate</p>
                <p className="text-2xl font-black text-amber-950 mt-1">₹{kharediSummary.avgRate.toFixed(2)}/kg</p>
                <p className="text-[11px] text-amber-700">Average bhav across purchases</p>
              </div>
            </div>

            {/* Kharedi Form */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">🛒</span>
                  <h2 className="text-base font-bold text-gray-900">
                    {kharediForm.id ? 'Edit Kharedi Entry' : 'New Kharedi (खरेदी) Entry'}
                  </h2>
                </div>
                {kharediForm.id && (
                  <button
                    type="button"
                    onClick={() => setKharediForm({
                      id: null,
                      date: new Date().toISOString().split('T')[0],
                      name: '',
                      kg: '',
                      ratePerKg: '',
                      total: '',
                      notes: ''
                    })}
                    className="text-xs text-gray-500 hover:text-gray-800 underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleKharediSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={kharediForm.date}
                      onChange={(e) => setKharediForm({ ...kharediForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Name with Kharedi-Only Auto-Suggest */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Party Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      list="kharedi-names-list"
                      required
                      placeholder="Type or select supplier..."
                      value={kharediForm.name}
                      onChange={(e) => setKharediForm({ ...kharediForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <datalist id="kharedi-names-list">
                      {suggestedKharediNames.map((n, i) => (
                        <option key={i} value={n} />
                      ))}
                    </datalist>
                    <p className="text-[10px] text-amber-700 font-medium mt-0.5">Kharedi party names only</p>
                  </div>

                  {/* Weight (kg) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Weight (kg) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 5.500"
                      value={kharediForm.kg}
                      onChange={(e) => setKharediForm({ ...kharediForm, kg: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Rate / kg */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Rate / kg (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 600"
                      value={kharediForm.ratePerKg}
                      onChange={(e) => setKharediForm({ ...kharediForm, ratePerKg: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Total (kg * rate) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Total Amount (₹)
                    </label>
                    <input
                      type="text"
                      readOnly
                      placeholder="Auto total"
                      value={kharediForm.total ? `₹${kharediForm.total}` : '₹0.00'}
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-xs font-bold text-amber-900 outline-none"
                    />
                  </div>
                </div>

                {/* Submit & PDF Button */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2"
                  >
                    <span>💾</span>
                    <span>{loading ? 'Saving...' : kharediForm.id ? 'Update & Get PDF' : 'Save & Download PDF'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Kharedi History Table */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-sm font-bold text-gray-900">
                  Kharedi Transactions ({kharediList.length})
                </h3>
                <div className="relative w-full sm:w-64">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
                  <input
                    type="text"
                    placeholder="Search name or bill no..."
                    value={kharediSearch}
                    onChange={(e) => {
                      setKharediSearch(e.target.value);
                      fetchKharedi(e.target.value);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-amber-50 text-amber-900 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Bill No.</th>
                      <th className="py-2.5 px-3 text-left">Date</th>
                      <th className="py-2.5 px-3 text-left">Party Name</th>
                      <th className="py-2.5 px-3 text-right">Weight (kg)</th>
                      <th className="py-2.5 px-3 text-right">Rate / kg (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {kharediList.length > 0 ? (
                      kharediList.map((entry) => (
                        <tr key={entry.id} className="hover:bg-amber-50/40 transition">
                          <td className="py-2.5 px-3 font-semibold text-amber-900">{entry.billNo}</td>
                          <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                            {new Date(entry.date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-gray-900">{entry.name}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-gray-900">
                            {parseFloat(entry.kg).toFixed(3)} kg
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-700">
                            ₹{parseFloat(entry.ratePerKg).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-amber-900">
                            ₹{parseFloat(entry.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => generateKharediPDF(entry)}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition"
                                title="Download PDF Voucher (No type)"
                              >
                                📄
                              </button>
                              <button
                                onClick={() => {
                                  setKharediForm({
                                    id: entry.id,
                                    date: entry.date,
                                    name: entry.name,
                                    kg: entry.kg,
                                    ratePerKg: entry.ratePerKg,
                                    total: entry.total,
                                    notes: entry.notes || ''
                                  });
                                  window.scrollTo({ top: 120, behavior: 'smooth' });
                                }}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                                title="Edit Entry"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id, 'kharedi')}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                                title="Delete Entry"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-gray-500">
                          No Kharedi entries recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: VEEKHARI (विक्री - SALES) */}
        {/* ======================================================== */}
        {activeTab === 'veekhari' && (
          <div className="space-y-6">
            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
                <p className="text-xs text-emerald-700 font-medium">Total Veekhari Weight</p>
                <p className="text-2xl font-black text-emerald-950 mt-1">{veekhariSummary.totalKg.toFixed(3)} kg</p>
                <p className="text-[11px] text-emerald-700">Total brass sold</p>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
                <p className="text-xs text-emerald-700 font-medium">Total Veekhari Revenue</p>
                <p className="text-2xl font-black text-emerald-950 mt-1">₹{veekhariSummary.totalAmount.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-emerald-700">Total sale amount collected</p>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
                <p className="text-xs text-emerald-700 font-medium">Average Sale Rate</p>
                <p className="text-2xl font-black text-emerald-950 mt-1">₹{veekhariSummary.avgRate.toFixed(2)}/kg</p>
                <p className="text-[11px] text-emerald-700">Average selling bhav</p>
              </div>

              <div className="bg-green-50 p-4 rounded-xl border border-green-300 shadow-sm">
                <p className="text-xs text-green-700 font-medium">Total Profit Earned</p>
                <p className="text-2xl font-black text-green-800 mt-1">₹{veekhariSummary.totalProfit.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-green-600">Calculated from taken rate/kg</p>
              </div>
            </div>

            {/* Veekhari Form */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">💰</span>
                  <h2 className="text-base font-bold text-gray-900">
                    {veekhariForm.id ? 'Edit Veekhari Entry' : 'New Veekhari (विक्री) Entry'}
                  </h2>
                </div>
                {veekhariForm.id && (
                  <button
                    type="button"
                    onClick={() => setVeekhariForm({
                      id: null,
                      date: new Date().toISOString().split('T')[0],
                      name: '',
                      kg: '',
                      ratePerKg: '',
                      total: '',
                      takenRatePerKg: '',
                      notes: ''
                    })}
                    className="text-xs text-gray-500 hover:text-gray-800 underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleVeekhariSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={veekhariForm.date}
                      onChange={(e) => setVeekhariForm({ ...veekhariForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Name with Veekhari-Only Auto-Suggest */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      list="veekhari-names-list"
                      required
                      placeholder="Type or select buyer..."
                      value={veekhariForm.name}
                      onChange={(e) => setVeekhariForm({ ...veekhariForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <datalist id="veekhari-names-list">
                      {suggestedVeekhariNames.map((n, i) => (
                        <option key={i} value={n} />
                      ))}
                    </datalist>
                    <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Veekhari buyer names only</p>
                  </div>

                  {/* Weight (kg) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Weight (kg) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 5.500"
                      value={veekhariForm.kg}
                      onChange={(e) => setVeekhariForm({ ...veekhariForm, kg: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Selling Rate / kg */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Sale Rate / kg (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 750"
                      value={veekhariForm.ratePerKg}
                      onChange={(e) => setVeekhariForm({ ...veekhariForm, ratePerKg: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Total (kg * rate) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Total Sale Amount (₹)
                    </label>
                    <input
                      type="text"
                      readOnly
                      placeholder="Auto total"
                      value={veekhariForm.total ? `₹${veekhariForm.total}` : '₹0.00'}
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-xs font-bold text-emerald-900 outline-none"
                    />
                  </div>

                  {/* Taken Rate / kg (Internal Cost) */}
                  <div>
                    <label className="block text-xs font-semibold text-purple-700 mb-1">
                      Taken Rate / kg (₹) <span className="text-[10px] text-gray-400 font-normal">(Internal)</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Cost rate e.g. 600"
                      value={veekhariForm.takenRatePerKg}
                      onChange={(e) => setVeekhariForm({ ...veekhariForm, takenRatePerKg: e.target.value })}
                      className="w-full px-3 py-2 border border-purple-200 bg-purple-50/50 rounded-xl text-xs font-semibold text-purple-900 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-[10px] text-purple-600 font-medium mt-0.5">Not mentioned on customer PDF</p>
                  </div>
                </div>

                {/* Live Profit Preview Box */}
                {veekhariForm.takenRatePerKg && veekhariForm.kg && veekhariForm.ratePerKg && (
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 flex flex-wrap justify-between items-center text-xs">
                    <span className="text-emerald-900 font-medium">
                      Profit Preview: Sale (₹{veekhariForm.total}) − Cost (₹{(parseFloat(veekhariForm.kg) * parseFloat(veekhariForm.takenRatePerKg)).toFixed(2)})
                    </span>
                    <span className="font-bold text-emerald-800 text-sm">
                      = Net Profit: +₹{((parseFloat(veekhariForm.ratePerKg) - parseFloat(veekhariForm.takenRatePerKg)) * parseFloat(veekhariForm.kg)).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Submit & PDF Button */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2"
                  >
                    <span>💾</span>
                    <span>{loading ? 'Saving...' : veekhariForm.id ? 'Update & Get PDF' : 'Save & Download Bill PDF'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Veekhari History Table */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-sm font-bold text-gray-900">
                  Veekhari Transactions ({veekhariList.length})
                </h3>
                <div className="relative w-full sm:w-64">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
                  <input
                    type="text"
                    placeholder="Search name or bill no..."
                    value={veekhariSearch}
                    onChange={(e) => {
                      setVeekhariSearch(e.target.value);
                      fetchVeekhari(e.target.value);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-emerald-50 text-emerald-900 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Bill No.</th>
                      <th className="py-2.5 px-3 text-left">Date</th>
                      <th className="py-2.5 px-3 text-left">Customer Name</th>
                      <th className="py-2.5 px-3 text-right">Weight (kg)</th>
                      <th className="py-2.5 px-3 text-right">Sale Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      <th className="py-2.5 px-3 text-right text-purple-800">Taken Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right text-green-700">Profit (₹)</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {veekhariList.length > 0 ? (
                      veekhariList.map((entry) => (
                        <tr key={entry.id} className="hover:bg-emerald-50/40 transition">
                          <td className="py-2.5 px-3 font-semibold text-emerald-900">{entry.billNo}</td>
                          <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                            {new Date(entry.date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-gray-900">{entry.name}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-gray-900">
                            {parseFloat(entry.kg).toFixed(3)} kg
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-700">
                            ₹{parseFloat(entry.ratePerKg).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-900">
                            ₹{parseFloat(entry.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right text-purple-700 font-medium">
                            {entry.takenRatePerKg ? `₹${parseFloat(entry.takenRatePerKg).toFixed(2)}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-green-700">
                            {entry.profit !== null ? `+₹${parseFloat(entry.profit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => generateVeekhariPDF(entry)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition"
                                title="Download PDF Bill (No type, No taken rate)"
                              >
                                📄
                              </button>
                              <button
                                onClick={() => {
                                  setVeekhariForm({
                                    id: entry.id,
                                    date: entry.date,
                                    name: entry.name,
                                    kg: entry.kg,
                                    ratePerKg: entry.ratePerKg,
                                    total: entry.total,
                                    takenRatePerKg: entry.takenRatePerKg || '',
                                    notes: entry.notes || ''
                                  });
                                  window.scrollTo({ top: 120, behavior: 'smooth' });
                                }}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                                title="Edit Entry"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id, 'veekhari')}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                                title="Delete Entry"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="py-8 text-center text-gray-500">
                          No Veekhari entries recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ANALYSIS (विश्लेषण) */}
        {/* ======================================================== */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {/* Filter Date Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap justify-between items-center gap-3">
              <h3 className="text-sm font-bold text-gray-800">
                Pital Kaam - Simple Kharedi & Veekhari Analysis
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span>From:</span>
                <input
                  type="date"
                  value={analysisDateRange.startDate}
                  onChange={(e) => {
                    const start = e.target.value;
                    setAnalysisDateRange(prev => ({ ...prev, startDate: start }));
                    fetchAnalysis(start, analysisDateRange.endDate);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded-lg outline-none"
                />
                <span>To:</span>
                <input
                  type="date"
                  value={analysisDateRange.endDate}
                  onChange={(e) => {
                    const end = e.target.value;
                    setAnalysisDateRange(prev => ({ ...prev, endDate: end }));
                    fetchAnalysis(analysisDateRange.startDate, end);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded-lg outline-none"
                />
                <button
                  onClick={() => {
                    setAnalysisDateRange({ startDate: '', endDate: '' });
                    fetchAnalysis('', '');
                  }}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold"
                >
                  Clear Filter
                </button>
              </div>
            </div>

            {/* Analysis Metrics Grid */}
            {analysisData && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. Total Kharedi */}
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
                  <p className="text-xs text-amber-700 font-semibold uppercase">1. Total Kharedi (Purchase)</p>
                  <p className="text-xl font-black text-amber-950 mt-1">
                    {analysisData.kharedi.totalKg.toFixed(3)} kg
                  </p>
                  <p className="text-xs font-bold text-amber-800 mt-0.5">
                    ₹{analysisData.kharedi.totalAmount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Avg Bhav: ₹{analysisData.kharedi.avgRate.toFixed(2)}/kg
                  </p>
                </div>

                {/* 2. Total Veekhari */}
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
                  <p className="text-xs text-emerald-700 font-semibold uppercase">2. Total Veekhari (Sale)</p>
                  <p className="text-xl font-black text-emerald-950 mt-1">
                    {analysisData.veekhari.totalKg.toFixed(3)} kg
                  </p>
                  <p className="text-xs font-bold text-emerald-800 mt-0.5">
                    ₹{analysisData.veekhari.totalAmount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Avg Bhav: ₹{analysisData.veekhari.avgRate.toFixed(2)}/kg
                  </p>
                </div>

                {/* 3. Metal Stock Remaining */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
                  <p className="text-xs text-blue-700 font-semibold uppercase">3. Stock Remaining (Weight)</p>
                  <p className="text-xl font-black text-blue-950 mt-1">
                    {analysisData.balance.stockRemainingKg.toFixed(3)} kg
                  </p>
                  <p className="text-[11px] text-blue-700 mt-1">
                    Kharedi kg − Veekhari kg
                  </p>
                </div>

                {/* 4. Total Realized Profit */}
                <div className="bg-green-50 p-4 rounded-xl border border-green-300 shadow-sm">
                  <p className="text-xs text-green-700 font-semibold uppercase">4. Total Profit Earned</p>
                  <p className="text-xl font-black text-green-800 mt-1">
                    +₹{analysisData.veekhari.totalProfit.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-green-600 mt-1">
                    From Veekhari taken rates
                  </p>
                </div>

                {/* 5. Net Cash Flow */}
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 shadow-sm">
                  <p className="text-xs text-purple-700 font-semibold uppercase">5. Net Cash Flow</p>
                  <p className={`text-xl font-black mt-1 ${analysisData.balance.netCashFlow >= 0 ? 'text-purple-900' : 'text-red-700'}`}>
                    ₹{analysisData.balance.netCashFlow.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-purple-700 mt-1">
                    Veekhari ₹ − Kharedi ₹
                  </p>
                </div>
              </div>
            )}

            {/* Monthly Comparison Breakdown */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">
                Monthly Performance & Comparison
              </h3>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 text-gray-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Month</th>
                      <th className="py-2.5 px-3 text-right text-amber-900">Kharedi (kg)</th>
                      <th className="py-2.5 px-3 text-right text-amber-900">Kharedi Amount (₹)</th>
                      <th className="py-2.5 px-3 text-right text-emerald-900">Veekhari (kg)</th>
                      <th className="py-2.5 px-3 text-right text-emerald-900">Veekhari Amount (₹)</th>
                      <th className="py-2.5 px-3 text-right text-blue-900">Net Weight (kg)</th>
                      <th className="py-2.5 px-3 text-right text-green-800">Profit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {analysisData?.monthlyBreakdown && analysisData.monthlyBreakdown.length > 0 ? (
                      analysisData.monthlyBreakdown.map((m, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition">
                          <td className="py-2.5 px-3 font-bold text-gray-900">{m.month}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-amber-900">
                            {parseFloat(m.kharediKg || 0).toFixed(3)} kg
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-amber-900">
                            ₹{parseFloat(m.kharediAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-emerald-900">
                            {parseFloat(m.veekhariKg || 0).toFixed(3)} kg
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-900">
                            ₹{parseFloat(m.veekhariAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-blue-900">
                            {(parseFloat(m.kharediKg || 0) - parseFloat(m.veekhariKg || 0)).toFixed(3)} kg
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-green-700">
                            +₹{parseFloat(m.profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-6 text-center text-gray-500">
                          No monthly data available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: CUSTOMERS (SEPARATED KHAREDI PARTIES & VEEKHARI BUYERS) */}
        {/* ======================================================== */}
        {activeTab === 'customers' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Customer & Party Accounts (Separate Records)
                </h3>
                <p className="text-xs text-gray-500">
                  Kharedi parties and Veekhari customers are kept strictly distinct.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search name..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    fetchCustomers(e.target.value);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Sub-Tabs: Kharedi Parties vs Veekhari Customers */}
            <div className="flex gap-2">
              <button
                onClick={() => setCustomerSubTab('kharedi')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  customerSubTab === 'kharedi'
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <span>🛒</span> Kharedi Parties (Suppliers)
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px]">
                  {kharediParties.length}
                </span>
              </button>

              <button
                onClick={() => setCustomerSubTab('veekhari')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  customerSubTab === 'veekhari'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <span>💰</span> Veekhari Customers (Buyers)
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px]">
                  {veekhariCustomers.length}
                </span>
              </button>
            </div>

            {/* Sub-Tab 1: Kharedi Parties Table */}
            {customerSubTab === 'kharedi' && (
              <div className="overflow-x-auto border border-amber-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-amber-50 text-amber-900 font-semibold">
                    <tr>
                      <th className="py-3 px-3 text-left">Kharedi Party Name</th>
                      <th className="py-3 px-3 text-center">Purchases</th>
                      <th className="py-3 px-3 text-right">Total Weight (kg)</th>
                      <th className="py-3 px-3 text-right">Total Amount (₹)</th>
                      <th className="py-3 px-3 text-right">Avg Rate (₹/kg)</th>
                      <th className="py-3 px-3 text-center">Last Purchase</th>
                      <th className="py-3 px-3 text-center">Ledger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {kharediParties.length > 0 ? (
                      kharediParties.map((party, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/30 transition">
                          <td className="py-3 px-3 font-bold text-gray-900 text-sm">
                            {party.name}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-amber-900">
                            {party.transactionCount}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-gray-900">
                            {party.totalKg.toFixed(3)} kg
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-amber-950">
                            ₹{party.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right text-gray-700">
                            ₹{party.avgRate.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center text-gray-500 whitespace-nowrap">
                            {new Date(party.lastDate).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setSelectedLedgerTarget({ name: party.name, type: 'kharedi' })}
                              className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition border border-amber-200"
                            >
                              👁️ View Kharedi Ledger
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-gray-500">
                          No Kharedi parties found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sub-Tab 2: Veekhari Customers Table */}
            {customerSubTab === 'veekhari' && (
              <div className="overflow-x-auto border border-emerald-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-emerald-50 text-emerald-900 font-semibold">
                    <tr>
                      <th className="py-3 px-3 text-left">Veekhari Customer Name</th>
                      <th className="py-3 px-3 text-center">Sales</th>
                      <th className="py-3 px-3 text-right">Total Weight (kg)</th>
                      <th className="py-3 px-3 text-right">Total Sale (₹)</th>
                      <th className="py-3 px-3 text-right">Avg Rate (₹/kg)</th>
                      <th className="py-3 px-3 text-right text-green-700">Total Profit (₹)</th>
                      <th className="py-3 px-3 text-center">Last Sale</th>
                      <th className="py-3 px-3 text-center">Ledger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {veekhariCustomers.length > 0 ? (
                      veekhariCustomers.map((cust, idx) => (
                        <tr key={idx} className="hover:bg-emerald-50/30 transition">
                          <td className="py-3 px-3 font-bold text-gray-900 text-sm">
                            {cust.name}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-emerald-900">
                            {cust.transactionCount}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-gray-900">
                            {cust.totalKg.toFixed(3)} kg
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-950">
                            ₹{cust.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right text-gray-700">
                            ₹{cust.avgRate.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-green-700">
                            +₹{cust.totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-center text-gray-500 whitespace-nowrap">
                            {new Date(cust.lastDate).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setSelectedLedgerTarget({ name: cust.name, type: 'veekhari' })}
                              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold transition border border-emerald-200"
                            >
                              👁️ View Veekhari Ledger
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-gray-500">
                          No Veekhari customers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer Ledger Modal */}
      {selectedLedgerTarget && (
        <PitalCustomerLedgerModal
          customerName={selectedLedgerTarget.name}
          customerType={selectedLedgerTarget.type}
          onClose={() => setSelectedLedgerTarget(null)}
        />
      )}
    </RegularDashboard>
  );
}
