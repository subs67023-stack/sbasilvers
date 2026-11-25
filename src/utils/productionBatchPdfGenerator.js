import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './dateUtils';

/**
 * Generate Production Batch Statement & Costing PDF
 * Raw Material Purchase (X kg @ Y amount) -> Jewelry Pieces Produced & Sold -> Net Remaining Profit
 * Compact & Moved Up Header
 */
export const generateProductionBatchPDF = (batch) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 7;

    // Header Logo (if present)
    try {
      doc.addImage('/SBA2.jpg', 'JPEG', 12, yPos, 20, 13);
    } catch (e) {
      // Ignore if image missing
    }

    // Company Header (Compact)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('|| Shree Dhuluba Prasan ||', pageWidth / 2, yPos + 4, { align: 'center' });

    doc.setFontSize(9.5);
    doc.setTextColor(30, 64, 175); // Royal Blue
    doc.text('PRODUCTION BATCH & COSTING STATEMENT', pageWidth / 2, yPos + 8.5, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Raw Material Purchase, Jewelry Manufacturing & Profit / Cost Reduction Report', pageWidth / 2, yPos + 12, { align: 'center' });

    yPos += 15;

    // Batch Meta Details Box (Compact)
    const boxH = 16;
    doc.setDrawColor(220, 225, 230);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(12, yPos, pageWidth - 24, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30);

    const leftCol = 16;
    const midCol = 75;
    const rightCol = 140;

    // Row 1
    doc.text('Batch No.:', leftCol, yPos + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${batch.batchNumber || '-'}`, leftCol + 18, yPos + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Date:', midCol, yPos + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatDate(batch.date)}`, midCol + 12, yPos + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Status:', rightCol, yPos + 5.5);
    doc.setFont('helvetica', 'normal');
    const statusText = batch.status === 'completed' ? 'Completed' : batch.status === 'partially_sold' ? 'Partially Sold' : 'In Production';
    doc.text(statusText, rightCol + 14, yPos + 5.5);

    // Row 2
    doc.setFont('helvetica', 'bold');
    doc.text('Batch Name:', leftCol, yPos + 11.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${batch.batchName || 'General Production'}`, leftCol + 20, yPos + 11.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Supplier:', midCol, yPos + 11.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${batch.supplierName || 'Self / In-house'}`, midCol + 16, yPos + 11.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Touch / Purity:', rightCol, yPos + 11.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${batch.touch || 100}%`, rightCol + 22, yPos + 11.5);

    yPos += boxH + 5;

    // RAW MATERIAL PURCHASE SUMMARY (X kg @ Y amount)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('1. Raw Material Purchase Input (X kg / gm @ Y Cost)', 14, yPos);
    yPos += 4;

    const rawUnit = batch.rawMaterialUnit || 'kg';
    const rawWeight = parseFloat(batch.rawMaterialWeight || 0);
    const rawCost = parseFloat(batch.rawMaterialCost || 0);
    const rawRate = parseFloat(batch.rawMaterialRate || 0);
    const otherExp = parseFloat(batch.otherExpenses || 0);

    const rawMaterialRows = [
      [
        `Raw Material Weight (X)`,
        `${rawWeight.toFixed(3)} ${rawUnit} (${rawUnit === 'kg' ? (rawWeight * 1000).toFixed(2) + ' g' : (rawWeight / 1000).toFixed(3) + ' kg'})`
      ],
      [
        `Total Purchase Amount (Y)`,
        `Rs. ${rawCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ],
      [
        `Unit Bhav / Purchase Rate`,
        `Rs. ${rawRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per ${rawUnit}`
      ]
    ];

    if (otherExp > 0) {
      rawMaterialRows.push([
        `Other Making / Overhead Expenses`,
        `Rs. ${otherExp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
    }

    autoTable(doc, {
      startY: yPos,
      margin: { left: 14, right: 14 },
      head: [['Parameter', 'Purchase Details']],
      body: rawMaterialRows,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.2
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { cellWidth: 'auto' }
      }
    });

    yPos = doc.lastAutoTable.finalY + 8;

    // JEWELRY PIECES PRODUCED & SOLD
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('2. Jewelry Pieces Produced & Revenue Earned', 14, yPos);
    yPos += 4;

    const items = batch.items || [];
    const itemRows = items.map((item, index) => {
      const pcs = parseInt(item.pieces || 0, 10);
      const wtPerPc = parseFloat(item.weightPerPiece || 0);
      const totWt = parseFloat(item.totalWeight || (pcs * wtPerPc));
      const pricePerPc = parseFloat(item.salePricePerPiece || 0);
      const pcsSold = item.piecesSold !== undefined && item.piecesSold !== '' ? parseInt(item.piecesSold, 10) : pcs;
      const earned = parseFloat(item.revenueEarned !== undefined ? item.revenueEarned : (pcsSold * pricePerPc));

      return [
        index + 1,
        item.itemName || 'Jewelry Piece',
        pcs,
        `${wtPerPc.toFixed(2)} g`,
        `${totWt.toFixed(2)} g`,
        `Rs. ${pricePerPc.toFixed(2)}`,
        pcsSold,
        `Rs. ${earned.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });

    autoTable(doc, {
      startY: yPos,
      margin: { left: 14, right: 14 },
      head: [['#', 'Item Description', 'Pcs Made', 'Wt/Pc', 'Tot Wt', 'Sale Price/Pc', 'Sold', 'Earned Amount']],
      body: itemRows.length > 0 ? itemRows : [['-', 'No items added yet', '-', '-', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: {
        fillColor: [37, 99, 235], // Blue
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 50 },
        2: { halign: 'center', cellWidth: 16 },
        3: { halign: 'right', cellWidth: 18 },
        4: { halign: 'right', cellWidth: 18 },
        5: { halign: 'right', cellWidth: 24 },
        6: { halign: 'center', cellWidth: 14 },
        7: { halign: 'right', fontStyle: 'bold', cellWidth: 34 }
      }
    });

    yPos = doc.lastAutoTable.finalY + 8;

    // Check if space is low before financial summary
    if (yPos > doc.internal.pageSize.getHeight() - 65) {
      doc.addPage();
      yPos = 16;
    }

    // 3. PROFIT / COST REDUCTION CALCULATION & NET REMAINING
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('3. Cost Deduction & Net Remaining Profit', 14, yPos);
    yPos += 4;

    const totalRevenue = parseFloat(batch.totalRevenue || 0);
    const netProfit = parseFloat(batch.netRemainingProfit || (totalRevenue - rawCost - otherExp));
    const profitMargin = parseFloat(batch.profitMargin || (rawCost > 0 ? (netProfit / rawCost) * 100 : 0));
    const isProfitable = netProfit >= 0;

    const pnlRows = [
      ['Total Amount Earned from Pieces Sold', `Rs. ${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Less: Raw Material Purchase Cost (Y Amount)', `- Rs. ${rawCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ];

    if (otherExp > 0) {
      pnlRows.push(['Less: Additional Making / Overhead Expenses', `- Rs. ${otherExp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
    }

    pnlRows.push([
      isProfitable ? 'NET REMAINING PROFIT (Remaining after Y Cost)' : 'NET DEFICIT / REMAINING RECOVERY NEEDED',
      `Rs. ${netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${profitMargin.toFixed(2)}%)`
    ]);

    autoTable(doc, {
      startY: yPos,
      margin: { left: 14, right: 14 },
      head: [['Financial Breakdown', 'Amount (INR)']],
      body: pnlRows,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129], // Emerald
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.4
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 110 },
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 'auto' }
      },
      didParseCell: (data) => {
        // Highlight last row (Net Remaining Profit)
        if (data.row.index === pnlRows.length - 1) {
          data.cell.styles.fillColor = isProfitable ? [220, 252, 231] : [254, 226, 226];
          data.cell.styles.textColor = isProfitable ? [22, 101, 52] : [153, 27, 27];
          data.cell.styles.fontSize = 9.5;
        }
      }
    });

    yPos = doc.lastAutoTable.finalY + 8;

    // Material Balance Box
    const totFinishedWt = parseFloat(batch.totalFinishedWeight || 0);
    const wastageWt = parseFloat(batch.wastageWeight || 0);
    const remWt = parseFloat(batch.remainingWeight || 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `Material Yield Summary: Total Pieces Made = ${batch.totalPieces || 0} pcs | Finished Weight = ${totFinishedWt.toFixed(2)} g | Scrap/Wastage = ${wastageWt.toFixed(2)} g | Leftover Raw Material = ${remWt.toFixed(2)} g`,
      14,
      yPos
    );

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.text(`Generated on ${new Date().toLocaleString('en-GB')} | Page 1 of 1`, 14, pageHeight - 10);
    doc.text(`Authorised Signature: _______________________`, pageWidth - 80, pageHeight - 10);

    // Save PDF
    const fileName = `Production_Batch_${batch.batchNumber || 'Statement'}.pdf`;
    doc.save(fileName);
    return true;
  } catch (error) {
    console.error('Error generating Production Batch PDF:', error);
    alert('Failed to generate PDF: ' + error.message);
    return false;
  }
};

