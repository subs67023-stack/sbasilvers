import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import CreateSaleSection from './CreateSaleSection';
import PaymentModal from './PaymentModal';

export default function ProductSalesListSection() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null);
    const [showCreate, setShowCreate] = useState(false);

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentSale, setPaymentSale] = useState(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        pages: 0
    });

    useEffect(() => {
        fetchSales();
    }, [pagination.page]);

    const fetchSales = async () => {
        setLoading(true);
        try {
            let query = `/product-billing/sales?page=${pagination.page}&limit=${pagination.limit}`;
            if (searchTerm) query += `&customerId=${searchTerm}`; // Note: Backend filters by ID mostly, or update backend to search by name text
            if (startDate) query += `&startDate=${startDate}`;
            if (endDate) query += `&endDate=${endDate}`;

            const res = await api.get(query);
            if (res.data.success) {
                setSales(res.data.data);
                setPagination(prev => ({
                    ...prev,
                    total: res.data.pagination.total,
                    pages: res.data.pagination.pages
                }));
            }
        } catch (e) {
            console.error('Error fetching sales', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchSales();
    };

    const viewSaleDetails = async (saleId) => {
        try {
            const response = await api.get(`/product-billing/sales/${saleId}`);
            if (response.data.success) {
                setSelectedSale(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching sale details:', error);
        }
    };

    const handleMakePayment = (sale) => {
        setPaymentSale(sale);
        setShowPaymentModal(true);
    };

    const handleGeneratePdf = (sale) => {
        // Reuse existing PDF generator if compatible or create new
        import('../../utils/pdfGenerator').then(mod => {
            mod.generatePDF(sale);
        });
    };

    const getStatusBadge = (status) => {
        const styles = {
            paid: 'bg-green-100 text-green-800',
            partial: 'bg-yellow-100 text-yellow-800',
            pending: 'bg-red-100 text-red-800',
            cancelled: 'bg-gray-100 text-gray-800'
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
                {status.toUpperCase()}
            </span>
        );
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Product Billing Sales</h1>
                    {!showCreate && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Search (Customer ID)"
                                    className="pt-1 pb-1 px-3 border rounded text-sm w-64"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Search</button>
                            </form>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-3 py-1 rounded text-sm border ${showFilters ? 'bg-gray-200 border-gray-400' : 'bg-white border-gray-300'}`}
                            >
                                Filters {showFilters ? '▲' : '▼'}
                            </button>
                        </div>
                    )}

                    {showFilters && !showCreate && (
                        <div className="mt-2 p-3 bg-gray-50 border rounded flex gap-4 items-end flex-wrap">
                            <div>
                                <label className="text-xs text-gray-600 block">Start Date</label>
                                <input type="date" className="p-1 border rounded text-sm"
                                    value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 block">End Date</label>
                                <input type="date" className="p-1 border rounded text-sm"
                                    value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                            <button onClick={() => { setPagination(prev => ({ ...prev, page: 1 })); fetchSales(); }} className="px-3 py-1 bg-gray-700 text-white rounded text-sm h-8">Apply</button>
                            <button onClick={() => { setStartDate(''); setEndDate(''); fetchSales(); }} className="px-3 py-1 text-blue-600 text-sm h-8">Clear</button>
                        </div>
                    )}
                </div>

                {!showCreate && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 h-10 shadow-md"
                    >
                        + Create Product Bill
                    </button>
                )}
            </div>

            {/* CREATE SCREEN */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <CreateSaleSection
                            onSaleCreated={() => {
                                setShowCreate(false);
                                fetchSales();
                            }}
                            onCancel={() => setShowCreate(false)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SALES TABLE */}
            {!showCreate && (
                <div className="bg-white rounded-lg shadow p-4">
                    {loading ? (
                        <p className="text-sm text-gray-600 text-center p-8">Loading...</p>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border p-2 text-left">Date</th>
                                            <th className="border p-2 text-left">Voucher</th>
                                            <th className="border p-2 text-left">Customer</th>
                                            <th className="border p-2 text-right">Total Silver</th>
                                            <th className="border p-2 text-right">Total Amount</th>
                                            <th className="border p-2 text-right">Bal Silver</th>
                                            <th className="border p-2 text-right">Bal Amount</th>
                                            <th className="border p-2 text-center">Status</th>
                                            <th className="border p-2 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sales.map(sale => (
                                            <tr key={sale.id} className="hover:bg-gray-50">
                                                <td className="border p-2">
                                                    {new Date(sale.saleDate).toLocaleDateString('en-GB')}
                                                </td>
                                                <td className="border p-2 font-medium">
                                                    {sale.voucherNumber}
                                                </td>
                                                <td className="border p-2">
                                                    <div className="font-semibold">{sale.customer?.name || 'N/A'}</div>
                                                    <div className="text-gray-500 text-[10px]">{sale.customer?.phone}</div>
                                                </td>
                                                <td className="border p-2 text-right">
                                                    {parseFloat(sale.totalSilverWeight || 0).toFixed(3)}
                                                </td>
                                                <td className="border p-2 text-right font-medium">
                                                    {parseFloat(sale.totalAmount || 0).toLocaleString()}
                                                </td>
                                                <td className="border p-2 text-right font-medium text-orange-600">
                                                    {parseFloat(sale.balanceSilver || 0).toFixed(3)}
                                                </td>
                                                <td className="border p-2 text-right text-red-600 font-medium">
                                                    {parseFloat(sale.balanceLabor || 0).toLocaleString()}
                                                </td>
                                                <td className="border p-2 text-center">
                                                    {getStatusBadge(sale.status)}
                                                </td>
                                                <td className="border p-2 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <button
                                                            className="px-2 py-1 text-[11px] bg-blue-500 text-white rounded hover:bg-blue-600"
                                                            onClick={() => viewSaleDetails(sale.id)}
                                                        >
                                                            View
                                                        </button>
                                                        <button
                                                            className="px-2 py-1 text-[11px] bg-green-600 text-white rounded hover:bg-green-700"
                                                            onClick={() => handleMakePayment(sale)}
                                                        >
                                                            Payment
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {sales.length === 0 && (
                                            <tr>
                                                <td className="border p-4 text-center text-gray-500" colSpan={9}>
                                                    No sales found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {pagination.pages > 1 && (
                                <div className="px-4 py-3 border-t flex items-center justify-between bg-gray-50 mt-4">
                                    <div className="text-sm text-gray-700">
                                        Page {pagination.page} of {pagination.pages} ({pagination.total} total sales)
                                    </div>
                                    <div className="flex gap-2">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                            disabled={pagination.page === 1}
                                            className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-white disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                            disabled={pagination.page === pagination.pages}
                                            className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-white disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </motion.button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* INLINE SALE VIEW MODAL - REUSING STRUCTURE */}
            <AnimatePresence>
                {selectedSale && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        onClick={() => setSelectedSale(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">
                                    Sale Details - {selectedSale.voucherNumber}
                                </h2>
                                <div className="flex gap-2">
                                    <button
                                        className="px-3 py-1 text-xs bg-gray-700 text-white rounded"
                                        onClick={() => handleGeneratePdf(selectedSale)}
                                    >
                                        Print Bill
                                    </button>
                                    <button
                                        className="px-3 py-1 text-xs bg-red-500 text-white rounded"
                                        onClick={() => setSelectedSale(null)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            {/* HEADER */}
                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                <div className="border rounded p-3">
                                    <p className="font-semibold">
                                        {selectedSale.customer?.name}
                                    </p>
                                    {selectedSale.customer?.address && (
                                        <p className="text-xs text-gray-700">
                                            {selectedSale.customer.address}
                                        </p>
                                    )}
                                    {selectedSale.customer?.phone && (
                                        <p className="text-xs text-gray-600 mt-1">
                                            Phone: {selectedSale.customer.phone}
                                        </p>
                                    )}
                                </div>
                                <div className="border rounded p-3 text-right">
                                    <p className="text-sm">
                                        Voucher: {selectedSale.voucherNumber}
                                    </p>
                                    <p className="text-sm">
                                        Date: {new Date(selectedSale.saleDate).toLocaleDateString('en-GB')}
                                    </p>
                                </div>
                            </div>

                            {/* MAIN TABLE */}
                            <div className="overflow-x-auto text-xs">
                                <table className="w-full border">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border p-1">Desc</th>
                                            <th className="border p-1">Pcs</th>
                                            <th className="border p-1">Gross</th>
                                            <th className="border p-1">Stone</th>
                                            <th className="border p-1">Net</th>
                                            <th className="border p-1">Touch</th>
                                            <th className="border p-1">Wastage</th>
                                            <th className="border p-1">Silver (g)</th>
                                            <th className="border p-1">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedSale.items?.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="border p-1">{item.description}</td>
                                                <td className="border p-1 text-center">{item.pieces}</td>
                                                <td className="border p-1 text-right">{parseFloat(item.grossWeight || 0).toFixed(3)}</td>
                                                <td className="border p-1 text-right">{parseFloat(item.stoneWeight || 0).toFixed(3)}</td>
                                                <td className="border p-1 text-right">{parseFloat(item.netWeight || 0).toFixed(3)}</td>
                                                <td className="border p-1 text-right">{parseFloat(item.touch || 0).toFixed(2)}</td>
                                                <td className="border p-1 text-right">{parseFloat(item.wastage || 0).toFixed(3)}</td>
                                                <td className="border p-1 text-right">{parseFloat(item.silverWeight || 0).toFixed(3)}</td>
                                                <td className="border p-1 text-right">{parseFloat(item.itemAmount || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}

                                        {/* TOTAL ROW */}
                                        <tr className="bg-gray-100 font-semibold">
                                            <td className="border p-1 text-right" colSpan={2}>TOTAL</td>
                                            <td className="border p-1 text-right">
                                                {parseFloat(selectedSale.items?.reduce((s, i) => s + parseFloat(i.grossWeight || 0), 0) || 0).toFixed(3)}
                                            </td>
                                            <td className="border p-1" />
                                            <td className="border p-1 text-right">
                                                {parseFloat(selectedSale.items?.reduce((s, i) => s + parseFloat(i.netWeight || 0), 0) || 0).toFixed(3)}
                                            </td>
                                            <td className="border p-1" />
                                            <td className="border p-1" />
                                            <td className="border p-1 text-right">
                                                {parseFloat(selectedSale.totalSilverWeight || 0).toFixed(3)}
                                            </td>
                                            <td className="border p-1 text-right">
                                                {parseFloat(selectedSale.subtotal || 0).toFixed(2)}
                                            </td>
                                        </tr>

                                        {/* PREVIOUS DUE SECTION */}
                                        <tr className="bg-yellow-50">
                                            <td className="border p-1 font-semibold" colSpan={7}>Previous Due</td>
                                            <td className="border p-1 text-right font-medium">
                                                {parseFloat(selectedSale.previousBalanceSilver || 0).toFixed(3)}
                                            </td>
                                            <td className="border p-1 text-right">
                                                {parseFloat(selectedSale.previousBalanceLabor || 0).toFixed(2)}
                                            </td>
                                        </tr>

                                        {/* GRAND TOTAL */}
                                        <tr className="bg-gray-200 font-bold border-t border-gray-400">
                                            <td className="border p-1 text-right uppercase" colSpan={7}>Total Due</td>
                                            <td className="border p-1 text-right text-orange-900">
                                                {(parseFloat(selectedSale.totalSilverWeight || 0) + parseFloat(selectedSale.previousBalanceSilver || 0)).toFixed(3)}
                                            </td>
                                            <td className="border p-1 text-right text-green-900">
                                                {(parseFloat(selectedSale.subtotal || 0) + parseFloat(selectedSale.previousBalanceLabor || 0)).toFixed(2)}
                                            </td>
                                        </tr>

                                        {/* TRANSACTIONS */}
                                        {selectedSale.transactions?.filter(t => t.type !== 'sale').map((txn, idx) => (
                                            <tr key={idx} className="bg-green-50">
                                                <td className="border p-1" colSpan={7}>
                                                    {txn.type.toUpperCase()} {txn.notes ? ` - ${txn.notes}` : ''}
                                                </td>
                                                <td className="border p-1 text-right font-medium">
                                                    {parseFloat(txn.silverWeight || 0).toFixed(3)}
                                                </td>
                                                <td className="border p-1 text-right font-medium">
                                                    {parseFloat(txn.amount || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}

                                        {/* CLOSING BALANCE */}
                                        <tr className="bg-blue-50">
                                            <td className="border p-1 font-semibold" colSpan={7}>Closing Balance</td>
                                            <td className="border p-1 text-right font-bold">
                                                {parseFloat(selectedSale.balanceSilver || 0).toFixed(3)}
                                            </td>
                                            <td className="border p-1 text-right font-bold">
                                                {parseFloat(selectedSale.balanceLabor || 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Payment Modal */}
            {showPaymentModal && paymentSale && (
                <PaymentModal
                    open={showPaymentModal}
                    sale={paymentSale}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setPaymentSale(null);
                    }}
                    onUpdate={fetchSales}
                />
            )}
        </div>
    );
}
