import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDate } from './dateUtils';

export const generateBillPDF = (sale, customer) => {
  const doc = new jsPDF();

  // Company header (Compact & Moved Up)
  doc.setFillColor(25, 47, 89); // Navy blue
  doc.rect(0, 0, 210, 16, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text('BILLING', 105, 10.5, { align: 'center' });
  
  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.text(`Date: ${formatDate(sale.saleDate)}`, 195, 10.5, { align: 'right' });

  // Customer info (Compact)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Customer: ${customer.name}`, 14, 22);
  doc.setFont(undefined, 'normal');
  doc.text(`Billing Date: ${formatDate(sale.saleDate)}`, 195, 22, { align: 'right' });

  // Table data
  const tableData = sale.items.map(item => [
    item.description,
    parseFloat(item.netWeight).toFixed(3),
    parseFloat(sale.silverRate).toFixed(2),
    parseFloat(item.touch).toFixed(2),
    parseFloat(item.wastage).toFixed(3),
    item.hihob || '50%',
    parseFloat(item.laborCharges).toFixed(2),
    Math.round(parseFloat(item.silverWeight)).toString(),
    parseFloat(item.itemAmount).toFixed(2)
  ]);

  // Add table
  doc.autoTable({
    startY: 27,
    head: [['Product', 'Net Wt', 'Price', 'Touch', 'Wastage', 'Hi/Hob', 'Labour', 'Silver', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [25, 47, 89],
      textColor: 255,
      fontSize: 9
    },
    columnStyles: {
      7: { textColor: [255, 140, 0] }, // Orange for Silver
      8: { textColor: [0, 128, 0] }    // Green for Amount
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    }
  });

  // Totals
  const finalY = doc.lastAutoTable.finalY + 10;
  
  doc.setFontSize(11);
  doc.text('Total:', 120, finalY);
  doc.setTextColor(255, 140, 0);
  doc.text(Math.round(parseFloat(sale.totalSilverWeight)).toString(), 160, finalY);
  doc.setTextColor(0, 128, 0);
  doc.text(parseFloat(sale.totalAmount).toFixed(2), 180, finalY);

  // Previous dues
  if (sale.previousBalance > 0) {
    doc.setTextColor(0, 0, 0);
    doc.text('Dues:', 120, finalY + 7);
    doc.setTextColor(255, 140, 0);
    doc.text(parseFloat(sale.previousBalance).toFixed(2), 160, finalY + 7);
  }

  // Closing balance
  doc.setTextColor(0, 0, 0);
  doc.text('Closing Balance:', 120, finalY + 14);
  doc.setTextColor(0, 128, 0);
  doc.text(parseFloat(sale.closingBalance).toFixed(2), 180, finalY + 14);

  // Description
  if (sale.notes) {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Description:', 14, finalY + 25);
    doc.setFontSize(9);
    doc.text(sale.notes, 14, finalY + 32, { maxWidth: 180 });
  }

  // Save
  doc.save(`bill-${sale.voucherNumber}.pdf`);
};
