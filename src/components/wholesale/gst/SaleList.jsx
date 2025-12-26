import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import * as XLSX from 'xlsx';
import { generateGSTBillPDF } from '../../../utils/generateGSTBillPDF';


const SaleList = ({ onEdit }) => {
    const [bills, setBills] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBills();
    }, []);

    const fetchBills = async () => {
        try {
            const res = await api.get('/gst-billing/bills');
            setBills(res.data.data);
        } catch (error) {
            console.error('Error fetching bills:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBills = bills.filter(bill =>
        bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bill.customer && bill.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(bills.map(bill => ({
            BillNo: bill.billNumber,
            Date: bill.date,
            Customer: bill.customer?.name,
            TotalAmount: bill.grandTotal,
            PaymentMode: bill.paymentMode
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sales");
        XLSX.writeFile(wb, "GST_Sales.xlsx");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Sale List</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search Bill No or Customer..."
                        className="border p-2 rounded w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                        onClick={exportToExcel}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                        Export to Excel
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-medium text-gray-600">Bill No</th>
                            <th className="p-4 font-medium text-gray-600">Date</th>
                            <th className="p-4 font-medium text-gray-600">Customer</th>
                            <th className="p-4 font-medium text-gray-600 text-right">Amount</th>
                            <th className="p-4 font-medium text-gray-600">Mode</th>
                            <th className="p-4 font-medium text-gray-600 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading...</td></tr>
                        ) : filteredBills.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-500">No bills found</td></tr>
                        ) : (
                            filteredBills.map(bill => (
                                <tr key={bill.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-medium">{bill.billNumber}</td>
                                    <td className="p-4 text-gray-600">{bill.date}</td>
                                    <td className="p-4 text-gray-800">{bill.customer?.name}</td>
                                    <td className="p-4 text-right font-medium">₹{bill.grandTotal}</td>
                                    <td className="p-4 text-gray-600">{bill.paymentMode}</td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button
                                            onClick={() => {
                                                console.log("Edit clicked for:", bill);
                                                if (onEdit) onEdit(bill);
                                                else console.error("onEdit prop is missing!");
                                            }}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => {
                                                console.log("PDF clicked for:", bill);
                                                generateGSTBillPDF(bill);
                                            }}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            PDF
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SaleList;
