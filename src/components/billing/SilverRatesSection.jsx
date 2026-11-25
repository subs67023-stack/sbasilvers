import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { formatDate } from '../../utils/dateUtils';

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
            <th className="p-3 text-center">Stamp</th>
            <th className="p-3 text-center">Pcs</th>
            <th className="p-3 text-right">Gross Wt</th>
            <th className="p-3 text-right">Stone Wt</th>
            <th className="p-3 text-right">Net Wt</th>
            <th className="p-3 text-right">Touch</th>
            <th className="p-3 text-right">Pure Silver</th>
            <th className="p-3 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {products.map(p => {
            const pure = (parseFloat(p.netWeight || 0) * parseFloat(p.touch || 0) / 100).toFixed(3);
            return (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="p-3 text-xs text-gray-500">{formatDate(p.createdAt)}</td>
                <td className="p-3 font-medium text-gray-800">{p.producer?.name || '-'}</td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-center font-medium text-gray-700">{p.stamp || '-'}</td>
                <td className="p-3 text-center">{p.pieces}</td>
                <td className="p-3 text-right">{parseFloat(p.grossWeight || 0).toFixed(3)}</td>
                <td className="p-3 text-right">{parseFloat(p.stoneWeight || 0).toFixed(3)}</td>
                <td className="p-3 text-right font-bold">{parseFloat(p.netWeight || 0).toFixed(3)}</td>
                <td className="p-3 text-right">{parseFloat(p.touch || 0).toFixed(2)}</td>
                <td className="p-3 text-right text-blue-600">{pure}</td>
                <td className="p-3 text-center">
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-xs">🗑️</button>
                </td>
              </tr>
            );
          })}
          {products.length === 0 && (
            <tr><td colSpan={11} className="p-4 text-center text-gray-400">No stock found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AddProductForm({ producers, onAdd }) {
  const [producerData, setProducerData] = useState({
    producerId: '',
    newProducerName: '',
    newProducerPhone: ''
  });

  const [items, setItems] = useState([
    {
      name: '',
      stamp: '92.5',
      pieces: '',
      grossWeight: '',
      stoneWeight: '',
      netWeight: 0,
      touch: '92.50',
      pureSilver: 0
    }
  ]);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    const pcs = parseFloat(updated[index].pieces) || 0;
    const gross = parseFloat(updated[index].grossWeight) || 0;
    const stone = parseFloat(updated[index].stoneWeight) || 0;
    const touch = parseFloat(updated[index].touch) || 0;

    // Stone weight taken once for the item
    const net = Math.max(0, gross - stone);
    const pure = (net * touch) / 100;

    updated[index].netWeight = parseFloat(net.toFixed(3));
    updated[index].pureSilver = parseFloat(pure.toFixed(3));

    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        name: '',
        stamp: '92.5',
        pieces: '',
        grossWeight: '',
        stoneWeight: '',
        netWeight: 0,
        touch: '92.50',
        pureSilver: 0
      }
    ]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Totals across all items
  const totals = items.reduce(
    (acc, item) => ({
      pieces: acc.pieces + (parseInt(item.pieces) || 0),
      grossWeight: acc.grossWeight + (parseFloat(item.grossWeight) || 0),
      stoneWeight: acc.stoneWeight + (parseFloat(item.stoneWeight) || 0),
      netWeight: acc.netWeight + (parseFloat(item.netWeight) || 0),
      pureSilver: acc.pureSilver + (parseFloat(item.pureSilver) || 0)
    }),
    { pieces: 0, grossWeight: 0, stoneWeight: 0, netWeight: 0, pureSilver: 0 }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!producerData.producerId) {
      alert('Please select or enter a Producer / Karigar');
      return;
    }
    if (producerData.producerId === 'new' && !producerData.newProducerName.trim()) {
      alert('Please enter New Producer Name');
      return;
    }

    // Validate that each item has a name, pieces > 0, and grossWeight > 0
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.name.trim()) {
        alert(`Item #${i + 1}: Name is required`);
        return;
      }
      if (!it.pieces || parseInt(it.pieces) <= 0) {
        alert(`Item #${i + 1} (${it.name}): Valid pieces count is required`);
        return;
      }
      if (!it.grossWeight || parseFloat(it.grossWeight) <= 0) {
        alert(`Item #${i + 1} (${it.name}): Gross weight is required`);
        return;
      }
    }

    try {
      const payload = {
        producerId: producerData.producerId,
        newProducerName: producerData.newProducerName,
        newProducerPhone: producerData.newProducerPhone,
        items: items.map(it => {
          const pcs = parseInt(it.pieces);
          const stone = parseFloat(it.stoneWeight || 0);
          return {
            name: it.name,
            stamp: it.stamp && it.stamp.trim() ? it.stamp.trim() : '92.5',
            pieces: pcs,
            grossWeight: parseFloat(it.grossWeight),
            stoneWeight: stone,
            perPieceWeight: pcs > 0 ? parseFloat((stone / pcs).toFixed(3)) : 0,
            netWeight: parseFloat(it.netWeight),
            touch: parseFloat(it.touch || 0)
          };
        })
      };

      const res = await api.post('/billing/wholesale-products', payload);
      if (res.data.success) {
        alert(`${items.length} Product item(s) added successfully!`);
        onAdd();
        // Reset items to 1 empty item
        setItems([
          {
            name: '',
            stamp: '92.5',
            pieces: '',
            grossWeight: '',
            stoneWeight: '',
            netWeight: 0,
            touch: '92.50',
            pureSilver: 0
          }
        ]);
      }
    } catch (e) {
      console.error(e);
      alert('Error adding stock: ' + (e.response?.data?.message || e.message));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PRODUCER SECTION */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Producer / Karigar (उत्पादक / कारागीर) *
              </label>
              <select
                className="w-full border rounded-lg p-2.5 bg-white text-sm focus:ring-2 focus:ring-blue-500"
                value={producerData.producerId}
                onChange={e => setProducerData({ ...producerData, producerId: e.target.value, newProducerName: '' })}
                required
              >
                <option value="">Select Existing Producer...</option>
                {producers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option value="new">+ Add New Producer (नवीन जोडा)</option>
              </select>
            </div>

            {producerData.producerId === 'new' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">New Producer Name *</label>
                  <input
                    type="text"
                    placeholder="Producer Name"
                    className="w-full border rounded-lg p-2.5 border-blue-300 bg-blue-50 text-sm"
                    value={producerData.newProducerName}
                    onChange={e => setProducerData({ ...producerData, newProducerName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="Phone number"
                    className="w-full border rounded-lg p-2.5 border-blue-300 bg-blue-50 text-sm"
                    value={producerData.newProducerPhone}
                    onChange={e => setProducerData({ ...producerData, newProducerPhone: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ITEMS SECTION */}
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
          <div className="px-4 py-3 bg-gray-100 border-b flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <span>📦</span>
              <span>Product Items ({items.length})</span>
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
            >
              <span>➕</span>
              <span>Add Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b text-xs uppercase">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5 min-w-[160px] text-left">Item Name *</th>
                  <th className="p-2.5 w-20 text-center">Stamp</th>
                  <th className="p-2.5 w-24 text-center">Pcs *</th>
                  <th className="p-2.5 w-28 text-center">Gross Wt (g) *</th>
                  <th className="p-2.5 w-28 text-center">Stone Wt (g)</th>
                  <th className="p-2.5 w-28 text-center bg-gray-100">Net Wt (Auto)</th>
                  <th className="p-2.5 w-24 text-center">Touch %</th>
                  <th className="p-2.5 w-28 text-center bg-gray-100">Pure Silver (g)</th>
                  <th className="p-2.5 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-blue-50/20 transition-colors">
                    <td className="p-2 text-center text-gray-500 font-medium text-xs">
                      {index + 1}
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="e.g. Bombay Chain"
                        className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-blue-500"
                        value={item.name}
                        onChange={e => handleItemChange(index, 'name', e.target.value)}
                        required
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="92.5"
                        className="w-full border rounded-lg p-2 text-center text-sm font-semibold text-gray-700"
                        value={item.stamp}
                        onChange={e => handleItemChange(index, 'stamp', e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        className="w-full border rounded-lg p-2 text-center text-sm font-semibold"
                        placeholder="0"
                        value={item.pieces}
                        onChange={e => handleItemChange(index, 'pieces', e.target.value)}
                        required
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        className="w-full border rounded-lg p-2 text-center text-sm"
                        placeholder="0.000"
                        value={item.grossWeight}
                        onChange={e => handleItemChange(index, 'grossWeight', e.target.value)}
                        required
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        className="w-full border rounded-lg p-2 text-center text-sm"
                        placeholder="0.000"
                        value={item.stoneWeight}
                        onChange={e => handleItemChange(index, 'stoneWeight', e.target.value)}
                      />
                    </td>
                    <td className="p-2 bg-gray-50 text-center font-bold text-gray-900">
                      {item.netWeight.toFixed(3)}
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full border rounded-lg p-2 text-center text-blue-600 font-bold text-sm"
                        placeholder="92.50"
                        value={item.touch}
                        onChange={e => handleItemChange(index, 'touch', e.target.value)}
                        required
                      />
                    </td>
                    <td className="p-2 bg-gray-50 text-center font-bold text-purple-700">
                      {item.pureSilver.toFixed(3)}
                    </td>
                    <td className="p-2 text-center">
                      {items.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-full text-red-600 hover:bg-red-100 font-bold transition-colors"
                          title="Remove Item"
                        >
                          ✕
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* SUMMARY TOTAL ROW */}
              <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300 text-gray-800 text-xs">
                <tr>
                  <td colSpan={3} className="p-2.5 text-right uppercase">
                    TOTAL ({items.length} Item{items.length > 1 ? 's' : ''}):
                  </td>
                  <td className="p-2.5 text-center text-blue-700">
                    {totals.pieces} pcs
                  </td>
                  <td className="p-2.5 text-center">
                    {totals.grossWeight.toFixed(3)} g
                  </td>
                  <td className="p-2.5 text-center text-gray-700">
                    {totals.stoneWeight.toFixed(3)} g
                  </td>
                  <td className="p-2.5 bg-gray-200 text-center text-green-700">
                    {totals.netWeight.toFixed(3)} g
                  </td>
                  <td className="p-2.5 text-center text-gray-400">
                    -
                  </td>
                  <td className="p-2.5 bg-gray-200 text-center text-purple-700">
                    {totals.pureSilver.toFixed(3)} g
                  </td>
                  <td className="p-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* BUTTONS: ADD ITEM & SUBMIT */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
          <button
            type="button"
            onClick={addItem}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span className="text-lg">➕</span>
            <span>+ Add Another Item (+ आणखी आयटम जोडा)</span>
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <span>💾</span>
            <span>Save Stock Entry ({items.length} {items.length > 1 ? 'Items' : 'Item'})</span>
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