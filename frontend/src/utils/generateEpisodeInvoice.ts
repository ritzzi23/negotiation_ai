import { jsPDF } from 'jspdf';
import type { SessionSummary } from '@/lib/types';
import { formatCurrency } from '@/utils/formatters';

export function generateEpisodeInvoice(summary: SessionSummary) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  const rightEdge = pageWidth - margin;
  let y = 56;

  const agreementId = `DF-EP-${summary.session_id.slice(0, 8).toUpperCase()}`;
  const issuedAt = new Date().toLocaleString();

  // Column positions (proportional layout)
  const colItem = margin + 10;
  const colSeller = margin + 170;
  const colQty = margin + 300;
  const colUnitPrice = margin + 360;
  const colTotal = margin + 440;
  const colSavings = rightEdge - 10;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('DealForge Episode Invoice', margin, y);
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Agreement ID: ${agreementId}`, rightEdge, y - 20, { align: 'right' });
  doc.text(`Issued: ${issuedAt}`, rightEdge, y - 4, { align: 'right' });

  // Divider
  y += 12;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, rightEdge, y);

  // Buyer info
  y += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Buyer: ${summary.buyer_name}`, margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Items Requested: ${summary.total_items_requested}  |  Purchased: ${summary.completed_purchases}`, margin, y);

  // Table header
  y += 28;
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(margin, y, contentWidth, 26, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const headerY = y + 17;
  doc.text('ITEM', colItem, headerY);
  doc.text('SELLER', colSeller, headerY);
  doc.text('QTY', colQty, headerY, { align: 'center' });
  doc.text('UNIT PRICE', colUnitPrice, headerY, { align: 'right' });
  doc.text('TOTAL', colTotal, headerY, { align: 'right' });
  doc.text('SAVINGS', colSavings, headerY, { align: 'right' });

  // Divider below header
  y += 28;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin + 6, y, rightEdge - 6, y);
  y += 6;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  let grandTotal = 0;
  let grandEffective = 0;
  const rowHeight = 24;

  for (let i = 0; i < summary.purchases.length; i++) {
    const purchase = summary.purchases[i];

    if (y > 680) {
      doc.addPage();
      y = 56;
    }

    // Alternating row background
    if (i % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 4, contentWidth, rowHeight, 'F');
    }

    const totalCost = purchase.total_cost;
    const savings = purchase.card_savings ?? 0;
    const effective = totalCost - savings;
    grandTotal += totalCost;
    grandEffective += effective;

    // Truncate long names
    const itemText = doc.splitTextToSize(purchase.item_name, 150);
    const sellerText = doc.splitTextToSize(purchase.selected_seller, 120);

    doc.text(itemText[0], colItem, y + 10);
    doc.text(sellerText[0], colSeller, y + 10);
    doc.text(String(purchase.quantity), colQty, y + 10, { align: 'center' });
    doc.text(formatCurrency(purchase.final_price_per_unit), colUnitPrice, y + 10, { align: 'right' });
    doc.text(formatCurrency(totalCost), colTotal, y + 10, { align: 'right' });
    doc.text(savings > 0 ? formatCurrency(savings) : '-', colSavings, y + 10, { align: 'right' });

    y += rowHeight;
  }

  // Totals divider
  y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(1.5);
  doc.line(margin, y, rightEdge, y);
  doc.setLineWidth(0.5);

  // Grand Total
  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Grand Total:', colUnitPrice, y, { align: 'right' });
  doc.text(formatCurrency(grandTotal), colTotal, y, { align: 'right' });

  if (grandEffective < grandTotal) {
    y += 20;
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(10);
    doc.text('Effective Total (after card rewards):', colUnitPrice, y, { align: 'right' });
    doc.text(formatCurrency(grandEffective), colTotal, y, { align: 'right' });
    y += 18;
    doc.text(`You save: ${formatCurrency(grandTotal - grandEffective)}`, colTotal, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  // Terms & Conditions
  y += 40;
  if (y > 620) {
    doc.addPage();
    y = 56;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Terms & Conditions', margin, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const terms = [
    '1. This agreement reflects the negotiated terms between buyer and participating sellers.',
    '2. Prices are valid for 24 hours from the date of issuance.',
    '3. DealForge is a negotiation platform; fulfillment is handled by respective sellers.',
    '4. All disputes are to be resolved directly between buyer and seller.',
    '5. Payment is processed via the indicated credit card. Card rewards are estimates.',
    '6. This document is auto-generated and does not constitute a legally binding contract.',
  ];

  for (const term of terms) {
    const lines = doc.splitTextToSize(term, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 12 + 4;
  }

  // Signature lines
  y += 24;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, y, margin + 200, y);
  doc.line(rightEdge - 200, y, rightEdge, y);
  y += 14;
  doc.setFontSize(9);
  doc.text('Buyer Signature', margin, y);
  doc.text('Date', rightEdge - 200, y);

  doc.save(`dealforge-episode-invoice-${agreementId}.pdf`);
}
