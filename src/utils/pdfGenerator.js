import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePDF = (sale) => {
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

    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('|| Shree Dhuluba Prasan ||', pageWidth / 2, yPosition + 8, { align: 'center' });

    doc.setFontSize(12);
    doc.text('INVOICE', pageWidth / 2, yPosition + 14, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');


    yPosition += 28;

    // Customer Details
    doc.setFont(undefined, 'bold');
    doc.text('Customer:', 15, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(sale.customer?.name || 'N/A', 35, yPosition);

    // Voucher & Date (Right Aligned)
    doc.text(`Voucher: ${sale.voucherNumber}`, pageWidth - 15, yPosition + 8, { align: 'right' });
    doc.text(`Date: ${new Date(sale.saleDate).toLocaleDateString('en-GB')}`, pageWidth - 15, yPosition + 13, { align: 'right' });

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
      const laborRate = parseFloat(item.laborRatePerKg || 0);
      const silver = parseFloat(item.silverWeight || 0);
      const amount = parseFloat(item.itemAmount || 0);

      totalGross += gross;
      totalStone += stone;

      const tounch = touch + wastage;
      tableBody.push([
        idx + 1,
        item.description || '-',
        '-', // Stamp column (placeholder matching Regular design)
        item.pieces || 1,
        gross.toFixed(3),
        stone.toFixed(3),
        net.toFixed(3),
        tounch.toFixed(2),
        wastage.toFixed(3),
        laborRate.toFixed(0),
        silver.toFixed(3),
        amount.toFixed(2)
      ]);
    });

    // 2. TOTAL Row
    // 2. TOTAL Row
    tableBody.push([
      { content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold', halign: 'center' } },
      { content: totalGross.toFixed(3), styles: { fontStyle: 'bold' } },
      { content: totalStone.toFixed(3), styles: { fontStyle: 'bold' } },
      { content: parseFloat(sale.totalNetWeight || 0).toFixed(3), styles: { fontStyle: 'bold' } },
      '',
      '', // Spacer for Labor/kg (Touch covered by previous)
      { content: parseFloat(sale.totalSilverWeight || 0).toFixed(3), styles: { fontStyle: 'bold' } },
      { content: (parseFloat(sale.subtotal || 0)).toFixed(2), styles: { fontStyle: 'bold' } }
    ]);

    // CGST/SGST Rows if applicable
    if (sale.gstApplicable) {
      tableBody.push([
        { content: 'CGST', colSpan: 10, styles: { halign: 'right' } }, // Reduced span to match 11 cols (10+1)
        { content: parseFloat(sale.cgst || 0).toFixed(2), styles: { fontStyle: 'bold' } }
      ]);
      tableBody.push([
        { content: 'SGST', colSpan: 10, styles: { halign: 'right' } },
        { content: parseFloat(sale.sgst || 0).toFixed(2), styles: { fontStyle: 'bold' } }
      ]);
      // Grand Total after Tax
      tableBody.push([
        { content: 'Grand Total (Amount)', colSpan: 10, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: parseFloat(sale.totalAmount || 0).toFixed(2), styles: { fontStyle: 'bold' } }
      ]);
    }


    // 3. Previous Due Row
    const prevSilver = parseFloat(sale.previousBalanceSilver || 0);
    const prevLabor = parseFloat(sale.previousBalanceLabor || 0);

    tableBody.push([
      { content: 'Previous Balance', colSpan: 8, styles: { fontStyle: 'bold', halign: 'left', fillColor: [255, 250, 205] } },
      { content: 'Silver', styles: { fontStyle: 'bold', halign: 'right', fillColor: [255, 250, 205] } },
      { content: prevSilver.toFixed(3), styles: { fontStyle: 'bold', fillColor: [255, 250, 205] } },
      { content: prevLabor.toFixed(2), styles: { fontStyle: 'bold', fillColor: [255, 250, 205] } }
    ]);

    // 4. Transactions (Simulated or Real)
    // If backend provides transactions, parse them.
    const transactions = sale.transactions?.filter(t => t.type !== 'sale') || [];

    if (transactions.length > 0) {
      transactions.forEach(txn => {
        let label = txn.type.replace('_', ' ').toUpperCase();
        let notes = (txn.notes || '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();

        // Determine amounts
        let displaySilver = null;
        let displayLabor = null;

        if (txn.type === 'cash_for_silver') {
          const w = parseFloat(txn.silverWeight || 0);
          // Show Cash Value from cashAmount
          const amt = parseFloat(txn.cashAmount || 0);
          displaySilver = Math.abs(w).toFixed(3);
          displayLabor = Math.abs(amt).toFixed(2);
          label = "CASH FOR SILVER";
        } else {
          if (parseFloat(txn.silverWeight || 0) !== 0) displaySilver = parseFloat(txn.silverWeight).toFixed(3);
          if (parseFloat(txn.amount || 0) !== 0) displayLabor = Math.abs(parseFloat(txn.amount)).toFixed(2);
        }

        tableBody.push([
          { content: `${label} - ${notes}`, colSpan: 8, styles: { fontSize: 8, halign: 'left' } },
          { content: 'Silver', styles: { halign: 'right', fontSize: 8 } },
          { content: displaySilver || '-', styles: {} },
          { content: displayLabor || '-', styles: {} }
        ]);
      });
    }

    // 5. Closing Balance
    tableBody.push([
      { content: 'Closing Balance', colSpan: 8, styles: { fontStyle: 'bold', halign: 'left', fillColor: [240, 248, 255] } },
      { content: 'Silver', styles: { fontStyle: 'bold', fillColor: [240, 248, 255], halign: 'right' } },
      { content: parseFloat(sale.balanceSilver || 0).toFixed(3), styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } },
      { content: parseFloat(sale.balanceLabor || 0).toFixed(2), styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }
    ]);


    // GENERATE TABLE
    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Desc', 'Stamp', 'Pcs', 'Gross', 'Stone', 'Net', 'Touch', 'Labor /kg', 'Silver (g)', 'Amount']],
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
        8: { halign: 'right' }, // Labor Rate
        9: { halign: 'right', fontStyle: 'bold' }, // Silver
        10: { halign: 'right', fontStyle: 'bold' } // Amount
      },
      didParseCell: (data) => {
        // Optional custom styling
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

    doc.save(`${sale.voucherNumber}_Wholesale_Invoice.pdf`);

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Error generating PDF: ' + error.message);
  }
};
