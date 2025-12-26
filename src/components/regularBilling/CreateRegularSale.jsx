import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { generateRegularPDF } from '../../utils/regularPdfGenerator';

const ITEM_DESCRIPTIONS = [
  "MASA", "GAI-VASRU", "GHODA", "GHUBAD", "KASAV",
  "VAR-SONDH HATTI", "KHALI-SONDH HATTI", "POPAT", "MOR", "BADAK",
  "SINHA", "KHARU-TAI", "PALNA", "GANESH-LAXMI", "GANESH", "LAXMI",
  "SAKLI CHUM-CHUM", "GUN-MALA", "RUPALI", "RUPALI-NAKEVALI",
  "PATT CHUM-CHUM", "GAJSHRI NAKEVALI", "CHATTI PAINJAIN",
  "TOD-VAL", "NAKEVALI VAL", "CHUM-CHUM VAL",
  "PAIP CHUM-CHUM VAL", "PAIP-NAKEVALI VAL", "SUT-JALI VAL"
];

export default function CreateRegularSale({
  onSaleCreated,
  editSale = null,
  onCancelEdit = null
}) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: ''
  });

  const [formData, setFormData] = useState({
    regularCustomerId: '',
    includePreviousDue: true,
    notes: ''
  });

  const [items, setItems] = useState([
    {
      description: '',
      stamp: '-',
      pieces: 1,
      grossWeight: '',
      stoneWeight: 0,
      netWeight: '',
      wastage: 0,
      touch: 13.0,
      laborRatePerKg: 500
    }
  ]);

  // Previous due (all pending silver and labor)
  const [previousDue, setPreviousDue] = useState({
    totalPendingSilver: 0,
    totalPendingLabor: 0
  });

  // Payment states
  const [paymentMode, setPaymentMode] = useState('none');

  // Silver Payments List
  const [silverPaymentsList, setSilverPaymentsList] = useState([]);
  const [newSilverPayment, setNewSilverPayment] = useState({
    name: '',
    fromNo: '',
    weight: '',
    touch: '',
    fine: ''
  });

  const [payments, setPayments] = useState({
    physicalSilver: { // Keeping for safety/legacy but mainly using list now
      name: '',
      fromNo: '',
      weight: '',
      touch: '',
      fine: ''
    },
    cashForSilver: {
      rate: '',
      weight: ''
    },
    labor: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (editSale && customers.length > 0) {
      setFormData({
        regularCustomerId: String(editSale.regularCustomerId),
        includePreviousDue: editSale.includePreviousDue || false,
        notes: editSale.notes || ''
      });

      setItems(
        editSale.items.map(item => ({
          description: item.description,
          stamp: item.stamp || '-',
          pieces: item.pieces,
          grossWeight: item.grossWeight,
          stoneWeight: item.stoneWeight,
          netWeight: item.netWeight,
          wastage: item.wastage,
          touch: item.touch,
          laborRatePerKg: item.laborRatePerKg
        }))
      );

      const customer = customers.find(
        c => c.id === editSale.regularCustomerId
      );
      setSelectedCustomer(customer || editSale.customer || null);

      let dynamicPrevSilver = 0;
      let dynamicPrevLabor = 0;

      if (customer) {
        dynamicPrevSilver = parseFloat(customer.balanceSilver || 0) - parseFloat(editSale.balanceSilver || 0);
        dynamicPrevLabor = parseFloat(customer.balanceLabor || 0) - parseFloat(editSale.balanceLabor || 0);
      } else {
        dynamicPrevSilver = parseFloat(editSale.previousBalanceSilver || 0);
        dynamicPrevLabor = parseFloat(editSale.previousBalanceLabor || 0);
      }

      setPreviousDue({
        totalPendingSilver: dynamicPrevSilver,
        totalPendingLabor: dynamicPrevLabor
      });
    }
  }, [editSale, customers]);

  const fetchCustomers = async (search = '') => {
    try {
      const response = await api.get(
        `/regular-billing/customers?search=${search}&limit=100`
      );
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchPreviousDue = async customerId => {
    try {
      const res = await api.get(
        `/regular-billing/customers/${customerId}/ledger`
      );
      if (res.data.success) {
        const txns = res.data.data.transactions || [];
        if (txns.length > 0) {
          const last = txns[txns.length - 1];
          setPreviousDue({
            totalPendingSilver: parseFloat(last.balanceSilverAfter || 0),
            totalPendingLabor: parseFloat(last.balanceLaborAfter || 0)
          });
        } else {
          const c = res.data.data.customer;
          setPreviousDue({
            totalPendingSilver: parseFloat(c.balanceSilver || 0),
            totalPendingLabor: parseFloat(c.balanceLabor || 0)
          });
        }
      }
    } catch (e) {
      console.error('Error fetching previous due:', e);
      setPreviousDue({ totalPendingSilver: 0, totalPendingLabor: 0 });
    }
  };

  const handleCustomerSelect = customerId => {
    const customer = customers.find(c => c.id === parseInt(customerId));
    setSelectedCustomer(customer || null);
    setFormData(prev => ({ ...prev, regularCustomerId: customerId }));
    if (customerId) {
      fetchPreviousDue(customerId);
    } else {
      setPreviousDue({ totalPendingSilver: 0, totalPendingLabor: 0 });
    }
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert('Customer name is required');
      return;
    }

    try {
      const response = await api.post('/regular-billing/customers', {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        address: newCustomer.address.trim()
      });

      if (response.data.success) {
        const addedCustomer = response.data.data;
        alert(`Customer ${addedCustomer.name} added successfully!`);
        setNewCustomer({ name: '', phone: '', address: '' });
        setShowAddCustomerModal(false);

        const updatedResponse = await api.get(
          '/regular-billing/customers?limit=100'
        );
        if (updatedResponse.data.success) {
          setCustomers(updatedResponse.data.data);
        }

        setFormData(prev => ({
          ...prev,
          regularCustomerId: String(addedCustomer.id)
        }));
        setSelectedCustomer(addedCustomer);
        fetchPreviousDue(addedCustomer.id);
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      if (error.response?.status === 409) {
        alert('Customer already exists! Please select from the dropdown.');
        setShowAddCustomerModal(false);
        if (error.response?.data?.data) {
          const existingCustomer = error.response.data.data;
          setFormData(prev => ({
            ...prev,
            regularCustomerId: String(existingCustomer.id)
          }));
          setSelectedCustomer(existingCustomer);
          fetchPreviousDue(existingCustomer.id);
        }
      } else {
        alert(
          'Error adding customer: ' +
          (error.response?.data?.message || error.message)
        );
      }
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;

    if (field === 'grossWeight' || field === 'stoneWeight') {
      const grossWeight = parseFloat(updatedItems[index].grossWeight) || 0;
      const stoneWeight = parseFloat(updatedItems[index].stoneWeight) || 0;
      updatedItems[index].netWeight = (grossWeight - stoneWeight).toFixed(3);
    }

    setItems(updatedItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        description: '',
        stamp: '-',
        pieces: 1,
        grossWeight: '',
        stoneWeight: 0,
        netWeight: '',
        wastage: 0,
        touch: 13.0,
        laborRatePerKg: 500
      }
    ]);
  };

  const removeItem = index => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

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


  const calculateTotals = () => {
    let totalNetWeight = 0;
    let totalWastage = 0;
    let totalSilverWeight = 0;
    let totalLabor = 0;
    let totalGross = 0;
    let totalStone = 0;

    items.forEach(item => {
      const grossWeight = parseFloat(item.grossWeight) || 0;
      const stoneWeight = parseFloat(item.stoneWeight) || 0;
      const netWeight = parseFloat(item.netWeight) || 0;
      const wastage = parseFloat(item.wastage) || 0;
      const touch = parseFloat(item.touch) || 0;
      const laborRate = parseFloat(item.laborRatePerKg) || 0;

      const silverWeight = ((touch + wastage) * netWeight) / 100;
      const labor = (netWeight * laborRate) / 1000;

      totalGross += grossWeight;
      totalStone += stoneWeight;
      totalNetWeight += netWeight;
      totalWastage += wastage;
      totalSilverWeight += silverWeight;
      totalLabor += labor;
    });

    let balanceSilver = totalSilverWeight;
    let balanceLabor = totalLabor;

    let prevSilver = 0;
    let prevLabor = 0;
    if (formData.includePreviousDue && selectedCustomer) {
      prevSilver = previousDue.totalPendingSilver;
      prevLabor = previousDue.totalPendingLabor;
      balanceSilver += prevSilver;
      balanceLabor += prevLabor;
    }

    let paidSilver = 0;
    let paidLabor = 0;

    if (paymentMode === 'silver' || paymentMode === 'multiple') {
      silverPaymentsList.forEach(sp => {
        paidSilver += parseFloat(sp.fine || 0);
      });
    }

    if (paymentMode === 'cashsilver' || paymentMode === 'multiple') {
      paidSilver += parseFloat(payments.cashForSilver.weight || 0);
    }

    if (paymentMode === 'labor' || paymentMode === 'multiple') {
      paidLabor += parseFloat(payments.labor || 0);
    }

    balanceSilver -= paidSilver;
    balanceLabor -= paidLabor;

    const cashAmount =
      (parseFloat(payments.cashForSilver.rate || 0) *
        parseFloat(payments.cashForSilver.weight || 0)).toFixed(2);

    return {
      totalGross: totalGross.toFixed(3),
      totalStone: totalStone.toFixed(3),
      totalNetWeight: totalNetWeight.toFixed(3),
      totalWastage: totalWastage.toFixed(3),
      totalSilverWeight: totalSilverWeight.toFixed(3),
      totalLabor: totalLabor.toFixed(2),
      prevSilver: prevSilver.toFixed(3),
      prevLabor: prevLabor.toFixed(2),
      paidSilver: paidSilver.toFixed(3),
      paidLabor: paidLabor.toFixed(2),
      balanceSilver: balanceSilver.toFixed(3),
      balanceLabor: balanceLabor.toFixed(2),
      cashAmount
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.regularCustomerId) {
      alert('Please select a customer');
      return;
    }

    if (items.some(item => !item.description || !item.grossWeight)) {
      alert('Please fill all item details');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        regularCustomerId: formData.regularCustomerId,
        items: items.map(item => ({
          description: item.description,
          stamp: item.stamp && item.stamp.trim() ? item.stamp.trim() : '-',
          pieces: item.pieces,
          grossWeight: parseFloat(item.grossWeight),
          stoneWeight: parseFloat(item.stoneWeight || 0),
          netWeight: parseFloat(item.netWeight || 0),
          wastage: parseFloat(item.wastage || 0),
          touch: parseFloat(item.touch || 0),
          laborRatePerKg: parseFloat(item.laborRatePerKg || 0)
        })),
        includePreviousDue: formData.includePreviousDue,
        notes: formData.notes,
        paymentMode,
        payments: {
          silverPayments: silverPaymentsList.map(sp => ({
            ...sp,
            weight: parseFloat(sp.weight),
            point: parseFloat(sp.touch), // Ensure consistency
            fine: parseFloat(sp.fine)
          })),
          cashForSilver: {
            rate: parseFloat(payments.cashForSilver.rate || 0),
            weight: parseFloat(payments.cashForSilver.weight || 0)
          },
          labor: parseFloat(payments.labor || 0)
        }
      };

      let response;
      if (editSale) {
        response = await api.put(
          `/regular-billing/sales/${editSale.id}`,
          payload
        );
      } else {
        response = await api.post('/regular-billing/sales', payload);
      }

      if (response.data.success) {
        const savedSale = response.data.data;
        alert(editSale ? 'Sale updated successfully!' : 'Sale created successfully!');
        // Auto-generate PDF
        generateRegularPDF(savedSale);

        setFormData({
          regularCustomerId: '',
          includePreviousDue: true,
          notes: ''
        });
        setItems([
          {
            description: '',
            stamp: '-',
            pieces: 1,
            grossWeight: '',
            stoneWeight: 0,
            netWeight: '',
            wastage: 0,
            touch: 13.0,
            laborRatePerKg: 500
          }
        ]);
        setSelectedCustomer(null);
        setPreviousDue({ totalPendingSilver: 0, totalPendingLabor: 0 });
        setPaymentMode('none');
        setSilverPaymentsList([]);
        setPayments({
          physicalSilver: {
            name: '',
            fromNo: '',
            weight: '',
            touch: '',
            fine: ''
          },
          cashForSilver: {
            rate: '',
            weight: ''
          },
          labor: ''
        });
        if (onSaleCreated) onSaleCreated();
      }
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {editSale ? 'Edit Sale' : 'Create New Sale'}
          </h2>
          {editSale && onCancelEdit && (
            <button
              onClick={onCancelEdit}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Back to List
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CUSTOMER SELECTION */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Customer
              </label>
              <select
                value={formData.regularCustomerId}
                onChange={e => handleCustomerSelect(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">-- Select Customer --</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.phone ? ` (${customer.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add New Customer
              </button>
            </div>
          </div>

          {selectedCustomer && (
            <div className="bg-gray-50 p-3 rounded border">
              <span className="font-bold">{selectedCustomer.name}</span>
              {selectedCustomer.address && <span className="text-gray-600 ml-2">({selectedCustomer.address})</span>}
            </div>
          )}

          {/* ITEMS TABLE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Item
              </button>
            </div>
            <div className="overflow-x-auto">
              <datalist id="item-descriptions">
                {ITEM_DESCRIPTIONS.map((desc, i) => (
                  <option key={i} value={desc} />
                ))}
              </datalist>
              <table className="w-full border text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">Description</th>
                    <th className="border p-2">Stamp</th>
                    <th className="border p-2">Pcs</th>
                    <th className="border p-2">Gross (g)</th>
                    <th className="border p-2">Stone (g)</th>
                    <th className="border p-2">Net (g)</th>
                    <th className="border p-2">Touch %</th>
                    <th className="border p-2">Wastage (g)</th>
                    <th className="border p-2">Labor /kg</th>
                    <th className="border p-2 text-right">Silver (g)</th>
                    <th className="border p-2 text-right">Labor Amt</th>
                    <th className="border p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const grossWeight =
                      parseFloat(item.grossWeight) || 0;
                    const stoneWeight =
                      parseFloat(item.stoneWeight) || 0;
                    const netWeight =
                      parseFloat(item.netWeight || grossWeight - stoneWeight) ||
                      0;
                    const wastage = parseFloat(item.wastage) || 0;
                    const touch = parseFloat(item.touch) || 0;
                    const laborRate =
                      parseFloat(item.laborRatePerKg) || 0;
                    const silverWeight =
                      ((touch + wastage) * netWeight) / 100;
                    const laborAmount =
                      (netWeight * laborRate) / 1000;

                    return (
                      <tr key={index}>
                        <td className="border p-1">
                          <input
                            list="item-descriptions"
                            type="text"
                            value={item.description}
                            onChange={e =>
                              handleItemChange(
                                index,
                                'description',
                                e.target.value
                              )
                            }
                            className="w-full p-1 border rounded text-xs"
                            placeholder="Item name"
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            type="text"
                            value={item.stamp}
                            onChange={e =>
                              handleItemChange(
                                index,
                                'stamp',
                                e.target.value
                              )
                            }
                            className="w-full p-1 border rounded text-xs"
                            placeholder="-"
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            type="number"
                            value={item.pieces}
                            onChange={e =>
                              handleItemChange(
                                index,
                                'pieces',
                                e.target.value
                              )
                            }
                            className="w-full p-1 border rounded text-xs"
                            min="1"
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            type="number"
                            step="0.001"
                            value={item.grossWeight}
                            onChange={e =>
                              handleItemChange(
                                index,
                                'grossWeight',
                                e.target.value
                              )
                            }
                            className="w-full p-1 border rounded text-xs"
                            placeholder="0.000"
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            type="number"
                            step="0.001"
                            value={item.stoneWeight}
                            onChange={e =>
                              handleItemChange(
                                index,
                                'stoneWeight',
                                e.target.value
                              )
                            }
                            className="w-full p-1 border rounded text-xs"
                            placeholder="0.000"
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            type="number"
                            step="0.001"
                            value={netWeight.toFixed(3)}
                            readOnly
                            className="w-full p-1 border rounded text-xs bg-gray-50"
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            type="number"
                            step="0.01"
                            value={item.touch}
                            onChange={e =>
                              handleItemChange(
                                index,
                                'touch',
                                e.target.value
                              )
                            }
                            className="w-full p-1 border rounded text-xs"
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            type="number"
                            step="0.001"
                            value={item.wastage}
                            onChange={e =>
                              handleItemChange(
                                index,
                                'wastage',
                                e.target.value
                              )
                            }
                            className="w-full p-1 border rounded text-xs"
                            placeholder="0.000"
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            type="number"
                            step="1"
                            value={item.laborRatePerKg}
                            onChange={e =>
                              handleItemChange(
                                index,
                                'laborRatePerKg',
                                e.target.value
                              )
                            }
                            className="w-full p-1 border rounded text-xs"
                          />
                        </td>
                        <td className="border p-1 text-right">
                          {silverWeight.toFixed(3)}
                        </td>
                        <td className="border p-1 text-right">
                          {laborAmount.toFixed(2)}
                        </td>
                        <td className="border p-1 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded hover:bg-red-50"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* TOTAL ROW */}
                  <tr className="bg-gray-100 font-bold">
                    <td className="border p-1 text-right" colSpan={3}>
                      TOTAL
                    </td>
                    <td className="border p-1 text-right">
                      {totals.totalGross}
                    </td>
                    <td className="border p-1 text-right">
                      {totals.totalStone}
                    </td>
                    <td className="border p-1 text-right">
                      {totals.totalNetWeight}
                    </td>
                    <td className="border p-1" />
                    <td className="border p-1" />
                    <td className="border p-1" />
                    <td className="border p-1 text-right">
                      {totals.totalSilverWeight}
                    </td>
                    <td className="border p-1 text-right">
                      {totals.totalLabor}
                    </td>
                    <td className="border p-1" />
                  </tr>


                  {/* PREVIOUS DUE ROW (Inside Table) */}
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

                </tbody>
              </table>
            </div>
          </motion.div>

          {/* PAYMENT SECTION */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-2 border-green-300"
          >
            <h3 className="text-lg font-bold mb-4 text-gray-800">
              Payment (Optional)
            </h3>

            <div className="grid grid-cols-5 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setPaymentMode('none')}
                className={`py-2 px-1 rounded-lg font-semibold text-sm transition-all ${paymentMode === 'none'
                  ? 'bg-gray-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                No Payment
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('silver')}
                className={`py-2 px-1 rounded-lg font-semibold text-sm transition-all ${paymentMode === 'silver'
                  ? 'bg-orange-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                Silver Payment
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('cashsilver')}
                className={`py-2 px-1 rounded-lg font-semibold text-sm transition-all ${paymentMode === 'cashsilver'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                Cash for Silver
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('labor')}
                className={`py-2 px-1 rounded-lg font-semibold text-sm transition-all ${paymentMode === 'labor'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                Labor Payment
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('multiple')}
                className={`py-2 px-1 rounded-lg font-semibold text-sm transition-all ${paymentMode === 'multiple'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                Split / Multi
              </button>
            </div>

            <AnimatePresence mode="wait">
              {(paymentMode === 'silver' || paymentMode === 'multiple') && (
                <motion.div
                  key="silver"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 bg-white p-4 rounded border border-orange-200"
                >
                  <h4 className="font-semibold text-orange-700 mb-2">
                    Silver Payment (Jama)
                  </h4>

                  {silverPaymentsList.map((sp, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-center bg-gray-50 p-2 rounded">
                      <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                      <div className="text-sm">
                        <span className="font-semibold">{sp.name}</span> <span className="text-gray-500">({sp.fromNo})</span>
                      </div>
                      <div className="text-sm ml-auto">
                        {sp.weight}g x {sp.touch}% = <b>{sp.fine}g</b>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSilverPayment(idx)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <div className="grid grid-cols-6 gap-2 items-end">
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600">Item Name</label>
                      <input
                        type="text"
                        value={newSilverPayment.name}
                        onChange={e => handleNewSilverPaymentChange('name', e.target.value)}
                        className="w-full p-1 border rounded text-sm"
                        placeholder="Ex: Patt / Lagdi"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">From No</label>
                      <input
                        type="text"
                        value={newSilverPayment.fromNo}
                        onChange={e => handleNewSilverPaymentChange('fromNo', e.target.value)}
                        className="w-full p-1 border rounded text-sm"
                        placeholder="Ex: 5"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Weight (g)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={newSilverPayment.weight}
                        onChange={e => handleNewSilverPaymentChange('weight', e.target.value)}
                        className="w-full p-1 border rounded text-sm"
                        placeholder="0.000"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Touch %</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newSilverPayment.touch}
                        onChange={e => handleNewSilverPaymentChange('touch', e.target.value)}
                        className="w-full p-1 border rounded text-sm"
                        placeholder="99.50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addSilverPayment}
                      className="bg-orange-600 text-white p-1 rounded text-sm hover:bg-orange-700"
                    >
                      Add
                    </button>
                  </div>
                </motion.div>
              )}


              {(paymentMode === 'cashsilver' || paymentMode === 'multiple') && (
                <motion.div
                  key="cashsilver"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 bg-white p-4 rounded border border-green-200"
                >
                  <h4 className="font-semibold text-green-700 mb-2">
                    Cash for Silver
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600">
                        Silver Rate (₹ / g)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={payments.cashForSilver.rate}
                        onChange={e =>
                          setPayments(prev => ({
                            ...prev,
                            cashForSilver: {
                              ...prev.cashForSilver,
                              rate: e.target.value
                            }
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="75.50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">
                        Silver Weight to Convert (g)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={payments.cashForSilver.weight}
                        onChange={e =>
                          setPayments(prev => ({
                            ...prev,
                            cashForSilver: {
                              ...prev.cashForSilver,
                              weight: e.target.value
                            }
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="0.000"
                      />
                    </div>
                    <div className="col-span-2 text-right font-medium text-green-800">
                      Amount: ₹
                      {(
                        (parseFloat(payments.cashForSilver.rate || 0) *
                          parseFloat(payments.cashForSilver.weight || 0)) || 0
                      ).toLocaleString()}
                    </div>
                  </div>
                </motion.div>
              )}

              {(paymentMode === 'labor' || paymentMode === 'multiple') && (
                <motion.div
                  key="labor"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 bg-white p-4 rounded border border-purple-200"
                >
                  <h4 className="font-semibold text-purple-700 mb-2">
                    Labor Payment
                  </h4>
                  <div>
                    <label className="block text-xs text-gray-600">
                      Amount Paid (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={payments.labor}
                      onChange={e =>
                        setPayments(prev => ({
                          ...prev,
                          labor: e.target.value
                        }))
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* NOTES & SUMMARY */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-orange-50 to-purple-50 p-6 rounded-lg border-2 border-orange-300"
          >
            <h3 className="text-lg font-bold mb-4 text-gray-800">
              Summary
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Total Gross Weight
                  </span>
                  <span className="font-semibold">
                    {totals.totalGross} g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Total Net Weight
                  </span>
                  <span className="font-semibold">
                    {totals.totalNetWeight} g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Total Silver Weight
                  </span>
                  <span className="font-semibold text-orange-600">
                    {totals.totalSilverWeight} g
                  </span>
                </div>
                {paymentMode !== 'none' && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Paid Silver
                    </span>
                    <span className="font-semibold text-green-600">
                      -{totals.paidSilver} g
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-orange-300 pt-2">
                  <span className="text-sm font-medium text-orange-700">
                    Balance Silver
                  </span>
                  <span className="font-bold text-xl text-orange-600">
                    {totals.balanceSilver} g
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Total Labor Charges
                  </span>
                  <span className="font-semibold text-purple-600">
                    {totals.totalLabor}
                  </span>
                </div>
                {paymentMode !== 'none' && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Paid Labor
                    </span>
                    <span className="font-semibold text-green-600">
                      -{totals.paidLabor}
                    </span>
                  </div>
                )}
                {(paymentMode === 'cashsilver' ||
                  paymentMode === 'multiple') && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Cash Amount (Silver)
                      </span>
                      <span className="font-semibold text-green-700">
                        ₹{totals.cashAmount}
                      </span>
                    </div>
                  )}
                <div className="flex justify-between border-t-2 border-purple-300 pt-2">
                  <span className="text-sm font-medium text-purple-700">
                    Balance Labor
                  </span>
                  <span className="font-bold text-xl text-purple-600">
                    {totals.balanceLabor}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* SUBMIT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))
                }
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                rows="3"
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-purple-600 text-white rounded-lg font-semibold hover:from-orange-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading
                  ? 'Processing...'
                  : editSale
                    ? 'Update Sale'
                    : 'Create Sale'}
              </motion.button>
              {editSale && onCancelEdit && (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </motion.div>
        </form>
      </motion.div>

      {/* ADD CUSTOMER MODAL */}
      <AnimatePresence>
        {showAddCustomerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowAddCustomerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">
                Add New Customer
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={e =>
                      setNewCustomer(prev => ({
                        ...prev,
                        name: e.target.value
                      }))
                    }
                    className="w-full p-2 border rounded-lg"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={newCustomer.phone}
                    onChange={e =>
                      setNewCustomer(prev => ({
                        ...prev,
                        phone: e.target.value
                      }))
                    }
                    className="w-full p-2 border rounded-lg"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Address
                  </label>
                  <textarea
                    value={newCustomer.address}
                    onChange={e =>
                      setNewCustomer(prev => ({
                        ...prev,
                        address: e.target.value
                      }))
                    }
                    className="w-full p-2 border rounded-lg"
                    rows="2"
                    placeholder="Address"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddNewCustomer}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Add Customer
                  </button>
                  <button
                    onClick={() => setShowAddCustomerModal(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
