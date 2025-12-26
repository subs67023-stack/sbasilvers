import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateRegularPDF = sale => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // ===== HEADER SECTION =====
    const logoPath = '/SBA2.jpg';
    try {
      doc.addImage(logoPath, 'JPEG', 10, yPosition, 30, 20);
    } catch (error) {
      // console.log('Logo not found');
    }

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('|| Shree Dhuluba Prasan ||', pageWidth / 2, yPosition + 8, { align: 'center' });

    doc.setFontSize(14);
    doc.text('REGULAR BILLING INVOICE', pageWidth / 2, yPosition + 14, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    // Voucher & Date (Right Aligned)
    doc.text(`Voucher: ${sale.voucherNumber}`, pageWidth - 15, yPosition + 8, { align: 'right' });
    doc.text(`Date: ${new Date(sale.saleDate).toLocaleDateString('en-GB')}`, pageWidth - 15, yPosition + 13, { align: 'right' });

    yPosition += 28;

    // Customer Details
    doc.setFont(undefined, 'bold');
    doc.text('Customer:', 15, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(sale.customer?.name || 'N/A', 35, yPosition);

    yPosition += 5;
    if (sale.customer?.address) {
      const addressLines = doc.splitTextToSize(sale.customer.address, 100); // Limit width
      doc.text(addressLines, 35, yPosition);
      yPosition += (addressLines.length * 5);
    }
    if (sale.customer?.phone) {
      doc.text(`Phone: ${sale.customer.phone}`, 35, yPosition);
      yPosition += 5;
    }
    yPosition += 5; // Spacing before table

    // ===== TABLE DATA PREPARATION =====

    // 1. Items
    const tableBody = [];
    let totalGross = 0;
    let totalStone = 0;

    sale.items?.forEach((item, idx) => {
      const gross = parseFloat(item.grossWeight || 0);
      const stone = parseFloat(item.stoneWeight || 0);
      const net = parseFloat(item.netWeight || 0);
      const touch = parseFloat(item.touch || 0);
      const wastage = parseFloat(item.wastage || 0);
      const laborRate = parseFloat(item.laborRatePerKg || 0); // New
      const silver = parseFloat(item.silverWeight || 0);
      const labor = parseFloat(item.laborCharges || 0);

      totalGross += gross;
      totalStone += stone;

      tableBody.push([
        idx + 1,
        item.description,
        item.stamp || '-',
        item.pieces,
        gross.toFixed(3),
        stone.toFixed(3),
        net.toFixed(3),
        touch.toFixed(2),
        wastage.toFixed(3),
        laborRate.toFixed(0), // New Col: Labor Rate
        silver.toFixed(3),
        labor.toFixed(2)      // Renamed: Amount
      ]);
    });

    // 2. TOTAL Row
    tableBody.push([
      { content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold', halign: 'center' } },
      { content: totalGross.toFixed(3), styles: { fontStyle: 'bold' } },
      { content: totalStone.toFixed(3), styles: { fontStyle: 'bold' } },
      { content: parseFloat(sale.totalNetWeight || 0).toFixed(3), styles: { fontStyle: 'bold' } },
      '',
      '',
      '', // Labor Rate empty
      { content: parseFloat(sale.totalSilverWeight || 0).toFixed(3), styles: { fontStyle: 'bold' } },
      { content: parseFloat(sale.totalLaborCharges || 0).toFixed(2), styles: { fontStyle: 'bold' } }
    ]);


    // 3. Previous Due Row
    // Use stored values explicitly
    const prevSilver = parseFloat(sale.previousBalanceSilver || 0);
    const prevLabor = parseFloat(sale.previousBalanceLabor || 0);

    tableBody.push([
      { content: 'Previous Due', colSpan: 9, styles: { fontStyle: 'bold', fillColor: [255, 250, 205] } }, // span -> 9
      { content: 'Silver', styles: { fontStyle: 'bold', halign: 'right', fillColor: [255, 250, 205] } }, // Col 9 (Labor Rate col)
      { content: prevSilver.toFixed(3), styles: { fontStyle: 'bold', fillColor: [255, 250, 205] } },      // Col 10 (Silver)
      { content: prevLabor.toFixed(2), styles: { fontStyle: 'bold', fillColor: [255, 250, 205] } }       // Col 11 (Amount)
    ]);


    // 4. Transactions
    const paymentTxns = sale.transactions?.filter(t => t.type !== 'sale') || [];
    paymentTxns.forEach(txn => {
      let label = '';
      if (txn.type === 'silver_payment') label = 'Silver Payment';
      else if (txn.type === 'cash_for_silver') label = 'Cash for Silver';
      else if (txn.type === 'labor_payment') label = 'Labor Payment';
      else if (txn.type === 'return_silver') label = 'Return Silver';
      else label = txn.type;

      // Sanitize note
      let notes = (txn.notes || '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();

      let displaySilver = null;
      let displayLabor = null; // Used for Amount column

      if (txn.type === 'cash_for_silver') {
        const w = parseFloat(txn.silverWeight || 0);
        const amt = parseFloat(txn.cashAmount || 0);

        if (!notes.toLowerCase().includes('paid')) {
          notes = `${notes} (Paid Rs.${amt.toFixed(2)} for ${Math.abs(w).toFixed(3)}g)`;
        }

        displaySilver = parseFloat(txn.silverWeight || 0).toFixed(3);
        displayLabor = amt.toFixed(2);
      }
      else if (txn.type === 'labor_payment') {
        const amt = parseFloat(txn.laborAmount || 0);
        displayLabor = amt.toFixed(2);
      }
      else {
        // Standard (Silver Payment, Return)
        if (parseFloat(txn.silverWeight || 0) !== 0) displaySilver = parseFloat(txn.silverWeight).toFixed(3);
        if (parseFloat(txn.laborAmount || 0) !== 0) displayLabor = parseFloat(txn.laborAmount).toFixed(2);
      }

      const fullDesc = `${label} - ${notes}`;

      tableBody.push([
        { content: fullDesc, colSpan: 9, styles: {} },
        { content: 'Silver', styles: { halign: 'right', textColor: [100, 100, 100], fontSize: 8 } },
        { content: displaySilver || '-', styles: {} },
        { content: displayLabor || '-', styles: {} }
      ]);
    });


    // 5. Closing Balance
    tableBody.push([
      { content: 'Closing Balance', colSpan: 9, styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }, // Light AliceBlue
      { content: 'Silver', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 248, 255] } },
      { content: parseFloat(sale.balanceSilver || 0).toFixed(3), styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } },
      { content: parseFloat(sale.balanceLabor || 0).toFixed(2), styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }
    ]);


    // GENERATE TABLE
    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Desc', 'Stamp', 'Pcs', 'Gross', 'Stone', 'Net', 'Touch', 'Wastage', 'Labor /kg', 'Silver (g)', 'Amount']],
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 1,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' }, // #
        // Desc auto
        // Stamp auto
        3: { cellWidth: 10, halign: 'center' }, // Pcs
        4: { halign: 'right' }, // Gross
        5: { halign: 'right' }, // Stone
        6: { halign: 'right' }, // Net
        7: { halign: 'right' }, // Touch
        8: { halign: 'right' }, // Wastage
        9: { halign: 'right' }, // Labor Rate
        10: { halign: 'right', fontStyle: 'bold' }, // Silver
        11: { halign: 'right', fontStyle: 'bold' } // Amount
      },
      didParseCell: (data) => {
        // Optional: Custom styling logic if needed per cell
      }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // ===== STATUS & FOOTER =====

    // Status
    let statusText = '';
    let statusColor = [0, 0, 0];
    if (sale.status === 'paid') {
      statusText = 'FULLY PAID';
      statusColor = [0, 128, 0];
    } else if (sale.status === 'partial') {
      statusText = 'PARTIALLY PAID';
      statusColor = [255, 140, 0];
    } else {
      statusText = 'PENDING';
      statusColor = [255, 0, 0];
    }

    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(statusText, pageWidth - 15, finalY, { align: 'right' });

    // Footer
    const footerY = pageHeight - 10;
    doc.setTextColor(150);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('This is a computer-generated document.', pageWidth / 2, footerY, { align: 'center' });

    doc.save(`${sale.voucherNumber}_Regular_Invoice.pdf`);

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Error generating PDF: ' + error.message);
  }
};

