import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import WholesaleDashboard from './WholesaleDashboard';

const BullenList = () => {
  const [bullenNames, setBullenNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchBullenNames();
  }, []);

  const fetchBullenNames = async () => {
    setLoading(true);
    try {
      const response = await api.get('/wholesale-bullen/names');
      setBullenNames(response.data.data || []);
    } catch (error) {
      console.error('Error fetching bullen names:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLedger = (bullenName) => {
    navigate(`/wholesale/bullen-ledger/${encodeURIComponent(bullenName)}`);
  };

  const filteredBullen = bullenNames.filter(name =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <WholesaleDashboard>
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Bullen List</h2>
        <button
          onClick={() => navigate('/wholesale/bullen')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Entry
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search bullen name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Bullen Cards */}
      {loading ? (
        <p className="text-center py-8">Loading...</p>
      ) : filteredBullen.length === 0 ? (
        <p className="text-center py-8 text-gray-500">No bullen found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBullen.map((name, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
                  <p className="text-sm text-gray-500">View complete transaction history</p>
                </div>
                <button
                  onClick={() => handleViewLedger(name)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  View Ledger
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </WholesaleDashboard>
  );
};

export default BullenList;
