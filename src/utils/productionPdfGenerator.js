import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate Production Billing PDF
 * Based on your reference image format
 */
export const generateProductionPDF = (saleData) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // ========== HEADER SECTION ==========
  
  // Add logo if available
  try {
    const logo = '/SBA2.jpg'; // Your logo path
    doc.addImage(logo, 'JPEG', margin, yPos, 30, 30);
  } catch (error) {
    console.log('Logo not found, skipping...');
  }

  // Company Name (Center)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('|| SHREE DHULUBA PRASAN ||', pageWidth / 2, yPos + 10, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text('ESTIMATE', pageWidth / 2, yPos + 18, { align: 'center' });

  yPos += 35;

  // ========== CUSTOMER & VOUCHER DETAILS (TWO COLUMNS) ==========
  
  doc.setDrawColor(200);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 30);
  doc.line(pageWidth / 2, yPos, pageWidth / 2, yPos + 30);

  // Left Column - Customer Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${saleData.customer.name}`, margin + 3, yPos + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (saleData.customer.address) {
    const addressLines = doc.splitTextToSize(saleData.customer.address, 80);
    doc.text(addressLines, margin + 3, yPos + 12);
  }

  // Right Column - Voucher Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Bill No.:`, pageWidth / 2 + 3, yPos + 6);
  doc.text(`Date:`, pageWidth / 2 + 3, yPos + 12);
  
  doc.setFont('helvetica', 'normal');
  doc.text(saleData.voucherNo, pageWidth / 2 + 25, yPos + 6);
  doc.text(new Date(saleData.date).toLocaleDateString('en-IN'), pageWidth / 2 + 25, yPos + 12);

  yPos += 35;

  // ========== ITEMS TABLE ==========
  
  const tableData = saleData.items.map(item => [
    item.description,
    item.stamp || '',
    parseFloat(item.grossWeight).toFixed(3),
    parseFloat(item.stoneWeight).toFixed(3),
    parseFloat(item.netWeight).toFixed(3),
    parseFloat(item.touch).toFixed(2),
    item.pieces,
    parseFloat(item.laborChargePerKg).toFixed(0),
    parseFloat(item.silver).toFixed(3),
    parseFloat(item.amount).toFixed(2)
  ]);

  // Add totals row
  const totals = {
    grossWeight: 0,
    stoneWeight: 0,
    netWeight: 0,
    silver: 0,
    amount: 0
  };

  saleData.items.forEach(item => {
    totals.grossWeight += parseFloat(item.grossWeight);
    totals.stoneWeight += parseFloat(item.stoneWeight);
    totals.netWeight += parseFloat(item.netWeight);
    totals.silver += parseFloat(item.silver);
    totals.amount += parseFloat(item.amount);
  });

  tableData.push([
    { content: 'Total S', styles: { fontStyle: 'bold' } },
    '',
    { content: totals.grossWeight.toFixed(3), styles: { fontStyle: 'bold' } },
    { content: totals.stoneWeight.toFixed(3), styles: { fontStyle: 'bold' } },
    { content: totals.netWeight.toFixed(3), styles: { fontStyle: 'bold' } },
    '',
    '',
    '',
    { content: totals.silver.toFixed(3), styles: { fontStyle: 'bold' } },
    { content: totals.amount.toFixed(2), styles: { fontStyle: 'bold' } }
  ]);

  doc.autoTable({
    startY: yPos,
    head: [[
      'Description',
      'Stamp',
      'G. Wt.',
      'Less Wt.',
      'Net Wt.',
      'Tunch',
      'Pcs',
      'Labour',
      'Silver',
      'Amount'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 30, halign: 'left' },   // Description
      1: { cellWidth: 15, halign: 'center' }, // Stamp
      2: { cellWidth: 18, halign: 'right' },  // Gross Wt
      3: { cellWidth: 18, halign: 'right' },  // Less Wt
      4: { cellWidth: 18, halign: 'right' },  // Net Wt
      5: { cellWidth: 15, halign: 'center' }, // Tunch
      6: { cellWidth: 12, halign: 'center' }, // Pcs
      7: { cellWidth: 18, halign: 'right' },  // Labour
      8: { cellWidth: 18, halign: 'right' },  // Silver
      9: { cellWidth: 18, halign: 'right' }   // Amount
    },
    margin: { left: margin, right: margin }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // ========== PAYMENT TRANSACTIONS SECTION ==========
  
  if (saleData.transactions && saleData.transactions.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('KACCHI SILVER', margin, yPos);
    yPos += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Group transactions by type
    const silverTransactions = saleData.transactions.filter(t => t.type === 'silver_payment');
    const laborTransactions = saleData.transactions.filter(t => t.type === 'labor_payment');
    const cashTransactions = saleData.transactions.filter(t => t.type === 'cash_for_silver');

    // Silver receipts
    silverTransactions.forEach(txn => {
      const line = `${txn.name || 'N/A'} (${txn.silverFromNo || 'N/A'}) ${parseFloat(txn.silverWeight).toFixed(3)}×${parseFloat(txn.silverTouch).toFixed(2)} = ${parseFloat(txn.silverValue).toFixed(3)}`;
      doc.text(line, margin + 3, yPos);
      yPos += 4;
    });

    yPos += 3;
  }

  // ========== TOTALS SECTION ==========
  
  const totalPaidSilver = parseFloat(saleData.paidSilver) || 0;
  const totalPaidAmount = parseFloat(saleData.paidAmount) || 0;
  const pendingSilver = parseFloat(saleData.totalSilver) - totalPaidSilver;
  const pendingAmount = parseFloat(saleData.totalLaborAmount) - totalPaidAmount;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Total MR', margin, yPos);
  doc.text(totalPaidSilver.toFixed(3), margin + 30, yPos, { align: 'right' });
  doc.text((-totalPaidSilver).toFixed(3), margin + 60, yPos, { align: 'right' });
  yPos += 6;

  // Previous balance (if exists)
  if (saleData.previousBalance) {
    doc.text('Last Bal', margin, yPos);
    doc.text(parseFloat(saleData.previousBalance.silver || 0).toFixed(3), pageWidth - margin - 50, yPos, { align: 'right' });
    doc.text(parseFloat(saleData.previousBalance.amount || 0).toFixed(2), pageWidth - margin - 20, yPos, { align: 'right' });
    yPos += 6;
  }

  // Draw closing balance box
  yPos += 5;
  doc.setDrawColor(0);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 15);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Closing Balance', pageWidth / 2, yPos + 7, { align: 'center' });
  
  doc.setFontSize(9);
  doc.text('Silver:', pageWidth - margin - 70, yPos + 12);
  doc.text(pendingSilver.toFixed(3), pageWidth - margin - 50, yPos + 12, { align: 'right' });
  
  doc.text('Naam:', pageWidth - margin - 30, yPos + 12);
  doc.text(`₹${pendingAmount.toFixed(2)}`, pageWidth - margin - 5, yPos + 12, { align: 'right' });

  yPos += 20;

  // ========== FOOTER NOTE ==========
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('TAX WILL BE EXTRA', margin, yPos);

  // Page number
  doc.setFont('helvetica', 'normal');
  doc.text(`Page 1 of 1`, pageWidth - margin, pageHeight - 10, { align: 'right' });

  // ========== SAVE PDF ==========
  
  const fileName = `${saleData.voucherNo}.pdf`;
  doc.save(fileName);
};

