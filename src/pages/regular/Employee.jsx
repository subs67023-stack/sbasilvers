import React, { useState } from 'react';
import RegularDashboard from './RegularDashboard';
import EmployeeList from './EmployeeList';
import SalarySection from './SalarySection';
import BakiTransactionSection from './BakiTransactionSection';  // ← ADD THIS

const Employee = () => {
  const [activeTab, setActiveTab] = useState('employees');

  return (
    <RegularDashboard>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Employee Management</h2>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'employees'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            👥 Employees
          </button>
          <button
            onClick={() => setActiveTab('salary')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'salary'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-green-600'
            }`}
          >
            💰 Salary
          </button>
          <button                                              
            onClick={() => setActiveTab('baki')}               
            className={`px-6 py-3 font-medium transition-colors $
              activeTab === 'baki'                             
                ? 'text-purple-600 border-b-2 border-purple-600' /* ← ADD THIS */
                : 'text-gray-600 hover:text-purple-600'        {/* ← ADD THIS */
            }`}                                                
          >                                                    
            💳 Baki Transactions                               
          </button>                                            
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'employees' && <EmployeeList />}
          {activeTab === 'salary' && <SalarySection />}
          {activeTab === 'baki' && <BakiTransactionSection />}  {/* ← ADD THIS */}
        </div>
      </div>
    </RegularDashboard>
  );
};

export default Employee;
