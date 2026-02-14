import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductSalesListSection from '../../components/product-billing/ProductSalesListSection';
import CreateSaleSection from '../../components/product-billing/CreateSaleSection';
import ProductCustomersSection from '../../components/product-billing/CustomersSection';

const ProductBillingDashboard = () => {
    const [activeTab, setActiveTab] = useState('sales');

    const tabs = [
        { id: 'sales', label: '🧾 Sales List', icon: '📄' },
        { id: 'create', label: '➕ Create Product Bill', icon: '📝' },
        { id: 'customers', label: '👥 Product Customers', icon: '👤' }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-teal-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white"
            >
                <h1 className="text-3xl font-bold mb-2">Product Billing System</h1>
                <p className="text-white/80">Manage separate product billing cycle (Sale = Credit, Payment = Debit)</p>
            </motion.div>

            {/* Tabs Navigation */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="flex border-b overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 px-6 py-4 font-semibold transition-all duration-300 relative whitespace-nowrap ${activeTab === tab.id
                                ? 'text-indigo-600 bg-indigo-50'
                                : 'text-gray-600 hover:text-indigo-500 hover:bg-gray-50'
                                }`}
                        >
                            <span className="text-2xl mr-2">{tab.icon}</span>
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600"
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === 'sales' && <ProductSalesListSection />}
                            {activeTab === 'create' && (
                                <CreateSaleSection
                                    onSaleCreated={() => setActiveTab('sales')}
                                    onCancel={() => setActiveTab('sales')}
                                />
                            )}
                            {activeTab === 'customers' && <ProductCustomersSection />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default ProductBillingDashboard;