/**
 * Generate Customer Ledger PDF
 */
export const generateCustomerLedgerPDF = (customerData) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = margin;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Ledger', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Customer Info
  doc.setFontSize(11);
  doc.text(`Customer: ${customerData.name}`, margin, yPos);
  yPos += 7;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (customerData.phone) {
    doc.text(`Phone: ${customerData.phone}`, margin, yPos);
    yPos += 5;
  }
  if (customerData.address) {
    doc.text(`Address: ${customerData.address}`, margin, yPos);
    yPos += 5;
  }

  yPos += 5;

  // Balance Summary
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(255, 243, 205);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 15, 'F');
  
  doc.text(`Total Balance Silver: ${parseFloat(customerData.balanceSilver).toFixed(3)} gm`, margin + 5, yPos + 6);
  doc.text(`Total Balance Amount: ₹${parseFloat(customerData.balanceAmount).toFixed(2)}`, margin + 5, yPos + 12);

  yPos += 20;

  // Sales Table
  if (customerData.sales && customerData.sales.length > 0) {
    const tableData = customerData.sales.map(sale => [
      sale.voucherNo,
      new Date(sale.date).toLocaleDateString('en-IN'),
      parseFloat(sale.totalSilver).toFixed(3),
      `₹${parseFloat(sale.totalLaborAmount).toFixed(2)}`,
      parseFloat(sale.pendingSilver || 0).toFixed(3),
      `₹${parseFloat(sale.pendingAmount || 0).toFixed(2)}`
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Voucher No', 'Date', 'Silver (gm)', 'Amount', 'Pending Silver', 'Pending Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [74, 144, 226],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    });
  }

  // Save
  doc.save(`${customerData.name}_Ledger.pdf`);
};

/**
 * Helper function to calculate previous balance
 * Call this before generating PDF
 */
export const calculatePreviousBalance = (customerId, currentSaleDate, allSales) => {
  let previousSilver = 0;
  let previousAmount = 0;

  allSales.forEach(sale => {
    if (sale.customerId === customerId && new Date(sale.date) < new Date(currentSaleDate)) {
      const pendingSilver = parseFloat(sale.totalSilver) - parseFloat(sale.paidSilver);
      const pendingAmount = parseFloat(sale.totalLaborAmount) - parseFloat(sale.paidAmount);
      
      previousSilver += pendingSilver;
      previousAmount += pendingAmount;
    }
  });

  return {
    silver: previousSilver,
    amount: previousAmount
  };
};

export default {
  generateProductionPDF,
  generateCustomerLedgerPDF,
  calculatePreviousBalance
};
