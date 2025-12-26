import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { generatePDF } from '../../utils/pdfGenerator'; // Use billing PDF

export default function CreateSaleSection({ onSaleCreated, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [wholesaleProducts, setWholesaleProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Add Customer Modal State
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', gstNumber: '' });

  // Form State
  const [formData, setFormData] = useState({
    customerId: '',
    billingType: 'wholesale',
    date: new Date().toISOString().split('T')[0],
    includePreviousDue: true, // DEFAULT TRUE
    notes: ''
  });

  const [items, setItems] = useState([
    {
      productId: '',
      description: '',
      pieces: 1,
      grossWeight: '',
      stoneWeight: 0,
      netWeight: '',
      wastage: 0,
      touch: 92.50,
      laborRatePerKg: 1000,
      stamp: '-'
    }
  ]);

  // Removed Silver Rate State as requested

  // Payment States (Aligned with Regular)
  const [paymentMode, setPaymentMode] = useState('none'); // none, silver, cash, multiple
  const [silverPaymentsList, setSilverPaymentsList] = useState([]);
  const [newSilverPayment, setNewSilverPayment] = useState({
    name: '',
    fromNo: '',
    weight: '',
    touch: '',
    fine: ''
  });

  const [payments, setPayments] = useState({
    cash: '',
    cashForSilver: {
      rate: '',
      weight: ''
    }
  });

  useEffect(() => {
    fetchCustomers();
    fetchWholesaleProducts();
    // Removed fetchSilverRate
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/billing/customers');
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchWholesaleProducts = async () => {
    try {
      const response = await api.get('/billing/wholesale-products');
      if (response.data.success) {
        setWholesaleProducts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleCustomerSelect = (e) => {
    const custId = e.target.value;
    setFormData({ ...formData, customerId: custId });
    const cust = customers.find(c => c.id === parseInt(custId));
    setSelectedCustomer(cust || null);
  };

  // Add Customer Logic
  const handleSaveCustomer = async (e) => {
    if (e) e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) {
      alert('Name and Phone are required');
      return;
    }
    try {
      const response = await api.post('/billing/customers', newCustomer);
      if (response.data.success) {
        const createdCustomer = response.data.data;
        setCustomers([...customers, createdCustomer]); // Add to list
        setFormData({ ...formData, customerId: createdCustomer.id }); // Auto-select
        setSelectedCustomer(createdCustomer);
        setShowAddCustomer(false); // Close modal
        setNewCustomer({ name: '', phone: '', address: '', gstNumber: '' }); // Reset
        alert('Customer added successfully!');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Error adding customer: ' + (error.response?.data?.message || error.message));
    }
  };


  // Item Logic
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;

    // Recalculate if Stock Item & Pieces Changed
    if (field === 'pieces' && updatedItems[index].productId) {
      const product = wholesaleProducts.find(p => p.id === parseInt(updatedItems[index].productId));
      if (product) {
        let inputPcs = parseFloat(value || 0);
        const stockPcs = parseInt(product.pieces || 0);

        // VALIDATION: Ensure Sales Pieces <= Stock Pieces
        if (inputPcs > stockPcs) {
          alert(`Stock only has ${stockPcs} pieces!`);
          inputPcs = stockPcs; // Cap at max
          updatedItems[index][field] = stockPcs; // Reset field in UI
        }

        const stockGross = parseFloat(product.grossWeight || 0);
        const stockNet = parseFloat(product.netWeight || 0);

        if (stockPcs > 0 && inputPcs > 0) {
          const avgGross = stockGross / stockPcs;

          updatedItems[index].grossWeight = (avgGross * inputPcs).toFixed(3);

          const deductionPerPc = parseFloat(product.perPieceWeight || 0);
          updatedItems[index].stoneWeight = (deductionPerPc * inputPcs).toFixed(3);

          updatedItems[index].netWeight = ((avgGross * inputPcs) - (deductionPerPc * inputPcs)).toFixed(3);
        }
      }
    }

    if (field === 'grossWeight' || field === 'stoneWeight') {
      const gross = parseFloat(updatedItems[index].grossWeight) || 0;
      const stone = parseFloat(updatedItems[index].stoneWeight) || 0;
      updatedItems[index].netWeight = (gross - stone).toFixed(3);
    }
    setItems(updatedItems);
  };

  const handleProductSelect = (index, productId) => {
    const product = wholesaleProducts.find(p => p.id === parseInt(productId));
    const updatedItems = [...items];
    updatedItems[index].productId = productId;

    if (product) {
      updatedItems[index].description = product.name;

      const stockPcs = parseInt(product.pieces || 1);
      const inputPcs = parseFloat(updatedItems[index].pieces || 1);

      if (stockPcs > 0) {
        const avgGross = parseFloat(product.grossWeight) / stockPcs;
        const deductionPerPc = parseFloat(product.perPieceWeight || 0);

        updatedItems[index].grossWeight = (avgGross * inputPcs).toFixed(3);
        updatedItems[index].stoneWeight = (deductionPerPc * inputPcs).toFixed(3);
        updatedItems[index].netWeight = ((avgGross * inputPcs) - (deductionPerPc * inputPcs)).toFixed(3);
      } else {
        // Fallback if pieces is 0 (shouldn't happen for valid stock)
        updatedItems[index].grossWeight = product.grossWeight;
        updatedItems[index].netWeight = product.netWeight;
      }

      updatedItems[index].touch = product.touch;
      updatedItems[index].wastage = 0;
    }
    setItems(updatedItems);
  };

  const addItem = () => {
    setItems([...items, {
      productId: '',
      description: '',
      pieces: 1,
      grossWeight: '',
      stoneWeight: 0,
      netWeight: '',
      wastage: 0,
      touch: 92.50,
      laborRatePerKg: 1000,
      stamp: '-'
    }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Payment Logic
  const handleNewSilverPaymentChange = (field, value) => {
    const updated = { ...newSilverPayment, [field]: value };
    if (field === 'weight' || field === 'touch') {
      const w = parseFloat(updated.weight || 0);
      const t = parseFloat(updated.touch || 0);
      updated.fine = ((w * t) / 100).toFixed(3);
    }
    setNewSilverPayment(updated);
  };

  const addSilverPayment = () => {
    if (!newSilverPayment.weight || !newSilverPayment.touch) return;
    setSilverPaymentsList([...silverPaymentsList, newSilverPayment]);
    setNewSilverPayment({ name: '', fromNo: '', weight: '', touch: '', fine: '' });
  };

  const removeSilverPayment = (index) => {
    setSilverPaymentsList(silverPaymentsList.filter((_, i) => i !== index));
  };


  // Calculations
  const calculateTotals = () => {
    let totalNetWeight = 0;
    let totalWastage = 0;
    let totalSilverWeight = 0;
    let totalLabor = 0;
    let subtotal = 0;

    items.forEach(item => {
      const net = parseFloat(item.netWeight) || 0;
      const wastage = parseFloat(item.wastage) || 0;
      const touch = parseFloat(item.touch) || 0;
      const laborRate = parseFloat(item.laborRatePerKg) || 0;
      const gross = parseFloat(item.grossWeight) || 0;

      const silver = ((touch + wastage) * net) / 100;
      // Formula: Labor = Gross * Rate / 1000
      const labor = (gross / 1000) * laborRate;

      // Rate removed. Amount is just labor.
      const amount = labor;

      totalNetWeight += net;
      totalWastage += wastage;
      totalSilverWeight += silver;
      totalLabor += labor;
      subtotal += amount;
    });

    // GST (Default 0 for Regular Style Wholesale)
    let cgst = 0;
    let sgst = 0;
    const totalAmount = subtotal + cgst + sgst;

    // Payments
    let paidSilver = 0; // In grams
    silverPaymentsList.forEach(p => paidSilver += parseFloat(p.fine || 0));

    // Cash Paid
    let paidAmount = parseFloat(payments.cash || 0);

    // Cash For Silver Calculation
    const paidSilverValue = (parseFloat(payments.cashForSilver.rate || 0) * parseFloat(payments.cashForSilver.weight || 0));
    // FIX: Do NOT add 'paidSilverValue' to 'paidAmount' (Cash for Silver does NOT offset Labor Due)
    // paidAmount += paidSilverValue; 

    // Previous Due (Split)
    let prevLabor = 0;
    let prevSilver = 0;
    if (selectedCustomer && formData.includePreviousDue) {
      prevLabor = parseFloat(selectedCustomer.balanceLabor || 0);
      prevSilver = parseFloat(selectedCustomer.balanceSilver || 0);
    }

    // Bill Total (Current + Previous)
    const billTotalLabor = parseFloat(totalAmount) + prevLabor;
    const billTotalSilver = totalSilverWeight + prevSilver;

    // Balance
    const balanceLabor = billTotalLabor - paidAmount;

    // Balance Silver
    const c4sWeight = parseFloat(payments.cashForSilver.weight || 0);
    // FIX: Cash for Silver REDUCES Silver Balance (It is a sale of silver)
    const balanceSilver = billTotalSilver - paidSilver - c4sWeight;

    return {
      totalNetWeight: totalNetWeight.toFixed(3),
      totalSilverWeight: totalSilverWeight.toFixed(3),
      subtotal: subtotal.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      paidSilver: paidSilver.toFixed(3),
      paidAmount: paidAmount.toFixed(2),

      prevLabor: prevLabor.toFixed(2),
      prevSilver: prevSilver.toFixed(3),
      billTotalLabor: billTotalLabor.toFixed(2),
      billTotalSilver: billTotalSilver.toFixed(3),

      balanceLabor: balanceLabor.toFixed(2),
      balanceSilver: balanceSilver.toFixed(3),
      cashForSilverValue: paidSilverValue.toFixed(2)
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Construct Payload
      const payload = {
        customerId: formData.customerId,
        billingType: formData.billingType,
        items: items,
        silverRate: 0, // No Rate
        paidAmount: payments.cash || 0, // Cash payment
        paidSilver: totals.paidSilver,  // Total Fine Silver
        gstApplicable: false, // Force False logic
        notes: formData.notes,
        paymentDetails: {
          silverPayments: silverPaymentsList,
          cashPayment: payments.cash,
          cashForSilver: payments.cashForSilver
        }
      };

      // Append detailed payment info to notes if silver payments exist
      if (silverPaymentsList.length > 0) {
        let paymentNote = `\n[Silver Payments]:\n`;
        silverPaymentsList.forEach(p => {
          paymentNote += `- ${p.weight}g @ ${p.touch}% = ${p.fine}g (Ref: ${p.fromNo})\n`;
        });
        payload.notes += paymentNote;
      }

      const response = await api.post('/billing/sales', payload);
      if (response.data.success) {
        alert('Sale Created Successfully!');
        if (onSaleCreated) onSaleCreated();
        // Generate PDF
        try {
          generatePDF(response.data.data);
        } catch (e) {
          console.error("PDF Gen Error", e);
        }
      }
    } catch (error) {
      console.error('Create sale error:', error);
      alert('Error creating sale: ' + (error.response?.data?.error || error.message)); // improved error alert
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Create New Sale</h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TOP SECTION: Customer  */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">Customer</label>
            <div className="flex gap-2">
              <select
                value={formData.customerId}
                onChange={handleCustomerSelect}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddCustomer(true)}
                className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                title="Add New Customer"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input type="date" value={formData.date} disabled className="w-full p-2 border rounded bg-gray-50" />
          </div>
          {/* Silver Rate Input REMOVED */}
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer bg-blue-50 px-3 py-2 rounded border border-blue-100">
            <input
              type="checkbox"
              checked={formData.includePreviousDue}
              onChange={e => setFormData({ ...formData, includePreviousDue: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Include Previous Balance</span>
          </label>
        </div>

        {/* ITEMS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 w-[180px]">Description</th>
                <th className="border p-2 w-[60px]">Stamp</th>
                <th className="border p-2 w-[50px]">Pcs</th>
                <th className="border p-2">Gross Wt</th>
                <th className="border p-2">Stone Wt</th>
                <th className="border p-2 bg-gray-50">Net Wt</th>
                <th className="border p-2">Wastage</th>
                <th className="border p-2">Touch %</th>
                <th className="border p-2">Labor /kg</th>
                <th className="border p-2 text-right">Silver</th>
                <th className="border p-2 text-right">Labor Amt</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="border p-1">
                    <input
                      list="wholesale-products"
                      type="text"
                      value={item.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleItemChange(index, 'description', val);
                        // Auto-fill from Product List
                        const matchedProduct = wholesaleProducts.find(p => p.name.toLowerCase() === val.toLowerCase());
                        if (matchedProduct) {
                          handleProductSelect(index, matchedProduct.id);
                        }
                      }}
                      className="w-full p-1 border rounded text-xs"
                      placeholder="Description"
                    />
                  </td>
                  <td className="border p-1">
                    <input type="text" value={item.stamp} onChange={(e) => handleItemChange(index, 'stamp', e.target.value)} className="w-full p-1 border rounded text-xs" placeholder="-" />
                  </td>
                  <td className="border p-1">
                    <input type="number" value={item.pieces} onChange={(e) => handleItemChange(index, 'pieces', e.target.value)} className="w-full p-1 border rounded text-xs" />
                  </td>
                  <td className="border p-1">
                    <input type="number" step="0.001" value={item.grossWeight} onChange={(e) => handleItemChange(index, 'grossWeight', e.target.value)} className="w-full p-1 border rounded text-xs" />
                  </td>
                  <td className="border p-1">
                    <input type="number" step="0.001" value={item.stoneWeight} onChange={(e) => handleItemChange(index, 'stoneWeight', e.target.value)} className="w-full p-1 border rounded text-xs" />
                  </td>
                  <td className="border p-1 bg-gray-50">
                    <input type="number" value={item.netWeight} readOnly className="w-full p-1 border-none bg-transparent font-semibold text-xs" />
                  </td>
                  <td className="border p-1">
                    <input type="number" step="0.001" value={item.wastage} onChange={(e) => handleItemChange(index, 'wastage', e.target.value)} className="w-full p-1 border rounded text-xs" />
                  </td>
                  <td className="border p-1">
                    <input type="number" step="0.01" value={item.touch} onChange={(e) => handleItemChange(index, 'touch', e.target.value)} className="w-full p-1 border rounded text-xs" />
                  </td>
                  <td className="border p-1">
                    <input type="number" value={item.laborRatePerKg} onChange={(e) => handleItemChange(index, 'laborRatePerKg', e.target.value)} className="w-full p-1 border rounded text-xs" />
                  </td>
                  <td className="border p-1 text-right text-gray-600 text-xs">
                    {(((parseFloat(item.touch) + parseFloat(item.wastage)) * parseFloat(item.netWeight)) / 100).toFixed(2)}
                  </td>
                  <td className="border p-1 text-right font-medium text-xs">
                    {(parseFloat(item.grossWeight) / 1000 * parseFloat(item.laborRatePerKg)).toFixed(0)}
                  </td>
                  <td className="border p-1 text-center">
                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 font-bold">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* TABLE FOOTER (TOTALS & PREV DUE) */}
            <tfoot className="border-t-2 border-gray-300">
              {/* TOTAL ROW */}
              <tr className="bg-gray-100 font-bold">
                <td className="border p-1 text-right" colSpan={3}>
                  TOTAL
                </td>
                <td className="border p-1 text-right">
                  {/* Gross Wt Total not tracked in state, but Regular has it. Calculated on fly for now or unused */}
                  -
                </td>
                <td className="border p-1 text-right">
                  -
                </td>
                <td className="border p-1 bg-gray-100">
                  {totals.totalNetWeight}
                </td>
                <td className="border p-1" />
                <td className="border p-1" />
                <td className="border p-1" />
                <td className="border p-1 text-right">
                  {totals.totalSilverWeight}
                </td>
                <td className="border p-1 text-right">
                  {totals.subtotal}
                </td>
                <td className="border p-1" />
              </tr>

              {/* PREVIOUS DUE ROW */}
              {formData.includePreviousDue && (
                <tr className="bg-yellow-50 font-semibold text-yellow-800">
                  <td className="border p-1 text-right" colSpan={9}>
                    Previous Due
                  </td>
                  <td className="border p-1 text-right">
                    {totals.prevSilver}
                  </td>
                  <td className="border p-1 text-right">
                    {totals.prevLabor}
                  </td>
                  <td className="border p-1" />
                </tr>
              )}
            </tfoot>
          </table>
          <button type="button" onClick={addItem} className="mt-2 text-sm text-blue-600 font-semibold hover:underline">+ Add Item</button>
        </div>

        {/* PAYMENT SECTION (Style from RegularCreate) */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Payment & Settlement</h3>

          <div className="flex gap-2 mb-4">
            {['none', 'silver', 'cash', 'cashsilver', 'multiple'].map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMode(mode)}
                className={`px-3 py-1 rounded capitalize ${paymentMode === mode ? 'bg-blue-600 text-white shadow' : 'bg-white border hover:bg-gray-50'}`}
              >
                {mode === 'cash' ? 'Labor Payment' : mode === 'cashsilver' ? 'Cash for Silver' : mode}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {paymentMode !== 'none' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">

                {/* SILVER PAYMENT UI */}
                {(paymentMode === 'silver' || paymentMode === 'multiple') && (
                  <div className="bg-orange-50 p-4 rounded border border-orange-200">
                    <h4 className="font-bold text-orange-800 text-sm mb-2">Detailed Silver Payment</h4>
                    {silverPaymentsList.map((sp, i) => (
                      <div key={i} className="flex justify-between items-center text-xs bg-white p-2 rounded mb-1 border">
                        <span>{sp.name} (Ref: {sp.fromNo})</span>
                        <span className="font-mono">{sp.weight}g x {sp.touch}% = <b>{sp.fine}g</b></span>
                        <button type="button" onClick={() => removeSilverPayment(i)} className="text-red-500 font-bold">×</button>
                      </div>
                    ))}
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      <input placeholder="Name" className="p-1 text-sm border rounded" value={newSilverPayment.name} onChange={e => setNewSilverPayment({ ...newSilverPayment, name: e.target.value })} />
                      <input placeholder="Ref No" className="p-1 text-sm border rounded" value={newSilverPayment.fromNo} onChange={e => setNewSilverPayment({ ...newSilverPayment, fromNo: e.target.value })} />
                      <input placeholder="Weight" type="number" className="p-1 text-sm border rounded" value={newSilverPayment.weight} onChange={e => handleNewSilverPaymentChange('weight', e.target.value)} />
                      <input placeholder="Touch" type="number" className="p-1 text-sm border rounded" value={newSilverPayment.touch} onChange={e => handleNewSilverPaymentChange('touch', e.target.value)} />
                      <button type="button" onClick={addSilverPayment} className="bg-orange-600 text-white rounded px-2 font-bold">+</button>
                    </div>
                    <div className="text-right mt-2 text-sm font-bold text-orange-700">
                      Total Silver Paid: {totals.paidSilver} g
                    </div>
                  </div>
                )}

                {/* CASH PAYMENT UI */}
                {(paymentMode === 'cash' || paymentMode === 'multiple') && (
                  <div className="bg-green-50 p-4 rounded border border-green-200">
                    <label className="block text-sm font-bold text-green-800 mb-1">Cash / Bank Received (₹)</label>
                    <input
                      type="number"
                      value={payments.cash}
                      onChange={e => setPayments({ ...payments, cash: e.target.value })}
                      className="w-full p-2 border rounded font-bold text-lg"
                      placeholder="0.00"
                    />
                  </div>
                )}

                {/* CASH FOR SILVER UI */}
                {(paymentMode === 'cashsilver' || paymentMode === 'multiple') && (
                  <div className="bg-white p-4 rounded border border-green-200 mt-2">
                    <h4 className="font-semibold text-green-700 mb-2">Cash for Silver</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600">Rate (₹/g)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={payments.cashForSilver.rate}
                          onChange={e => setPayments({ ...payments, cashForSilver: { ...payments.cashForSilver, rate: e.target.value } })}
                          className="w-full p-2 border rounded-lg text-sm"
                          placeholder="Rate"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">Weight (g)</label>
                        <input
                          type="number"
                          step="0.001"
                          value={payments.cashForSilver.weight}
                          onChange={e => setPayments({ ...payments, cashForSilver: { ...payments.cashForSilver, weight: e.target.value } })}
                          className="w-full p-2 border rounded-lg text-sm"
                          placeholder="Weight"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* NOTES & SUMMARY */}
        <div className="bg-gradient-to-r from-orange-50 to-purple-50 p-6 rounded-lg border-2 border-orange-300">
          <h3 className="text-lg font-bold mb-4 text-gray-800">
            Summary
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Total Silver Weight
                </span>
                <span className="font-semibold text-orange-600">
                  {totals.totalSilverWeight} g
                </span>
              </div>
              {formData.includePreviousDue && (
                <div className="flex justify-between text-gray-600">
                  <span className="text-xs">+ Prev Silver</span>
                  <span>{totals.prevSilver} g</span>
                </div>
              )}
              <div className="flex justify-between border-t border-dashed pt-1 font-bold text-blue-800">
                <span>Total Silver Due</span>
                <span>{totals.billTotalSilver} g</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>- Paid Silver</span>
                <span className="font-bold">{totals.paidSilver} g</span>
              </div>
              {/* Cash For Silver Deduction from Silver Balance */}
              {(parseFloat(totals.cashForSilverValue || 0) > 0) && (
                <div className="flex justify-between text-green-600 text-xs">
                  <span>- CashForSilver Wt</span>
                  <span>{payments.cashForSilver.weight} g</span>
                </div>
              )}
              <div className="flex justify-between text-red-600 font-bold border-t pt-2 text-lg">
                <span>Bal. Silver</span>
                <span>{totals.balanceSilver} g</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Labor Amt</span>
                <span className="font-bold">₹{totals.subtotal}</span>
              </div>
              {formData.includePreviousDue && (
                <div className="flex justify-between text-gray-600">
                  <span className="text-xs">+ Prev Labor</span>
                  <span>₹{totals.prevLabor}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-dashed pt-1 font-bold text-blue-800">
                <span>Total Labor Due</span>
                <span>₹{totals.billTotalLabor}</span>
              </div>
              <div className="flex justify-between text-green-600 font-bold">
                <span>- Paid Cash</span>
                <span>₹{totals.paidAmount}</span>
              </div>
              <div className="flex justify-between text-red-600 font-bold border-t pt-2 text-lg">
                <span>Bal. Labor</span>
                <span>₹{totals.balanceLabor}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold text-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transform transition hover:scale-[1.01]"
        >
          {loading ? 'Creating Sale...' : 'Finalize Sale'}
        </button>

      </form>

      {/* ADD CUSTOMER MODAL */}
      <AnimatePresence>
        {showAddCustomer && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-lg p-6 w-96 shadow-xl m-4"
            >
              <h3 className="text-lg font-bold mb-4">Add New Customer</h3>
              <div className="space-y-3">
                <input
                  placeholder="Full Name *"
                  className="w-full p-2 border rounded"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                />
                <input
                  placeholder="Phone Number *"
                  className="w-full p-2 border rounded"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                />
                <textarea
                  placeholder="Address"
                  className="w-full p-2 border rounded"
                  value={newCustomer.address}
                  onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                />
                <input
                  placeholder="GST Number"
                  className="w-full p-2 border rounded"
                  value={newCustomer.gstNumber}
                  onChange={e => setNewCustomer({ ...newCustomer, gstNumber: e.target.value })}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowAddCustomer(false)} className="px-3 py-1 text-gray-600">Cancel</button>
                  <button onClick={handleSaveCustomer} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <datalist id="wholesale-products">
        {wholesaleProducts.map(p => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>
    </div>
  );
}
