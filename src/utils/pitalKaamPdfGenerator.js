import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToWords } from './numberToWords';

/**
 * Generate Kharedi (Purchase) Voucher PDF
 * Notice: DOES NOT include "Type" anywhere on the PDF!
 */
export const generateKharediPDF = (entry) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 12;

    // Header Logo (if present)
    try {
      doc.addImage('/SBA2.jpg', 'JPEG', 10, yPos, 20, 16);
    } catch (e) {
      // ignore
    }

    // Top Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('|| Shree Dhuluba Prasan ||', pageWidth / 2, yPos + 5, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(180, 83, 9); // Amber/Brass
    doc.text('PITAL KAAM - KHAREDI VOUCHER', pageWidth / 2, yPos + 11, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Brass Raw Material Purchase Receipt', pageWidth / 2, yPos + 16, { align: 'center' });

    yPos += 22;

    // Party & Voucher Box (STRICTLY NO "Type" field)
    doc.setDrawColor(210, 215, 220);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(10, yPos, pageWidth - 20, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30);

    // Left Column
    doc.text('Voucher No:', 14, yPos + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`${entry.billNo || '-'}`, 36, yPos + 6);

    doc.setFont('helvetica', 'bold');
    doc.text('Party Name:', 14, yPos + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${entry.name || '-'}`, 36, yPos + 12);

    // Right Column (Date only, NO type!)
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', pageWidth - 42, yPos + 9);
    doc.setFont('helvetica', 'normal');
    const dateStr = entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : '-';
    doc.text(`${dateStr}`, pageWidth - 32, yPos + 9);

    yPos += 20;

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
    let yPos = 12;

    // Header Logo (if present)
    try {
      doc.addImage('/SBA2.jpg', 'JPEG', 10, yPos, 20, 16);
    } catch (e) {
      // ignore
    }

    // Top Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('|| Shree Dhuluba Prasan ||', pageWidth / 2, yPos + 5, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129); // Emerald Green
    doc.text('PITAL KAAM - VEEKHARI ESTIMATE / BILL', pageWidth / 2, yPos + 11, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Brass Material Sales Voucher', pageWidth / 2, yPos + 16, { align: 'center' });

    yPos += 22;

    // Customer & Bill Box (STRICTLY NO "Type" field)
    doc.setDrawColor(210, 215, 220);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(10, yPos, pageWidth - 20, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30);

    // Left Column
    doc.text('Bill No:', 14, yPos + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`${entry.billNo || '-'}`, 32, yPos + 6);

    doc.setFont('helvetica', 'bold');
    doc.text('Customer:', 14, yPos + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${entry.name || '-'}`, 32, yPos + 12);

    // Right Column (Date only, NO type!)
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', pageWidth - 42, yPos + 9);
    doc.setFont('helvetica', 'normal');
    const dateStr = entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : '-';
    doc.text(`${dateStr}`, pageWidth - 32, yPos + 9);

    yPos += 20;

    // Table (ONLY weight, rate, total. NO taken rate, NO profit!)
    const kg = parseFloat(entry.kg || 0);
    const rate = parseFloat(entry.ratePerKg || 0);
    const total = parseFloat(entry.total || (kg * rate));

    const tableData = [
      [
        '1',
        'Pital (Brass) Material',
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
    let yPos = 14;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('|| Shree Dhuluba Prasan ||', pageWidth / 2, yPos + 5, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(isKharedi ? 180 : 16, isKharedi ? 83 : 185, isKharedi ? 9 : 129);
    doc.text(
      isKharedi ? 'PITAL KAAM - KHAREDI PARTY STATEMENT' : 'PITAL KAAM - VEEKHARI CUSTOMER STATEMENT',
      pageWidth / 2,
      yPos + 12,
      { align: 'center' }
    );

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`${isKharedi ? 'Party Name' : 'Customer Name'}: ${customerName}`, pageWidth / 2, yPos + 17, { align: 'center' });

    yPos += 24;

    // Summary Box
    doc.setDrawColor(220);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, yPos, pageWidth - 28, 16, 2, 2, 'FD');

    doc.setFontSize(8.5);
    doc.setTextColor(30);

    const totalKg = summary.totalKg || 0;
    const totalAmount = summary.totalAmount || 0;
    const avgRate = summary.avgRate || (totalKg > 0 ? totalAmount / totalKg : 0);

    doc.setFont('helvetica', 'bold');
    doc.text(`Total Weight:`, 18, yPos + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`${parseFloat(totalKg).toFixed(3)} kg`, 42, yPos + 7);

    doc.setFont('helvetica', 'bold');
    doc.text(`Total Amount:`, 80, yPos + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rs. ${parseFloat(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 105, yPos + 7);

    doc.setFont('helvetica', 'bold');
    doc.text(`Average Rate:`, pageWidth - 60, yPos + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rs. ${parseFloat(avgRate).toFixed(2)} / kg`, pageWidth - 35, yPos + 7);

    yPos += 22;

    // Table (STRICTLY NO "Type" column!)
    const rows = entries.map((e, idx) => [
      idx + 1,
      e.date ? new Date(e.date).toLocaleDateString('en-GB') : '-',
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
