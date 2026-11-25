import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToWords } from './numberToWords';
import { formatDate } from './dateUtils';

/**
 * Generate Kharedi (Purchase) Voucher PDF
 * Notice: DOES NOT include "Type" anywhere on the PDF!
 * Compact Header & Moved Up
 */
export const generateKharediPDF = (entry) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 6;

    // Header Logo (if present)
    try {
      doc.addImage('/SBA2.jpg', 'JPEG', 8, yPos, 16, 12);
    } catch (e) {
      // ignore
    }

    // Top Title (Compact)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('|| Shree Dhuluba Prasan ||', pageWidth / 2, yPos + 3.5, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9); // Amber/Brass
    doc.text('PITAL KAAM - KHAREDI VOUCHER', pageWidth / 2, yPos + 8, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Brass Raw Material Purchase Receipt', pageWidth / 2, yPos + 11.5, { align: 'center' });

    yPos += 14;

    // Party & Voucher Box (STRICTLY NO "Type" field)
    const boxH = 12;
    doc.setDrawColor(210, 215, 220);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(8, yPos, pageWidth - 16, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30);

    // Left Column
    doc.text('Voucher No:', 12, yPos + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${entry.billNo || '-'}`, 32, yPos + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Party Name:', 12, yPos + 9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${entry.name || '-'}`, 32, yPos + 9);

    // Right Column (Date only, NO type!)
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', pageWidth - 38, yPos + 6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatDate(entry.date)}`, pageWidth - 28, yPos + 6.5);

    yPos += boxH + 3;

    // Table
    const kg = parseFloat(entry.kg || 0);
    const rate = parseFloat(entry.ratePerKg || 0);
    const total = parseFloat(entry.total || (kg * rate));

    const tableData = [
      [
        '1',
        'Pital (Brass) Raw Material',
        `${kg.toFixed(3)} kg`,
        `Rs. ${rate.toFixed(2)}`,
        `Rs. ${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]
    ];

    autoTable(doc, {
      startY: yPos,
      margin: { left: 10, right: 10 },
      head: [['#', 'Item Description', 'Weight (kg)', 'Rate / kg', 'Total Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [180, 83, 9], // Amber/Brass
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 26 },
        3: { halign: 'right', cellWidth: 26 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 32 }
      }
    });

    yPos = doc.lastAutoTable.finalY + 4;

    // Total In Words Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50);
    let words = '';
    try {
      words = numberToWords ? numberToWords(Math.round(total)) : '';
    } catch (e) {
      words = '';
    }
    if (words) {
      doc.text(`Amount in Words: ${words} Rupees Only`, 10, yPos + 4);
      yPos += 8;
    }

    if (entry.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100);
      doc.text(`Notes: ${entry.notes}`, 10, yPos + 4);
      yPos += 8;
    }

    // Signatures
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text('Receiver / Party Signature', 10, pageHeight - 12);
    doc.text('Authorized Signature', pageWidth - 10, pageHeight - 12, { align: 'right' });

    // Save
    doc.save(`Kharedi_${entry.billNo || 'Voucher'}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating Kharedi PDF:', error);
    alert('Failed to generate PDF: ' + error.message);
    return false;
  }
};

/**
 * Generate Veekhari (Sales) Bill PDF
 * Notice: STRICTLY NO "Type" and NO "takenRatePerKg" on this PDF!
 */
export const generateVeekhariPDF = (entry) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 6;

    // Header Logo (if present)
    try {
      doc.addImage('/SBA2.jpg', 'JPEG', 8, yPos, 16, 12);
    } catch (e) {
      // ignore
    }

    // Top Title (Compact)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('|| Shree Dhuluba Prasan ||', pageWidth / 2, yPos + 3.5, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129); // Emerald Green
    doc.text('PITAL KAAM - VEEKHARI ESTIMATE / BILL', pageWidth / 2, yPos + 8, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Brass Material Sales Voucher', pageWidth / 2, yPos + 11.5, { align: 'center' });

    yPos += 14;

    // Customer & Bill Box (STRICTLY NO "Type" field)
    const boxH = 12;
    doc.setDrawColor(210, 215, 220);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(8, yPos, pageWidth - 16, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30);

    // Left Column
    doc.text('Bill No:', 12, yPos + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${entry.billNo || '-'}`, 30, yPos + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Customer:', 12, yPos + 9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${entry.name || '-'}`, 30, yPos + 9);

    // Right Column (Date only, NO type!)
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', pageWidth - 38, yPos + 6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatDate(entry.date)}`, pageWidth - 28, yPos + 6.5);

    yPos += boxH + 3;

    // Table (ONLY product name, weight, rate, total. NO taken rate, NO profit!)
    const items = (entry.items && Array.isArray(entry.items) && entry.items.length > 0)
      ? entry.items
      : [{
          productName: 'Pital (Brass) Material',
          kg: parseFloat(entry.kg || 0),
          ratePerKg: parseFloat(entry.ratePerKg || 0),
          total: parseFloat(entry.total || 0)
        }];

    let sumKg = 0;
    let sumTotal = 0;

    const tableData = items.map((it, idx) => {
      const itKg = parseFloat(it.kg || 0);
      const itRate = parseFloat(it.ratePerKg || 0);
      const itTotal = parseFloat(it.total !== undefined ? it.total : (itKg * itRate));
      sumKg += itKg;
      sumTotal += itTotal;
      return [
        String(idx + 1),
        it.productName || 'Pital Material',
        `${itKg.toFixed(3)} kg`,
        `Rs. ${itRate.toFixed(2)}`,
        `Rs. ${itTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });

    if (items.length > 1) {
      tableData.push([
        'Total',
        'Grand Total',
        `${sumKg.toFixed(3)} kg`,
        '',
        `Rs. ${sumTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
    }

    const finalTotal = sumTotal > 0 ? sumTotal : (parseFloat(entry.total) || 0);

    autoTable(doc, {
      startY: yPos,
      margin: { left: 10, right: 10 },
      head: [['#', 'Item Description', 'Weight (kg)', 'Rate / kg', 'Total Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129], // Green
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 26 },
        3: { halign: 'right', cellWidth: 26 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 32 }
      },
      didParseCell: (data) => {
        if (items.length > 1 && data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 243, 246];
        }
      }
    });

    yPos = doc.lastAutoTable.finalY + 4;

    // Total In Words Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50);
    let words = '';
    try {
      words = numberToWords ? numberToWords(Math.round(finalTotal)) : '';
    } catch (e) {
      words = '';
    }
    if (words) {
      doc.text(`Amount in Words: ${words} Rupees Only`, 10, yPos + 4);
      yPos += 8;
    }

    if (entry.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100);
      doc.text(`Notes: ${entry.notes}`, 10, yPos + 4);
      yPos += 8;
    }

    // Signatures
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text('Customer Signature', 10, pageHeight - 12);
    doc.text('Authorized Signature', pageWidth - 10, pageHeight - 12, { align: 'right' });

    // Save
    doc.save(`Veekhari_${entry.billNo || 'Bill'}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating Veekhari PDF:', error);
    alert('Failed to generate PDF: ' + error.message);
    return false;
  }
};

/**
 * Generate Customer/Party Ledger Statement PDF
 * Strictly separated for Kharedi party or Veekhari customer. NO "Type" column!
 */
export const generateCustomerLedgerPDF = (customerName, customerType = 'kharedi', entries = [], summary = {}) => {
  try {
    const isKharedi = customerType === 'kharedi';
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 8;

    // Header (Compact & Moved Up)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('|| Shree Dhuluba Prasan ||', pageWidth / 2, yPos + 4, { align: 'center' });

    doc.setFontSize(9.5);
    doc.setTextColor(isKharedi ? 180 : 16, isKharedi ? 83 : 185, isKharedi ? 9 : 129);
    doc.text(
      isKharedi ? 'PITAL KAAM - KHAREDI PARTY STATEMENT' : 'PITAL KAAM - VEEKHARI CUSTOMER STATEMENT',
      pageWidth / 2,
      yPos + 9,
      { align: 'center' }
    );

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`${isKharedi ? 'Party Name' : 'Customer Name'}: ${customerName}`, pageWidth / 2, yPos + 13.5, { align: 'center' });

    yPos += 17;

    // Summary Box
    doc.setDrawColor(220);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(12, yPos, pageWidth - 24, 12, 1.5, 1.5, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(30);

    const totalKg = summary.totalKg || 0;
    const totalAmount = summary.totalAmount || 0;
    const avgRate = summary.avgRate || (totalKg > 0 ? totalAmount / totalKg : 0);

    doc.setFont('helvetica', 'bold');
    doc.text(`Total Weight:`, 16, yPos + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`${parseFloat(totalKg).toFixed(3)} kg`, 38, yPos + 7);

    doc.setFont('helvetica', 'bold');
    doc.text(`Total Amount:`, 75, yPos + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rs. ${parseFloat(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 98, yPos + 7);

    doc.setFont('helvetica', 'bold');
    doc.text(`Average Rate:`, pageWidth - 60, yPos + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rs. ${parseFloat(avgRate).toFixed(2)} / kg`, pageWidth - 38, yPos + 7);

    yPos += 15;

    // Table (STRICTLY NO "Type" column!)
    const rows = entries.map((e, idx) => [
      idx + 1,
      formatDate(e.date),
      e.billNo || '-',
      `${parseFloat(e.kg).toFixed(3)} kg`,
      `Rs. ${parseFloat(e.ratePerKg).toFixed(2)}`,
      `Rs. ${parseFloat(e.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `${parseFloat(e.runningKg || 0).toFixed(3)} kg`
    ]);

    autoTable(doc, {
      startY: yPos,
      margin: { left: 14, right: 14 },
      head: [['#', 'Date', 'Bill No.', 'Weight (kg)', 'Rate / kg', 'Total Amount', 'Cumulative Wt']],
      body: rows.length > 0 ? rows : [['-', '-', '-', 'No transactions found', '-', '-', '-']],
      theme: 'grid',
      headStyles: {
        fillColor: isKharedi ? [180, 83, 9] : [16, 185, 129],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 26 },
        2: { halign: 'center', cellWidth: 32 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 28 },
        5: { halign: 'right', fontStyle: 'bold', cellWidth: 'auto' },
        6: { halign: 'right', cellWidth: 28 }
      }
    });

    doc.save(`${isKharedi ? 'Kharedi' : 'Veekhari'}_Ledger_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating Customer Ledger PDF:', error);
    alert('Failed to generate Customer Ledger PDF: ' + error.message);
    return false;
  }
};
