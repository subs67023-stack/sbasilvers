import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

export default function WholesaleStockManager() {
  const [activeTab, setActiveTab] = useState('list'); // list, add, producer
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Data for filtering/selection
  const [producers, setProducers] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchProducers();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/billing/wholesale-products');
      if (res.data.success) setProducts(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducers = async () => {
    try {
      const res = await api.get('/billing/producers');
      if (res.data.success) {
        setProducers(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow min-h-[500px]">
      {/* TABS HEADER */}
      <div className="flex border-b">
        {['list', 'add', 'producer'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {tab === 'list' && '📋 Product List'}
            {tab === 'add' && '➕ Add Product'}
            {tab === 'producer' && '👥 Product Producer'}
          </button>
        ))}
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <ProductList products={products} loading={loading} refresh={fetchProducts} />
            </motion.div>
          )}
          {activeTab === 'add' && (
            <motion.div
              key="add"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <AddProductForm producers={producers} onAdd={() => { fetchProducts(); fetchProducers(); }} />
            </motion.div>
          )}
          {activeTab === 'producer' && (
            <motion.div
              key="producer"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <ProductProducerView producers={producers} products={products} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------------------------

function ProductList({ products, loading, refresh }) {
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this stock item?')) return;
    try {
      await api.delete(`/billing/wholesale-products/${id}`);
      refresh();
    } catch (e) {
      alert('Error deleting');
    }
  };

  if (loading) return <div className="p-4 text-center">Loading Stock...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
          <tr>
            <th className="p-3">Date</th>
            <th className="p-3">Producer</th>
            <th className="p-3">Item Name</th>
            <th className="p-3 text-center">Pcs</th>
            <th className="p-3 text-right">Gross Wt</th>
            <th className="p-3 text-right">Net Wt</th>
            <th className="p-3 text-right">Touch</th>
            <th className="p-3 text-right">Pure Silver</th>
            <th className="p-3 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {products.map(p => {
            const pure = (parseFloat(p.netWeight) * parseFloat(p.touch) / 100).toFixed(3);
            return (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="p-3 text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="p-3 font-medium text-gray-800">{p.producer?.name || '-'}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3 text-center">{p.pieces}</td>
                <td className="p-3 text-right">{parseFloat(p.grossWeight).toFixed(3)}</td>
                <td className="p-3 text-right font-bold">{parseFloat(p.netWeight).toFixed(3)}</td>
                <td className="p-3 text-right">{parseFloat(p.touch).toFixed(2)}</td>
                <td className="p-3 text-right text-blue-600">{pure}</td>
                <td className="p-3 text-center">
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-xs">🗑️</button>
                </td>
              </tr>
            );
          })}
          {products.length === 0 && (
            <tr><td colSpan={9} className="p-4 text-center text-gray-400">No stock found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AddProductForm({ producers, onAdd }) {
  const [formData, setFormData] = useState({
    producerId: '',
    newProducerName: '',
    name: '',
    pieces: '',
    grossWeight: '',
    perPieceWeight: '',
    touch: ''
  });

  const [calculated, setCalculated] = useState({
    netWeight: 0,
    pureSilver: 0
  });

  useEffect(() => {
    const pcs = parseFloat(formData.pieces) || 0;
    const gross = parseFloat(formData.grossWeight) || 0;
    const ppWt = parseFloat(formData.perPieceWeight) || 0;
    const touch = parseFloat(formData.touch) || 0;

    const deduction = pcs * ppWt;
    const net = Math.max(0, gross - deduction);
    const pure = (net * touch) / 100;

    setCalculated({
      netWeight: net,
      pureSilver: pure
    });
  }, [formData.pieces, formData.grossWeight, formData.perPieceWeight, formData.touch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        netWeight: calculated.netWeight
      };
      const res = await api.post('/billing/wholesale-products', payload);
      if (res.data.success) {
        alert('Stock Added Successfully');
        onAdd();
        setFormData(prev => ({
          ...prev,
          name: '',
          pieces: '',
          grossWeight: '',
          perPieceWeight: '',
          touch: ''
        }));
      }
    } catch (e) {
      console.error(e);
      alert('Error adding stock');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded border">
          {/* PRODUCER SECTION */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Producer / Karigar</label>
            <select
              className="w-full border rounded p-2 mb-2"
              value={formData.producerId}
              onChange={e => setFormData({ ...formData, producerId: e.target.value, newProducerName: '' })}
            >
              <option value="">Select Existing...</option>
              {producers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="new">+ Add New Producer</option>
            </select>

            {formData.producerId === 'new' && (
              <input
                type="text"
                placeholder="Enter New Producer Name"
                className="w-full border rounded p-2 border-blue-300 bg-blue-50"
                value={formData.newProducerName}
                onChange={e => setFormData({ ...formData, newProducerName: e.target.value })}
                required
              />
            )}
          </div>

          {/* PRODUCT BASIC */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Item Name</label>
            <input
              type="text"
              placeholder="e.g. Bombay Chain"
              className="w-full border rounded p-2"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
        </div>

        {/* CALCULATIONS TABLE INPUT */}
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-2">Pcs</th>
                <th className="p-2">Gross Wt</th>
                <th className="p-2">Per Pc Wt (-)</th>
                <th className="p-2 bg-gray-200">Net Wt (Auto)</th>
                <th className="p-2">Touch %</th>
                <th className="p-2 bg-gray-200">Pure Silver</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2">
                  <input type="number" step="1" className="w-full border p-1 text-center"
                    placeholder="0"
                    value={formData.pieces}
                    onChange={e => setFormData({ ...formData, pieces: e.target.value })}
                    required
                  />
                </td>
                <td className="p-2">
                  <input type="number" step="0.001" className="w-full border p-1 text-center"
                    placeholder="0.000"
                    value={formData.grossWeight}
                    onChange={e => setFormData({ ...formData, grossWeight: e.target.value })}
                    required
                  />
                </td>
                <td className="p-2">
                  <input type="number" step="0.001" className="w-full border p-1 text-center"
                    placeholder="0.000"
                    value={formData.perPieceWeight}
                    onChange={e => setFormData({ ...formData, perPieceWeight: e.target.value })}
                    required
                  />
                </td>
                <td className="p-2 bg-gray-50 text-center font-bold text-lg">
                  {calculated.netWeight.toFixed(3)}
                </td>
                <td className="p-2">
                  <input type="number" step="0.01" className="w-full border p-1 text-center text-blue-600 font-bold"
                    placeholder="92.50"
                    value={formData.touch}
                    onChange={e => setFormData({ ...formData, touch: e.target.value })}
                    required
                  />
                </td>
                <td className="p-2 bg-gray-50 text-center font-bold text-gray-600">
                  {calculated.pureSilver.toFixed(3)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-green-600 text-white px-8 py-3 rounded font-bold hover:bg-green-700 shadow-lg"
          >
            Save Stock Entry
          </button>
        </div>
      </form>
    </div>
  );
}

function ProductProducerView({ producers, products }) {
  const [selectedProdId, setSelectedProdId] = useState('');

  const prodProducts = selectedProdId
    ? products.filter(p => p.producerId === parseInt(selectedProdId))
    : [];

  const totalStock = prodProducts.reduce((sum, p) => sum + parseFloat(p.netWeight || 0), 0);
  const totalFine = prodProducts.reduce((sum, p) => sum + (parseFloat(p.netWeight) * parseFloat(p.touch) / 100), 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center p-4 bg-gray-50 rounded border">
        <div className="flex-1">
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Select Producer</label>
          <select
            className="w-full border rounded p-2"
            value={selectedProdId}
            onChange={e => setSelectedProdId(e.target.value)}
          >
            <option value="">-- Choose Producer --</option>
            {producers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {selectedProdId && (
          <div className="flex gap-2">
            <div className="px-4 py-2 bg-white border rounded shadow-sm text-center">
              <div className="text-xs text-gray-500 uppercase">Stock Items</div>
              <div className="font-bold text-xl">{prodProducts.length}</div>
            </div>
            <div className="px-4 py-2 bg-white border rounded shadow-sm text-center">
              <div className="text-xs text-gray-500 uppercase">Net Stock (g)</div>
              <div className="font-bold text-xl">{totalStock.toFixed(3)}</div>
            </div>
            <div className="px-4 py-2 bg-white border rounded shadow-sm text-center">
              <div className="text-xs text-gray-500 uppercase">Fine Silver (g)</div>
              <div className="font-bold text-xl text-blue-600">{totalFine.toFixed(3)}</div>
            </div>
          </div>
        )}
      </div>

      {selectedProdId && (
        <div className="flex gap-2 justify-end mb-2">
          <button className="px-4 py-2 bg-orange-600 text-white rounded shadow text-sm hover:bg-orange-700">
            ↩ Return Material
          </button>
          <button
            onClick={() => alert('Ledger View requires integration.')}
            className="px-4 py-2 bg-gray-800 text-white rounded shadow text-sm hover:bg-gray-900"
          >
            📄 View Ledger
          </button>
        </div>
      )}

      {selectedProdId && (
        <div className="border rounded overflow-hidden">
          <ProductList products={prodProducts} loading={false} refresh={() => { }} />
        </div>
      )}

      {!selectedProdId && <div className="text-center p-8 text-gray-400">Select a producer to view their stock.</div>}
    </div>
  );
}