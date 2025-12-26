import React, { useState } from 'react';
import RegularDashboard from './RegularDashboard';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';


const MetalCalculator = () => {
  const [calculatorType, setCalculatorType] = useState('type1');
  
  // Type 1 State (Previously Type 4 - Multi-Batch)
  const [type1Data, setType1Data] = useState({
    name: '',
    targetPurity: 52,
    batches: [
      { weight: '', purity: '' },
      { weight: '', purity: '' }
    ]
  });
  const [type1Result, setType1Result] = useState(null);

  // Type 2 State
  const [type2Data, setType2Data] = useState({
    name: '',
    pureSilverWeight: '',
    targetPurity: ''
  });
  const [type2Result, setType2Result] = useState(null);
  
  // Type 3 State
  const [type3Data, setType3Data] = useState({
    name: '',
    pureSilverWeight: '',
    targetPurity: '62.5'
  });
  const [type3Result, setType3Result] = useState(null);

  // Type 4 State - Dakh Mel 37
  const [type4Data, setType4Data] = useState({
    name: '',
    silverWeight: '',
    tounch: ''
  });
  const [type4Result, setType4Result] = useState(null);

  // Calculate Fine for Type 4
  const calculateType4Fine = () => {
    const weight = parseFloat(type4Data.silverWeight) || 0;
    const tounch = parseFloat(type4Data.tounch) || 0;
    return (weight * tounch / 100).toFixed(3);
  };

  // Calculate Fine for each batch
  const calculateFine = (weight, purity) => {
    const w = parseFloat(weight) || 0;
    const p = parseFloat(purity) || 0;
    return (w * p / 100).toFixed(3);
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalWeight = 0;
    let totalFine = 0;

    type1Data.batches.forEach(batch => {
      const w = parseFloat(batch.weight) || 0;
      const p = parseFloat(batch.purity) || 0;
      totalWeight += w;
      totalFine += (w * p / 100);
    });

    const totalPurity = totalWeight > 0 ? (totalFine / totalWeight * 100).toFixed(2) : '0.00';

    return {
      totalWeight: totalWeight.toFixed(2),
      totalPurity: totalPurity,
      totalFine: totalFine.toFixed(3)
    };
  };

  // Calculate Type 1 (NEW - Enhanced Multi-Batch)
  const calculateType1 = () => {
    const { batches, targetPurity } = type1Data;
    
    if (batches.some(b => !b.weight || !b.purity)) {
      alert('Please fill all batch weights and purities');
      return;
    }
    
    if (!targetPurity) {
      alert('Please enter target purity');
      return;
    }

    let totalPureSilver = 0;
    let totalWeight = 0;
    
    const batchDetails = batches.map((batch, index) => {
      const weight = parseFloat(batch.weight);
      const purity = parseFloat(batch.purity);
      const pureSilver = weight * (purity / 100);
      
      totalPureSilver += pureSilver;
      totalWeight += weight;
      
      return {
        batchNumber: index + 1,
        weight: weight.toFixed(2),
        purity: purity.toFixed(2),
        pureSilver: pureSilver.toFixed(3)
      };
    });

    const currentPurity = (totalPureSilver / totalWeight) * 100;
    const target = parseFloat(targetPurity);
    const pureSilverToAdd = (target * totalWeight - 100 * totalPureSilver) / (100 - target);
    
    // Check if we need to add copper instead (Type 1 logic)
    let copperToAdd = 0;
    let needCopper = false;
    
    if (pureSilverToAdd < 0) {
      // Current purity is higher than target - need to add copper
      needCopper = true;
      // Type 1 copper formula: Copper = (TotalPureSilver - TargetPurity × TotalWeight) / TargetPurity
      copperToAdd = (totalPureSilver - (target / 100) * totalWeight) / (target / 100);
    }
    
    const finalTotalPure = needCopper ? totalPureSilver : (totalPureSilver + pureSilverToAdd);
    const finalTotalWeight = needCopper ? (totalWeight + copperToAdd) : (totalWeight + pureSilverToAdd);
    const finalPurity = (finalTotalPure / finalTotalWeight) * 100;

    setType1Result({
      batchDetails,
      totalWeight: totalWeight.toFixed(2),
      totalPureSilver: totalPureSilver.toFixed(3),
      currentPurity: currentPurity.toFixed(2),
      targetPurity: target.toFixed(2),
      pureSilverToAdd: needCopper ? 0 : pureSilverToAdd.toFixed(3),
      copperToAdd: needCopper ? copperToAdd.toFixed(3) : 0,
      needCopper: needCopper,
      finalTotalPure: finalTotalPure.toFixed(3),
      finalTotalWeight: finalTotalWeight.toFixed(3),
      finalPurity: finalPurity.toFixed(2)
    });
  };

  // Calculate Type 2
  const calculateType2 = () => {
    const pureSilver = parseFloat(type2Data.pureSilverWeight);
    const targetPurity = parseFloat(type2Data.targetPurity) / 100;

    const finalTotalMass = pureSilver / targetPurity;
    const copperToAdd = finalTotalMass - pureSilver;

    setType2Result({
      pureSilver: pureSilver.toFixed(3),
      targetPurity: (targetPurity * 100).toFixed(2),
      finalTotalMass: finalTotalMass.toFixed(3),
      copperToAdd: copperToAdd.toFixed(3)
    });
  };

  // Calculate Type 3
  const calculateType3 = () => {
    const pureSilver = parseFloat(type3Data.pureSilverWeight);
    const targetPurity = parseFloat(type3Data.targetPurity) / 100;

    const finalMixMass = pureSilver / targetPurity;
    const additionNeeded = finalMixMass - pureSilver;
    const jastToAdd = additionNeeded / 2;
    const copperToAdd = additionNeeded / 2;

    setType3Result({
      pureSilver: pureSilver.toFixed(3),
      targetPurity: (targetPurity * 100).toFixed(2),
      finalMixMass: finalMixMass.toFixed(3),
      additionNeeded: additionNeeded.toFixed(3),
      jastToAdd: jastToAdd.toFixed(3),
      copperToAdd: copperToAdd.toFixed(3),
    });
  };

  // Calculate Type 4 - Dakh Mel 37
  const calculateType4 = () => {
    const weight = parseFloat(type4Data.silverWeight);
    const tounch = parseFloat(type4Data.tounch);

    if (!weight || !tounch) {
      alert('Please fill all fields');
      return;
    }

    const fine = weight * (tounch / 100);
    const currentPurity = tounch;

    let pureSilverToAdd = 0;
    let copperToAdd = 0;
    let step1Type = ''; // 'silver', 'copper', or 'none'

    // Step 1: Adjust to 52%
    if (currentPurity < 51) {
      // Need to add pure silver
      pureSilverToAdd = (51 * weight - 100 * fine) / (100 - 51);
      step1Type = 'silver';
    } else if (currentPurity > 51) {
      // Need to add copper
      copperToAdd = (fine - 0.51 * weight) / 0.51;
      step1Type = 'copper';
    } else {
      // Already at 52%
      step1Type = 'none';
    }

    // Calculate weight and fine after Step 1
    const weightAfterStep1 = weight + pureSilverToAdd + copperToAdd;
    const fineAfterStep1 = fine + pureSilverToAdd; // Copper doesn't add fine

    // Step 2: Convert from 52% to 37%
    const totalNeededAt37 = fineAfterStep1 / 0.37;
    const materialToAdd = (weightAfterStep1 * 370 )/ 1000;
    const jastToAdd = materialToAdd * 0.70;
    const kdmToAdd = materialToAdd * 0.30;

    // Final calculations 
    const finalWeight = weightAfterStep1 + materialToAdd;
    const finalPurity = 37;

    setType4Result({
      inputWeight: weight.toFixed(2),
      inputTounch: tounch.toFixed(2),
      inputFine: fine.toFixed(3),
      currentPurity: currentPurity.toFixed(2),
      step1Type: step1Type,
      pureSilverToAdd: pureSilverToAdd.toFixed(3),
      copperToAdd: copperToAdd.toFixed(3),
      weightAfterStep1: weightAfterStep1.toFixed(2),
      fineAfterStep1: fineAfterStep1.toFixed(3),
      jastToAdd: jastToAdd.toFixed(3),
      kdmToAdd: kdmToAdd.toFixed(3),
      finalWeight: finalWeight.toFixed(2),
      finalPurity: finalPurity.toFixed(2)
    });
  };

  // Add/Remove Batch Functions for Type 1
  const addBatch = () => {
    setType1Data({
      ...type1Data,
      batches: [...type1Data.batches, { weight: '', purity: '' }]
    });
  };

  const removeBatch = (index) => {
    if (type1Data.batches.length > 2) {
      const newBatches = type1Data.batches.filter((_, i) => i !== index);
      setType1Data({ ...type1Data, batches: newBatches });
    }
  };

  const handleBatchChange = (index, field, value) => {
    const newBatches = [...type1Data.batches];
    newBatches[index][field] = value;
    setType1Data({ ...type1Data, batches: newBatches });
  };

  // PDF Functions
  const downloadPDFType1 = () => {
    if (!type1Result) return;
    const doc = new jsPDF();
    const { name } = type1Data;
    const r = type1Result;

    doc.setFontSize(16);
    doc.text(name || 'Silver Calculation', 15, 15);
    doc.setFontSize(12);
    doc.text('Metal Calculator Type 1 - Multi-Batch Purity Adjustment', 15, 25);

    const batchRows = r.batchDetails.map(b => [
      `Batch ${b.batchNumber}`,
      `${b.weight} g`,
      `${b.purity}%`,
      `${b.pureSilver} g`
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Batch', 'Weight', 'Purity', 'Pure Silver']],
      body: batchRows,
      theme: 'grid',
      margin: { left: 15, right: 15 }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    
    const resultRows = [
      ['Total Weight (Current)', `${r.totalWeight} g`],
      ['Total Pure Silver (Current)', `${r.totalPureSilver} g`],
      ['Current Purity', `${r.currentPurity}%`],
      ['Target Purity', `${r.targetPurity}%`],
      ['', '']
    ];

    if (r.needCopper) {
      resultRows.push(
        ['✅ Copper to Add', `${r.copperToAdd} g`],
        ['', ''],
        ['Final Total Pure Silver', `${r.finalTotalPure} g`],
        ['Final Total Weight', `${r.finalTotalWeight} g`],
        ['Final Purity', `${r.finalPurity}%`]
      );
    } else {
      resultRows.push(
        ['✅ Pure Silver to Add', `${r.pureSilverToAdd} g`],
        ['', ''],
        ['Final Total Pure', `${r.finalTotalPure} g`],
        ['Final Total Weight', `${r.finalTotalWeight} g`],
        ['Final Purity', `${r.finalPurity}%`]
      );
    }

    autoTable(doc, {
      startY: finalY,
      head: [['Parameter', 'Value']],
      body: resultRows,
      theme: 'grid',
      margin: { left: 15, right: 15 }
    });

    doc.save((name || 'silver-calculation-type1') + '.pdf');
  };

  const downloadPDFType2 = () => {
    if (!type2Result) return;
    const doc = new jsPDF();
    const { pureSilverWeight, targetPurity, name } = type2Data;
    const r = type2Result;

    doc.setFontSize(16);
    doc.text(name || 'Silver Calculation', 15, 15);
    doc.setFontSize(12);
    doc.text('Metal Calculator Type 2 - Dilution', 15, 25);

    const columns = [{ header: 'Field', dataKey: 'field' }, { header: 'Value', dataKey: 'value' }];

    const rows = [
      { field: 'Pure Silver Weight (g)', value: pureSilverWeight },
      { field: 'Target Purity (%)', value: targetPurity },
      { field: 'Final Total Mass (g)', value: r.finalTotalMass },
      { field: 'Copper/Filler to Add (g)', value: r.copperToAdd }
    ];

    autoTable(doc, {
      startY: 30,
      head: [columns.map(c => c.header)],
      body: rows.map(row => [row.field, row.value]),
      theme: 'grid',
      margin: { left: 15, right: 15 }
    });

    doc.save((name || 'silver-calculation-type2') + '.pdf');
  };

  const downloadPDFType3 = () => {
    if (!type3Result) return;
    const doc = new jsPDF();
    const { pureSilverWeight, targetPurity, name } = type3Data;
    const r = type3Result;

    doc.setFontSize(16);
    doc.text(name || 'Silver Calculation', 15, 15);
    doc.setFontSize(12);
    doc.text('Metal Calculator Type 3 - Standard Mix', 15, 25);

    const columns = [{ header: 'Field', dataKey: 'field' }, { header: 'Value', dataKey: 'value' }];

    const rows = [
      { field: 'Pure Silver Weight (g)', value: pureSilverWeight },
      { field: 'Target Purity (%)', value: targetPurity },
      { field: 'Final Mixture Mass (g)', value: r.finalMixMass },
      { field: 'Total Mass to Add (g)', value: r.additionNeeded },
      { field: 'Jast to Add (g)', value: r.jastToAdd },
      { field: 'Copper to Add (g)', value: r.copperToAdd }
    ];

    autoTable(doc, {
      startY: 30,
      head: [columns.map(c => c.header)],
      body: rows.map(row => [row.field, row.value]),
      theme: 'grid',
      margin: { left: 15, right: 15 }
    });

    doc.save((name || 'silver-calculation-type3') + '.pdf');
  };

  const downloadPDFType4 = () => {
    if (!type4Result) return;
    const doc = new jsPDF();
    const { name } = type4Data;
    const r = type4Result;

    doc.setFontSize(16);
    doc.text(name || 'Silver Calculation', 15, 15);
    doc.setFontSize(12);
    doc.text('Metal Calculator Type 4 - Dakh Mel 37', 15, 25);

    const columns = [{ header: 'Field', dataKey: 'field' }, { header: 'Value', dataKey: 'value' }];

    const rows = [
      { field: 'Input Weight (g)', value: r.inputWeight },
      { field: 'Input Tounch (%)', value: r.inputTounch },
      { field: 'Input Fine (g)', value: r.inputFine },
      { field: '', value: '' },
      { field: 'Step 1: Adjust to 52%', value: '' },
      { field: 'Pure Silver to Add (g)', value: r.pureSilverToAdd },
      { field: 'Copper to Add (g)', value: r.copperToAdd },
      { field: '', value: '' },
      { field: 'Step 2: Convert to 37% (Dakh Mel)', value: '' },
      { field: 'Jast to Add (70%) (g)', value: r.jastToAdd },
      { field: 'KDM to Add (30%) (g)', value: r.kdmToAdd },
      { field: '', value: '' },
      { field: 'Final Total Weight (g)', value: r.finalWeight },
      { field: 'Final Purity (%)', value: r.finalPurity }
    ];

    autoTable(doc, {
      startY: 30,
      head: [columns.map(c => c.header)],
      body: rows.map(row => [row.field, row.value]),
      theme: 'grid',
      margin: { left: 15, right: 15 }
    });

    doc.save((name || 'silver-calculation-type4') + '.pdf');
  };

  const totals = calculateTotals();

  return (
    <RegularDashboard>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Metal Calculator</h1>

        {/* Calculator Type Selector */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <button
            onClick={() => setCalculatorType('type1')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              calculatorType === 'type1'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Mel 
          </button>
          <button
            onClick={() => setCalculatorType('type2')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                calculatorType === 'type2'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            >
            Gut Mel(Only Fine)
            </button>

          <button
            onClick={() => setCalculatorType('type3')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              calculatorType === 'type3'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Dak Mel (50,62.5,72.5)
          </button>

          <button
            onClick={() => setCalculatorType('type4')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              calculatorType === 'type4'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Dakh Mel 37
          </button>
        </div>

        {/* Type 1 - Multi-Batch Purity Adjustment */}
        {calculatorType === 'type1' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4 text-indigo-700">
              Mel 
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Calculate whether to add pure silver or copper to multiple batches to reach target purity
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name / Note</label>
                <input
                  type="text"
                  value={type1Data.name}
                  onChange={(e) => setType1Data({ ...type1Data, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter calculation name"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Silver Batches</label>
                  <button
                    type="button"
                    onClick={addBatch}
                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                  >
                    + Add Batch
                  </button>
                </div>

                <div className="space-y-3">
                  {type1Data.batches.map((batch, index) => (
                    <div key={index} className="flex gap-3 items-center border p-3 rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <label className="block text-xs mb-1">Batch {index + 1} Weight (g)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={batch.weight}
                          onChange={(e) => handleBatchChange(index, 'weight', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 10000"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs mb-1">Purity (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={batch.purity}
                          onChange={(e) => handleBatchChange(index, 'purity', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 28"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs mb-1">Fine (g)</label>
                        <input
                          type="text"
                          value={calculateFine(batch.weight, batch.purity)}
                          readOnly
                          className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                          placeholder="Auto"
                        />
                      </div>
                      {type1Data.batches.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeBatch(index)}
                          className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 mt-5"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Totals Row */}
                  <div className="flex gap-3 items-center border-2 border-indigo-300 p-3 rounded-lg bg-indigo-50">
                    <div className="flex-1">
                      <label className="block text-xs mb-1 font-bold text-indigo-800">Total Weight (g)</label>
                      <input
                        type="text"
                        value={totals.totalWeight}
                        readOnly
                        className="w-full px-3 py-2 border rounded-lg bg-indigo-100 text-indigo-900 font-bold cursor-not-allowed"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs mb-1 font-bold text-indigo-800">Total Purity (%)</label>
                      <input
                        type="text"
                        value={totals.totalPurity}
                        readOnly
                        className="w-full px-3 py-2 border rounded-lg bg-indigo-100 text-indigo-900 font-bold cursor-not-allowed"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs mb-1 font-bold text-indigo-800">Total Fine (g)</label>
                      <input
                        type="text"
                        value={totals.totalFine}
                        readOnly
                        className="w-full px-3 py-2 border rounded-lg bg-indigo-100 text-indigo-900 font-bold cursor-not-allowed"
                      />
                    </div>
                    <div className="flex-1"></div> {/* Spacer for alignment */}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Target Purity (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={type1Data.targetPurity}
                  onChange={(e) => setType1Data({ ...type1Data, targetPurity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 52"
                />
              </div>

              <button
                onClick={calculateType1}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-semibold"
              >
                Calculate Type 1
              </button>

              {type1Result && (
                <div className="mt-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
                  <h4 className="font-bold text-lg mb-4 text-indigo-800">📊 Results:</h4>

                  <div className="bg-white p-4 rounded-lg mb-4 border-l-4 border-orange-500">
                    <h5 className="font-semibold text-sm mb-2 text-gray-700">Current Status:</h5>
                    <div className="space-y-1 text-sm">
                      <p>Total Weight: <strong>{type1Result.totalWeight} g</strong></p>
                      <p>Total Pure Silver: <strong className="text-orange-600">{type1Result.totalPureSilver} g</strong></p>
                      <p>Current Purity: <strong className="text-orange-600">{type1Result.currentPurity}%</strong></p>
                    </div>
                  </div>

                  {type1Result.needCopper ? (
                    // Show Copper Addition (Type 1 Logic)
                    <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-6 rounded-lg border-2 border-orange-500">
                      <h5 className="font-bold text-lg mb-2 text-orange-800">🟠 Required Addition:</h5>
                      <p className="text-2xl font-bold text-orange-700 mb-2">
                        Add {type1Result.copperToAdd} g of Copper
                      </p>
                      <div className="text-sm space-y-1 text-gray-700">
                        <p>Target Purity: <strong>{type1Result.targetPurity}%</strong></p>
                        <p className="text-xs text-orange-600 italic mt-2">
                          (Current purity is higher than target - dilution needed)
                        </p>
                        <p>Final Total Pure Silver: <strong>{type1Result.finalTotalPure} g</strong></p>
                        <p>Final Total Weight: <strong>{type1Result.finalTotalWeight} g</strong></p>
                        <p>Final Purity: <strong className="text-orange-600">{type1Result.finalPurity}%</strong> ✓</p>
                      </div>
                    </div>
                  ) : (
                    // Show Pure Silver Addition (Original Type 4 Logic)
                    <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-6 rounded-lg border-2 border-green-500">
                      <h5 className="font-bold text-lg mb-2 text-green-800">✅ Required Addition:</h5>
                      <p className="text-2xl font-bold text-green-700 mb-2">
                        Add {type1Result.pureSilverToAdd} g of Pure Silver (100%)
                      </p>
                      <div className="text-sm space-y-1 text-gray-700">
                        <p>Target Purity: <strong>{type1Result.targetPurity}%</strong></p>
                        <p>Final Total Pure: <strong>{type1Result.finalTotalPure} g</strong></p>
                        <p>Final Total Weight: <strong>{type1Result.finalTotalWeight} g</strong></p>
                        <p>Final Purity: <strong className="text-green-600">{type1Result.finalPurity}%</strong> ✓</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={downloadPDFType1}
                    className="mt-4 w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    📄 Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Type 2 */}
        {calculatorType === 'type2' && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">
              Gut Mel 
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Convert 100% pure silver to a lower purity by adding copper/filler
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={type2Data.name}
                  onChange={(e) => setType2Data({ ...type2Data, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter a name or note"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Pure Silver Weight (g)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={type2Data.pureSilverWeight}
                  onChange={(e) => setType2Data({ ...type2Data, pureSilverWeight: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Target Purity (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={type2Data.targetPurity}
                  onChange={(e) => setType2Data({ ...type2Data, targetPurity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 38"
                  required
                />
              </div>
            </div>

            <button
              onClick={calculateType2}
              className="px-6 py-2 bg-purple-900 text-white rounded-lg hover:bg-purple-800 transition-colors"
            >
              Calculate
            </button>

            {/* Results */}
            {type2Result && (
              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <h4 className="font-bold text-lg mb-3">Results:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Pure Silver Weight:</span>
                    <span className="text-purple-700 font-bold">{type2Result.pureSilver} g</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Target Purity:</span>
                    <span className="text-purple-700 font-bold">{type2Result.targetPurity}%</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Final Total Mass:</span>
                    <span className="text-purple-700 font-bold">{type2Result.finalTotalMass} g</span>
                  </div>
                </div>

                <div className="col-span-2 flex flex-col items-center justify-center my-4">
                  <div className="w-full p-6 bg-yellow-300 border-2 border-yellow-600 rounded-xl shadow-lg flex flex-col items-center">
                    <span className="text-lg font-semibold text-yellow-900 mb-2">
                      🟠 Required Copper/Filler to Add
                    </span>
                    <span className="text-3xl font-extrabold text-yellow-800 tracking-wide">
                      {type2Result.copperToAdd} g
                    </span>
                    <span className="block font-medium text-yellow-700 mt-1">
                      (Add this to achieve {type2Result.targetPurity}% purity)
                    </span>
                  </div>
                </div>

                <button
                  onClick={downloadPDFType2}
                  className="ml-4 px-6 py-2 mt-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Download PDF
                </button>
              </div>
            )}
          </div>
        )}

        {/* Type 3 */}
        {calculatorType === 'type3' && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">
              Dak Mel (50,62.5,72.5)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={type3Data.name}
                  onChange={(e) => setType3Data({ ...type3Data, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter a name or note"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Pure Silver Weight (g)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={type3Data.pureSilverWeight}
                  onChange={e => setType3Data({ ...type3Data, pureSilverWeight: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Target Purity (%)
                </label>
                <select
                  value={type3Data.targetPurity}
                  onChange={e => setType3Data({ ...type3Data, targetPurity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="50">50%</option>
                  <option value="62.5">62.5%</option>
                  <option value="72.5">72.5%</option>
                </select>
              </div>
            </div>
            <button
              onClick={calculateType3}
              className="px-6 py-2 bg-purple-900 text-white rounded-lg hover:bg-purple-800 transition-colors"
            >
              Calculate
            </button>
            {type3Result && (
              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <h4 className="font-bold text-lg mb-3">Results:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Initial Silver:</span>
                    <span className="text-purple-700 font-bold">{type3Result.pureSilver}g</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Target Purity:</span>
                    <span className="text-purple-700 font-bold">{type3Result.targetPurity}%</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Final Mixture Mass:</span>
                    <span className="text-purple-700 font-bold">{type3Result.finalMixMass}g</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Total Mass to Add:</span>
                    <span className="text-purple-700 font-bold">{type3Result.additionNeeded}g</span>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="w-full p-4 bg-yellow-100 border-2 border-yellow-600 rounded-xl shadow flex flex-col items-center">
                    <span className="text-lg font-semibold text-yellow-900 mb-1">Jast to Add</span>
                    <span className="text-xl font-bold text-yellow-800">{type3Result.jastToAdd}g</span>
                    <span className="block font-medium text-yellow-700 mt-1">50% of added mass</span>
                  </div>
                  <div className="w-full p-4 bg-orange-100 border-2 border-orange-600 rounded-xl shadow flex flex-col items-center">
                    <span className="text-lg font-semibold text-orange-900 mb-1">Copper to Add</span>
                    <span className="text-xl font-bold text-orange-800">{type3Result.copperToAdd}g</span>
                    <span className="block font-medium text-orange-700 mt-1">50% of added mass</span>
                  </div>
                </div>
                <button
                  onClick={downloadPDFType3}
                  className="ml-4 px-6 py-2 mt-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Download PDF
                </button>
              </div>
            )}
          </div>
        )}

        {/* Type 4 - Dakh Mel 37 */}
        {calculatorType === 'type4' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4 text-pink-700">
              Dakh Mel 37
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Convert silver to 37% purity (Dakh Mel) via 52% intermediate step
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name / Note</label>
                  <input
                    type="text"
                    value={type4Data.name}
                    onChange={(e) => setType4Data({ ...type4Data, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    placeholder="Enter calculation name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Silver Weight (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={type4Data.silverWeight}
                    onChange={(e) => setType4Data({ ...type4Data, silverWeight: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    placeholder="e.g., 10000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tounch (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={type4Data.tounch}
                    onChange={(e) => setType4Data({ ...type4Data, tounch: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    placeholder="e.g., 28"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fine (g)</label>
                  <input
                    type="text"
                    value={calculateType4Fine()}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>

              <button
                onClick={calculateType4}
                className="w-full px-4 py-3 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-lg hover:from-pink-700 hover:to-pink-800 font-semibold"
              >
                Calculate Type 4
              </button>

              {type4Result && (
                <div className="mt-6 p-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg border-2 border-pink-200">
                  <h4 className="font-bold text-lg mb-4 text-pink-800">📊 Results:</h4>

                  {/* Step 1: Adjust to 52% */}
                  <div className="bg-white p-4 rounded-lg mb-4 border-l-4 border-blue-500">
                    <h5 className="font-semibold text-sm mb-2 text-gray-700">Step 1: Adjust to 52% Purity</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Pure Silver to Add:</span>
                        <strong className={parseFloat(type4Result.pureSilverToAdd) > 0 ? 'text-green-600' : 'text-gray-400'}>
                          {type4Result.pureSilverToAdd} g
                          {parseFloat(type4Result.pureSilverToAdd) === 0 && ' (Not needed)'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Copper to Add:</span>
                        <strong className={parseFloat(type4Result.copperToAdd) > 0 ? 'text-orange-600' : 'text-gray-400'}>
                          {type4Result.copperToAdd} g
                          {parseFloat(type4Result.copperToAdd) === 0 && ' (Not needed)'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Convert to 37% */}
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg mb-4 border-2 border-yellow-400">
                    <h5 className="font-semibold text-sm mb-3 text-gray-700">Step 2: Convert to 37% Purity (Dakh Mel)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-yellow-100 p-3 rounded-lg border border-yellow-400">
                        <div className="text-xs text-yellow-800 mb-1">Jast to Add (70%)</div>
                        <div className="text-xl font-bold text-yellow-900">{type4Result.jastToAdd} g</div>
                      </div>
                      <div className="bg-orange-100 p-3 rounded-lg border border-orange-400">
                        <div className="text-xs text-orange-800 mb-1">KDM to Add (30%)</div>
                        <div className="text-xl font-bold text-orange-900">{type4Result.kdmToAdd} g</div>
                      </div>
                    </div>
                  </div>

                  {/* Final Status */}
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-lg border-2 border-green-500">
                    <h5 className="font-semibold text-sm mb-2 text-green-800">Final Status:</h5>
                    <div className="space-y-1 text-sm">
                      <p>Final Total Weight: <strong className="text-green-700">{type4Result.finalWeight} g</strong></p>
                      <p>Final Purity: <strong className="text-green-700">{type4Result.finalPurity}%</strong> ✓</p>
                    </div>
                  </div>

                  <button
                    onClick={downloadPDFType4}
                    className="mt-4 w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    📄 Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </RegularDashboard>
  );
};

export default MetalCalculator;