export const generateLedgerPDF = (ledgerData, customer) => {
  try {
    const doc = new jsPDF();

    // HEADER
    doc.setFontSize(18);
    doc.setTextColor(41, 128, 185);
    doc.text('CUSTOMER LEDGER STATEMENT', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 28);

    // Customer Details
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Customer: ${customer.name}`, 14, 40);

    let yPos = 46;
    if (customer.phone) {
      doc.text(`Phone: ${customer.phone}`, 14, yPos);
      yPos += 6;
    }
    if (customer.address) {
      const addressLines = doc.splitTextToSize(`Address: ${customer.address}`, 180);
      doc.text(addressLines, 14, yPos);
    }

    const tableBody = [];

    // Parse Transactions
    ledgerData.transactions.forEach(txn => {
      const date = new Date(txn.transactionDate).toLocaleDateString('en-GB');
      const type = txn.type.replace(/_/g, ' ').toUpperCase();
      const notes = txn.notes || '-';

      const sDebit = parseFloat(txn.silverWeight) > 0 ? parseFloat(txn.silverWeight) : 0;
      const sCredit = parseFloat(txn.silverWeight) < 0 ? Math.abs(parseFloat(txn.silverWeight)) : 0;

      const lAmt = parseFloat(txn.laborAmount) || 0;
      const cAmt = parseFloat(txn.cashAmount) || 0;

      let laborDebit = 0;
      let laborCredit = 0;

      if (lAmt > 0) laborDebit = lAmt;

      // Credit logic to match View Modal: negative labor OR positive cash
      if (lAmt < 0) laborCredit = Math.abs(lAmt);
      else if (cAmt > 0) laborCredit = cAmt;

      tableBody.push([
        date,
        { content: `${type}\n${notes}`, styles: { fontSize: 8 } },

        // Silver
        sDebit > 0 ? sDebit.toFixed(3) : '-',
        sCredit > 0 ? sCredit.toFixed(3) : '-',
        { content: parseFloat(txn.balanceSilverAfter).toFixed(3), styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },

        // Amount
        laborDebit > 0 ? laborDebit.toFixed(2) : '-',
        laborCredit > 0 ? laborCredit.toFixed(2) : '-',
        { content: parseFloat(txn.balanceLaborAfter).toFixed(2), styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
      ]);
    });

    autoTable(doc, {
      startY: 60,
      head: [[
        'Date', 'Particulars',
        'Silver Dr', 'Silver Cr', 'Silver Bal',
        'Amt Dr', 'Amt Cr', 'Amt Bal'
      ]],
      body: tableBody,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 25 }, // Date
        1: { cellWidth: 60 }, // Particulars
        2: { halign: 'right', textColor: [200, 100, 0] }, // Silver Dr
        3: { halign: 'right', textColor: [0, 100, 0] },   // Silver Cr
        4: { halign: 'right', fontStyle: 'bold' },        // Silver Bal
        5: { halign: 'right', textColor: [100, 0, 100] }, // Amt Dr
        6: { halign: 'right', textColor: [0, 0, 200] },   // Amt Cr
        7: { halign: 'right', fontStyle: 'bold' },        // Amt Bal
      },
      theme: 'grid'
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
    }

    doc.save(`Ledger_${customer.name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
  } catch (error) {
    console.error('Error generating Ledger PDF:', error);
    alert('Error generating Ledger PDF: ' + error.message);
  }
};
