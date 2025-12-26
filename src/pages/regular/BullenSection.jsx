import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom'; 

const BullenSection = () => {
  const [activeType, setActiveType] = useState('type1');
  const [activeSaleType, setActiveSaleType] = useState('gut');
  const [entries, setEntries] = useState([]);
  const [bullenNames, setBullenNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Determine transaction type based on active type
  const transactionType = activeType === 'type1' ? 'sale' : activeType === 'type2' ? 'purchase' : 'badal';

  const [gutFormData, setGutFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bullenName: '',
    customBullenName: '',
    weight: '',
    bhav: '',
    totalAmount: '',
    description: ''
  });

  const [kachFormData, setKachFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    formNo: '',
    bullenName: '',
    customBullenName: '',
    weight: '',
    touch: '',
    fine: '',
    bhav: '',
    totalAmount: '',
    description: ''
  });

  const [gutBadalFormData, setGutBadalFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bullenName: '',
    customBullenName: '',
    weight: '',
    badal: '',
    rawSilver: '',
    touch: '',
    totalSilver: '',
    description: ''
  });

  const [kachiBadalFormData, setKachiBadalFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    formNo: '',
    bullenName: '',
    customBullenName: '',
    weight: '',
    touch: '',
    fine: '',
    badal: '',
    gutReturn: '',
    description: ''
  });

  useEffect(() => {
    fetchEntries();
    fetchBullenNames();
  }, [activeType, activeSaleType]);

  const fetchBullenNames = async () => {
    try {
      const response = await api.get('/regular-bullen/names');
      setBullenNames(response.data.data || []);
    } catch (error) {
      console.error('Error fetching bullen names:', error);
    }
  };

  // Auto-calculate for Gut
  useEffect(() => {
    const weight = parseFloat(gutFormData.weight) || 0;
    const bhav = parseFloat(gutFormData.bhav) || 0;
    
    if (weight > 0 && bhav > 0) {
      const total = weight * bhav;
      setGutFormData(prev => ({
        ...prev,
        totalAmount: total.toFixed(2)
      }));
    }
  }, [gutFormData.weight, gutFormData.bhav]);

  // Auto-calculate for Kach
  useEffect(() => {
    const weight = parseFloat(kachFormData.weight) || 0;
    const touch = parseFloat(kachFormData.touch) || 0;
    const bhav = parseFloat(kachFormData.bhav) || 0;
    
    if (weight > 0 && touch > 0) {
      const fine = (weight * touch) / 100;
      const total = fine * bhav;
      
      setKachFormData(prev => ({
        ...prev,
        fine: fine.toFixed(3),
        totalAmount: total.toFixed(2)
      }));
    }
  }, [kachFormData.weight, kachFormData.touch, kachFormData.bhav]);

  // Auto-calculate for Gut Badal
  useEffect(() => {
    const rawSilver = parseFloat(gutBadalFormData.rawSilver) || 0;
    const touch = parseFloat(gutBadalFormData.touch) || 0;
    
    if (rawSilver > 0 && touch > 0) {
      const totalSilver = (rawSilver * touch) / 100;
      setGutBadalFormData(prev => ({
        ...prev,
        totalSilver: totalSilver.toFixed(3)
      }));
    }
  }, [gutBadalFormData.rawSilver, gutBadalFormData.touch]);

  // Auto-calculate for Kachi Badal
  useEffect(() => {
    const weight = parseFloat(kachiBadalFormData.weight) || 0;
    const touch = parseFloat(kachiBadalFormData.touch) || 0;
    
    if (weight > 0 && touch > 0) {
      const fine = (weight * touch) / 100;
      setKachiBadalFormData(prev => ({
        ...prev,
        fine: fine.toFixed(3)
      }));
    }
  }, [kachiBadalFormData.weight, kachiBadalFormData.touch]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/regular-bullen?transactionType=${transactionType}&saleType=${activeSaleType}`);
      setEntries(response.data.data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBullenNameValue = (formData) => {
    return formData.bullenName === 'new' ? formData.customBullenName : formData.bullenName;
  };

  const handleGutSubmit = async (e) => {
    e.preventDefault();
    const finalBullenName = getBullenNameValue(gutFormData);
    
    if (!finalBullenName) {
      alert('Please enter bullen name');
      return;
    }

    try {
      await api.post('/regular-bullen', {
        ...gutFormData,
        bullenName: finalBullenName,
        transactionType,
        saleType: 'gut'
      });
      
      alert(`Gut ${activeType === 'type1' ? 'Vikhari' : 'Kharedi'} entry saved successfully!`);
      setGutFormData({
        date: new Date().toISOString().split('T')[0],
        bullenName: '',
        customBullenName: '',
        weight: '',
        bhav: '',
        totalAmount: '',
        description: ''
      });
      fetchEntries();
      fetchBullenNames();
    } catch (error) {
      console.error('Error saving gut entry:', error);
      alert('Failed to save entry');
    }
  };

  const handleKachSubmit = async (e) => {
    e.preventDefault();
    const finalBullenName = getBullenNameValue(kachFormData);
    
    if (!finalBullenName) {
      alert('Please enter bullen name');
      return;
    }

    try {
      await api.post('/regular-bullen', {
        ...kachFormData,
        bullenName: finalBullenName,
        transactionType,
        saleType: 'kach'
      });
      
      alert(`Kachi ${activeType === 'type1' ? 'Vikari' : 'Kharedi'} entry saved successfully!`);
      setKachFormData({
        date: new Date().toISOString().split('T')[0],
        formNo: '',
        bullenName: '',
        customBullenName: '',
        weight: '',
        touch: '',
        fine: '',
        bhav: '',
        totalAmount: '',
        description: ''
      });
      fetchEntries();
      fetchBullenNames();
    } catch (error) {
      console.error('Error saving kach entry:', error);
      alert('Failed to save entry');
    }
  };

  const handleGutBadalSubmit = async (e) => {
    e.preventDefault();
    const finalBullenName = getBullenNameValue(gutBadalFormData);
    
    if (!finalBullenName) {
      alert('Please enter bullen name');
      return;
    }

    try {
      await api.post('/regular-bullen', {
        ...gutBadalFormData,
        bullenName: finalBullenName,
        transactionType: 'badal',
        saleType: 'gut'
      });
      
      alert('Gut Badal entry saved successfully!');
      setGutBadalFormData({
        date: new Date().toISOString().split('T')[0],
        bullenName: '',
        customBullenName: '',
        weight: '',
        badal: '',
        rawSilver: '',
        touch: '',
        totalSilver: '',
        description: ''
      });
      fetchEntries();
      fetchBullenNames();
    } catch (error) {
      console.error('Error saving gut badal entry:', error);
      alert('Failed to save entry');
    }
  };

  const handleKachiBadalSubmit = async (e) => {
    e.preventDefault();
    const finalBullenName = getBullenNameValue(kachiBadalFormData);
    
    if (!finalBullenName) {
      alert('Please enter bullen name');
      return;
    }

    try {
      await api.post('/regular-bullen', {
        ...kachiBadalFormData,
        bullenName: finalBullenName,
        transactionType: 'badal',
        saleType: 'kach'
      });
      
      alert('Kachi Badal entry saved successfully!');
      setKachiBadalFormData({
        date: new Date().toISOString().split('T')[0],
        formNo: '',
        bullenName: '',
        customBullenName: '',
        weight: '',
        touch: '',
        fine: '',
        badal: '',
        gutReturn: '',
        description: ''
      });
      fetchEntries();
      fetchBullenNames();
    } catch (error) {
      console.error('Error saving kachi badal entry:', error);
      alert('Failed to save entry');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      await api.delete(`/regular-bullen/${id}`);
      alert('Entry deleted successfully!');
      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry');
    }
  };

  const exportToExcel = () => {
    const filteredData = entries.filter(entry =>
      entry.bullenName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.formNo && entry.formNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.description && entry.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    let dataToExport;

    if (activeType === 'type3') {
      if (activeSaleType === 'gut') {
        dataToExport = filteredData.map(entry => ({
          'Date': new Date(entry.date).toLocaleDateString(),
          'Bullen Name': entry.bullenName,
          'Weight (g)': entry.weight ? parseFloat(entry.weight).toFixed(3) : '-',
          'Badal (g)': entry.badal ? parseFloat(entry.badal).toFixed(3) : '-',
          'Raw Silver (g)': entry.rawSilver ? parseFloat(entry.rawSilver).toFixed(3) : '-',
          'Touch': entry.touch ? parseFloat(entry.touch).toFixed(2) : '-',
          'Total Silver (g)': entry.totalSilver ? parseFloat(entry.totalSilver).toFixed(3) : '-',
          'Description': entry.description || '-'
        }));
      } else {
        dataToExport = filteredData.map(entry => ({
          'Date': new Date(entry.date).toLocaleDateString(),
          'Form No': entry.formNo || '-',
          'Bullen Name': entry.bullenName,
          'Weight (g)': entry.weight ? parseFloat(entry.weight).toFixed(3) : '-',
          'Touch': entry.touch ? parseFloat(entry.touch).toFixed(2) : '-',
          'Fine (g)': entry.fine ? parseFloat(entry.fine).toFixed(3) : '-',
          'Badal (g)': entry.badal ? parseFloat(entry.badal).toFixed(3) : '-',
          'Gut Return (g)': entry.gutReturn ? parseFloat(entry.gutReturn).toFixed(3) : '-',
          'Description': entry.description || '-'
        }));
      }
    } else {
      dataToExport = filteredData.map(entry => ({
        'Date': new Date(entry.date).toLocaleDateString(),
        'Transaction': entry.transactionType === 'sale' ? 'Sale' : 'Purchase',
        'Type': entry.saleType === 'gut' ? 'Gut' : 'Kach',
        'Form No': entry.formNo || '-',
        'Bullen Name': entry.bullenName,
        'Weight (g)': parseFloat(entry.weight).toFixed(3),
        'Touch': entry.touch ? parseFloat(entry.touch).toFixed(2) : '-',
        'Fine (g)': entry.fine ? parseFloat(entry.fine).toFixed(3) : '-',
        'Bhav': parseFloat(entry.bhav).toFixed(2),
        'Total Amount': parseFloat(entry.totalAmount).toFixed(2),
        'Description': entry.description || '-'
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Regular Bullen');
    XLSX.writeFile(workbook, `Regular_Bullen_${transactionType}_${activeSaleType}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredEntries = entries.filter(entry =>
    entry.bullenName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.formNo && entry.formNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (entry.description && entry.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Bullen Calculator</h2>

      {/* Type Selector */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveType('type1')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeType === 'type1'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Vikari
        </button>
        <button
          onClick={() => setActiveType('type2')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeType === 'type2'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Kharedi
        </button>
        <button
          onClick={() => setActiveType('type3')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeType === 'type3'
              ? 'bg-teal-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Badala
        </button>

        {/* Bullen List Button */}
        <button
          onClick={ () => {window.location.href = '/regular-billing/bullen-list'}}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          📋 Bullen List
        </button>
      </div>

      {/* Type 1 & Type 2 Content */}
      {(activeType === 'type1' || activeType === 'type2') && (
        <>
          {/* Sale/Purchase Type Tabs */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveSaleType('gut')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeSaleType === 'gut'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Gut {activeType === 'type1' ? 'Vikari' : 'Kharedi'}
            </button>
            <button
              onClick={() => setActiveSaleType('kach')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeSaleType === 'kach'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Kachi {activeType === 'type1' ? 'Vikari' : 'Kharedi'}
            </button>
          </div>

          {/* Gut Form */}
          {activeSaleType === 'gut' && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">
                Gut {activeType === 'type1' ? 'Vikari' : 'Kharedi'}
              </h3>
              <form onSubmit={handleGutSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={gutFormData.date}
                    onChange={(e) => setGutFormData({ ...gutFormData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Bullen Name</label>
                  <select
                    value={gutFormData.bullenName}
                    onChange={(e) => setGutFormData({ ...gutFormData, bullenName: e.target.value, customBullenName: '' })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select Bullen</option>
                    {bullenNames.map((name, index) => (
                      <option key={index} value={name}>{name}</option>
                    ))}
                    <option value="new">+ Add New Bullen</option>
                  </select>
                </div>

                {gutFormData.bullenName === 'new' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">New Bullen Name</label>
                    <input
                      type="text"
                      value={gutFormData.customBullenName}
                      onChange={(e) => setGutFormData({ ...gutFormData, customBullenName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter new bullen name"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Weight (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={gutFormData.weight}
                    onChange={(e) => setGutFormData({ ...gutFormData, weight: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Bhav (Rate)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={gutFormData.bhav}
                    onChange={(e) => setGutFormData({ ...gutFormData, bhav: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Total Amount (Auto)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={gutFormData.totalAmount}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={gutFormData.description}
                    onChange={(e) => setGutFormData({ ...gutFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Optional"
                  />
                </div>

                <div className="col-span-full">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Save Gut {activeType === 'type1' ? 'Sale' : 'Purchase'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Kach Form */}
          {activeSaleType === 'kach' && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">
                Kachi {activeType === 'type1' ? 'Vikari' : 'Kharedi'}
              </h3>
              <form onSubmit={handleKachSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={kachFormData.date}
                    onChange={(e) => setKachFormData({ ...kachFormData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Form No</label>
                  <input
                    type="text"
                    value={kachFormData.formNo}
                    onChange={(e) => setKachFormData({ ...kachFormData, formNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Bullen Name</label>
                  <select
                    value={kachFormData.bullenName}
                    onChange={(e) => setKachFormData({ ...kachFormData, bullenName: e.target.value, customBullenName: '' })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    <option value="">Select Bullen</option>
                    {bullenNames.map((name, index) => (
                      <option key={index} value={name}>{name}</option>
                    ))}
                    <option value="new">+ Add New Bullen</option>
                  </select>
                </div>

                {kachFormData.bullenName === 'new' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">New Bullen Name</label>
                    <input
                      type="text"
                      value={kachFormData.customBullenName}
                      onChange={(e) => setKachFormData({ ...kachFormData, customBullenName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter new bullen name"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Weight (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={kachFormData.weight}
                    onChange={(e) => setKachFormData({ ...kachFormData, weight: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Touch (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={kachFormData.touch}
                    onChange={(e) => setKachFormData({ ...kachFormData, touch: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fine (g) (Auto)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={kachFormData.fine}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Bhav (Rate)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={kachFormData.bhav}
                    onChange={(e) => setKachFormData({ ...kachFormData, bhav: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Total Amount (Auto)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={kachFormData.totalAmount}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={kachFormData.description}
                    onChange={(e) => setKachFormData({ ...kachFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Optional"
                  />
                </div>

                <div className="col-span-full">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Save Kachi {activeType === 'type1' ? 'Vikari' : 'Kharedi'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search and Export */}
          <div className="mt-8 mb-4 flex justify-between items-center">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by bullen name, form no or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              onClick={exportToExcel}
              className="ml-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              📊 Export to Excel
            </button>
          </div>

          {/* Transaction History Table */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">
              {activeSaleType === 'gut' ? 'Gut' : 'Kachi'} {activeType === 'type1' ? 'Vikari' : 'Kharedi'} History
            </h3>
            {loading ? (
              <p className="text-center py-4">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Date</th>
                      {activeSaleType === 'kach' && <th className="border p-2 text-left">Form No</th>}
                      <th className="border p-2 text-left">Bullen Name</th>
                      <th className="border p-2 text-right">Weight (g)</th>
                      {activeSaleType === 'kach' && (
                        <>
                          <th className="border p-2 text-right">Touch</th>
                          <th className="border p-2 text-right">Fine (g)</th>
                        </>
                      )}
                      <th className="border p-2 text-right">Bhav</th>
                      <th className="border p-2 text-right">Total Amount</th>
                      <th className="border p-2 text-left">Description</th>
                      <th className="border p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={activeSaleType === 'kach' ? 10 : 7} className="border p-4 text-center text-gray-500">
                          No entries found
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="border p-2">{new Date(entry.date).toLocaleDateString()}</td>
                          {activeSaleType === 'kach' && <td className="border p-2">{entry.formNo}</td>}
                          <td className="border p-2">{entry.bullenName}</td>
                          <td className="border p-2 text-right">{parseFloat(entry.weight).toFixed(3)}</td>
                          {activeSaleType === 'kach' && (
                            <>
                              <td className="border p-2 text-right">{parseFloat(entry.touch).toFixed(2)}</td>
                              <td className="border p-2 text-right">{parseFloat(entry.fine).toFixed(3)}</td>
                            </>
                          )}
                          <td className="border p-2 text-right">₹{parseFloat(entry.bhav).toFixed(2)}</td>
                          <td className="border p-2 text-right font-semibold">₹{parseFloat(entry.totalAmount).toFixed(2)}</td>
                          <td className="border p-2">{entry.description || '-'}</td>
                          <td className="border p-2 text-center">
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              🗑️ Delete
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
        </>
      )}

      {/* Type 3 - Badal Content */}
      {activeType === 'type3' && (
        <>
          {/* Badal Type Tabs */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveSaleType('gut')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeSaleType === 'gut'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Gut Badal
            </button>
            <button
              onClick={() => setActiveSaleType('kach')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeSaleType === 'kach'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Kachi Badal
            </button>
          </div>

          {/* Gut Badal Form */}
          {activeSaleType === 'gut' && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Gut Badal</h3>
              <form onSubmit={handleGutBadalSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={gutBadalFormData.date}
                    onChange={(e) => setGutBadalFormData({ ...gutBadalFormData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Bullen Name</label>
                  <select
                    value={gutBadalFormData.bullenName}
                    onChange={(e) => setGutBadalFormData({ ...gutBadalFormData, bullenName: e.target.value, customBullenName: '' })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    required
                  >
                    <option value="">Select Bullen</option>
                    {bullenNames.map((name, index) => (
                      <option key={index} value={name}>{name}</option>
                    ))}
                    <option value="new">+ Add New Bullen</option>
                  </select>
                </div>

                {gutBadalFormData.bullenName === 'new' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">New Bullen Name</label>
                    <input
                      type="text"
                      value={gutBadalFormData.customBullenName}
                      onChange={(e) => setGutBadalFormData({ ...gutBadalFormData, customBullenName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="Enter new bullen name"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Weight (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={gutBadalFormData.weight}
                    onChange={(e) => setGutBadalFormData({ ...gutBadalFormData, weight: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Badal (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={gutBadalFormData.badal}
                    onChange={(e) => setGutBadalFormData({ ...gutBadalFormData, badal: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Raw Silver (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={gutBadalFormData.rawSilver}
                    onChange={(e) => setGutBadalFormData({ ...gutBadalFormData, rawSilver: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Touch (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={gutBadalFormData.touch}
                    onChange={(e) => setGutBadalFormData({ ...gutBadalFormData, touch: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Total Silver (g) (Auto)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={gutBadalFormData.totalSilver}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={gutBadalFormData.description}
                    onChange={(e) => setGutBadalFormData({ ...gutBadalFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="Optional"
                  />
                </div>

                <div className="col-span-full">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Save Gut Badal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Kachi Badal Form */}
          {activeSaleType === 'kach' && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Kachi Badal</h3>
              <form onSubmit={handleKachiBadalSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={kachiBadalFormData.date}
                    onChange={(e) => setKachiBadalFormData({ ...kachiBadalFormData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Form No</label>
                  <input
                    type="text"
                    value={kachiBadalFormData.formNo}
                    onChange={(e) => setKachiBadalFormData({ ...kachiBadalFormData, formNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Bullen Name</label>
                  <select
                    value={kachiBadalFormData.bullenName}
                    onChange={(e) => setKachiBadalFormData({ ...kachiBadalFormData, bullenName: e.target.value, customBullenName: '' })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                    required
                  >
                    <option value="">Select Bullen</option>
                    {bullenNames.map((name, index) => (
                      <option key={index} value={name}>{name}</option>
                    ))}
                    <option value="new">+ Add New Bullen</option>
                  </select>
                </div>

                {kachiBadalFormData.bullenName === 'new' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">New Bullen Name</label>
                    <input
                      type="text"
                      value={kachiBadalFormData.customBullenName}
                      onChange={(e) => setKachiBadalFormData({ ...kachiBadalFormData, customBullenName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                      placeholder="Enter new bullen name"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Weight (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={kachiBadalFormData.weight}
                    onChange={(e) => setKachiBadalFormData({ ...kachiBadalFormData, weight: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Touch (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={kachiBadalFormData.touch}
                    onChange={(e) => setKachiBadalFormData({ ...kachiBadalFormData, touch: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fine (g) (Auto)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={kachiBadalFormData.fine}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Badal (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={kachiBadalFormData.badal}
                    onChange={(e) => setKachiBadalFormData({ ...kachiBadalFormData, badal: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Gut Return (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={kachiBadalFormData.gutReturn}
                    onChange={(e) => setKachiBadalFormData({ ...kachiBadalFormData, gutReturn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={kachiBadalFormData.description}
                    onChange={(e) => setKachiBadalFormData({ ...kachiBadalFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="Optional"
                  />
                </div>

                <div className="col-span-full">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                  >
                    Save Kachi Badal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search and Export */}
          <div className="mt-8 mb-4 flex justify-between items-center">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by bullen name, form no or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              onClick={exportToExcel}
              className="ml-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              📊 Export to Excel
            </button>
          </div>

          {/* Badal History Table */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">
              {activeSaleType === 'gut' ? 'Gut Badal' : 'Kachi Badal'} History
            </h3>
            {loading ? (
              <p className="text-center py-4">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                {activeSaleType === 'gut' ? (
                  // Gut Badal Table
                  <table className="w-full border-collapse border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Date</th>
                        <th className="border p-2 text-left">Bullen Name</th>
                        <th className="border p-2 text-right">Weight (g)</th>
                        <th className="border p-2 text-right">Badal (g)</th>
                        <th className="border p-2 text-right">Raw Silver (g)</th>
                        <th className="border p-2 text-right">Touch (%)</th>
                        <th className="border p-2 text-right">Total Silver (g)</th>
                        <th className="border p-2 text-left">Description</th>
                        <th className="border p-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="border p-4 text-center text-gray-500">
                            No entries found
                          </td>
                        </tr>
                      ) : (
                        filteredEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="border p-2">{new Date(entry.date).toLocaleDateString()}</td>
                            <td className="border p-2">{entry.bullenName}</td>
                            <td className="border p-2 text-right">{entry.weight ? parseFloat(entry.weight).toFixed(3) : '-'}</td>
                            <td className="border p-2 text-right">{entry.badal ? parseFloat(entry.badal).toFixed(3) : '-'}</td>
                            <td className="border p-2 text-right">{entry.rawSilver ? parseFloat(entry.rawSilver).toFixed(3) : '-'}</td>
                            <td className="border p-2 text-right">{entry.touch ? parseFloat(entry.touch).toFixed(2) : '-'}</td>
                            <td className="border p-2 text-right font-semibold">{entry.totalSilver ? parseFloat(entry.totalSilver).toFixed(3) : '-'}</td>
                            <td className="border p-2">{entry.description || '-'}</td>
                            <td className="border p-2 text-center">
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                🗑️ Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  // Kachi Badal Table
                  <table className="w-full border-collapse border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Date</th>
                        <th className="border p-2 text-left">Form No</th>
                        <th className="border p-2 text-left">Bullen Name</th>
                        <th className="border p-2 text-right">Weight (g)</th>
                        <th className="border p-2 text-right">Touch (%)</th>
                        <th className="border p-2 text-right">Fine (g)</th>
                        <th className="border p-2 text-right">Badal (g)</th>
                        <th className="border p-2 text-right">Gut Return (g)</th>
                        <th className="border p-2 text-left">Description</th>
                        <th className="border p-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="border p-4 text-center text-gray-500">
                            No entries found
                          </td>
                        </tr>
                      ) : (
                        filteredEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="border p-2">{new Date(entry.date).toLocaleDateString()}</td>
                            <td className="border p-2">{entry.formNo || '-'}</td>
                            <td className="border p-2">{entry.bullenName}</td>
                            <td className="border p-2 text-right">{entry.weight ? parseFloat(entry.weight).toFixed(3) : '-'}</td>
                            <td className="border p-2 text-right">{entry.touch ? parseFloat(entry.touch).toFixed(2) : '-'}</td>
                            <td className="border p-2 text-right font-semibold">{entry.fine ? parseFloat(entry.fine).toFixed(3) : '-'}</td>
                            <td className="border p-2 text-right">{entry.badal ? parseFloat(entry.badal).toFixed(3) : '-'}</td>
                            <td className="border p-2 text-right">{entry.gutReturn ? parseFloat(entry.gutReturn).toFixed(3) : '-'}</td>
                            <td className="border p-2">{entry.description || '-'}</td>
                            <td className="border p-2 text-center">
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                🗑️ Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BullenSection;
