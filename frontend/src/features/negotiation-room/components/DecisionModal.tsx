'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { BuyerDecision } from '@/lib/types';
import { formatCurrency, formatDuration } from '@/utils/formatters';
import { ROUTES } from '@/lib/router';
import { jsPDF } from 'jspdf';

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  decision: BuyerDecision;
  itemName: string;
  rounds: number;
  duration?: number; // in seconds
}

export function DecisionModal({
  isOpen,
  onClose,
  decision,
  itemName,
  rounds,
  duration,
}: DecisionModalProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleDownloadInvoice = () => {
    const agreementId = `DF-${Date.now()}`;
    const issuedAt = new Date().toLocaleString();
    const buyerName = 'Buyer';
    const sellerName = decision.seller_name || 'Seller';
    const pricePerUnit = formatCurrency(decision.final_price || 0);
    const quantity = decision.quantity || 0;
    const total = formatCurrency(decision.total_cost || 0);
    const effectiveTotal = decision.effective_total != null
      ? formatCurrency(decision.effective_total)
      : null;
    const cardLine = decision.recommended_card
      ? `${decision.recommended_card}${decision.card_savings ? ` (saves ${formatCurrency(decision.card_savings)})` : ''}`
      : 'None';

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;
    let y = 56;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('DealForge Invoice Agreement', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Agreement ID: ${agreementId}`, pageWidth - margin, y, { align: 'right' });
    y += 18;
    doc.text(`Issued: ${issuedAt}`, pageWidth - margin, y, { align: 'right' });

    y += 28;
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 96, 10, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('BUYER', margin + 16, y + 20);
    doc.text('SELLER', margin + contentWidth / 2, y + 20);
    doc.text('ITEM', margin + 16, y + 56);
    doc.text('QUANTITY', margin + contentWidth / 2, y + 56);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(buyerName, margin + 16, y + 38);
    doc.text(sellerName, margin + contentWidth / 2, y + 38);
    doc.text(itemName, margin + 16, y + 74);
    doc.text(`${quantity} units`, margin + contentWidth / 2, y + 74);

    const rightCol = pageWidth - margin - 16;

    y += 124;
    doc.roundedRect(margin, y, contentWidth, 160, 10, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DESCRIPTION', margin + 16, y + 24);
    doc.text('UNIT PRICE', margin + 280, y + 24, { align: 'right' });
    doc.text('QTY', margin + 360, y + 24, { align: 'right' });
    doc.text('TOTAL', rightCol, y + 24, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 16, y + 32, margin + contentWidth - 16, y + 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const itemLines = doc.splitTextToSize(itemName, 240);
    doc.text(itemLines[0], margin + 16, y + 56);
    doc.text(pricePerUnit, margin + 280, y + 56, { align: 'right' });
    doc.text(String(quantity), margin + 360, y + 56, { align: 'right' });
    doc.text(total, rightCol, y + 56, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Agreed Total', margin + 16, y + 104);
    doc.setFont('helvetica', 'normal');
    doc.text(total, rightCol, y + 104, { align: 'right' });

    if (effectiveTotal) {
      doc.setFont('helvetica', 'bold');
      doc.text('Effective Total (after rewards)', margin + 16, y + 126);
      doc.setFont('helvetica', 'normal');
      doc.text(effectiveTotal, rightCol, y + 126, { align: 'right' });
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Recommended Card', margin + 16, y + 148);
    doc.setFont('helvetica', 'normal');
    const cardText = doc.splitTextToSize(cardLine, contentWidth - 140);
    doc.text(cardText, margin + 140, y + 148);

    y += 184;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const noteText = doc.splitTextToSize(
      'This agreement reflects the negotiated terms for the listed item. Payment terms, delivery, and fulfillment are handled directly between buyer and seller. DealForge provides negotiation transparency and supports record-keeping for audit purposes.',
      contentWidth
    );
    doc.text(noteText, margin, y);

    y += 60;
    doc.line(margin, y, margin + 220, y);
    doc.line(margin + contentWidth - 220, y, margin + contentWidth, y);
    doc.setFontSize(9);
    doc.text('Buyer Signature', margin, y + 14);
    doc.text('Seller Signature', margin + contentWidth - 220, y + 14);

    doc.save(`dealforge-invoice-${agreementId}.pdf`);
  };

  const handleViewSummary = async () => {
    setIsNavigating(true);
    
    // Wait 2 seconds to ensure backend has saved the decision
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    onClose();
    router.push(ROUTES.SUMMARY);
  };

  const handleNextItem = () => {
    onClose();
    router.push(ROUTES.NEGOTIATIONS);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" showCloseButton={false}>
      <div className="text-center py-6">
        {/* Celebration Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-secondary-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-secondary-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-neutral-900 mb-2">Decision Made!</h2>
        <p className="text-neutral-600 mb-8">The negotiation for {itemName} is complete</p>

        {/* Decision Details */}
        {decision.selected_seller_id ? (
          <div className="bg-secondary-50 rounded-lg p-6 mb-6 text-left">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-neutral-600 mb-1">Selected Seller</p>
                <p className="text-xl font-bold text-neutral-900">{decision.seller_name}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Final Price</p>
                <p className="text-xl font-bold text-secondary-600">
                  {formatCurrency(decision.final_price || 0)}/unit
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Quantity</p>
                <p className="text-lg font-semibold text-neutral-900">{decision.quantity} units</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Total Cost</p>
                <p className="text-lg font-semibold text-neutral-900">
                  {formatCurrency(decision.total_cost || 0)}
                </p>
              </div>
            </div>

            {/* Effective total and card tip */}
            {(decision.effective_total != null && decision.effective_total !== decision.total_cost) || (decision.recommended_card && (decision.card_savings ?? 0) > 0) ? (
              <div className="mt-6 pt-6 border-t border-secondary-200">
                {decision.effective_total != null && decision.effective_total !== decision.total_cost && (
                  <p className="text-sm text-neutral-700 mb-1">
                    Effective total after rewards: <span className="font-semibold text-secondary-600">{formatCurrency(decision.effective_total)}</span>
                  </p>
                )}
                {decision.recommended_card && (decision.card_savings ?? 0) > 0 && (
                  <p className="text-sm text-neutral-700">
                    Recommended card: <span className="font-semibold">{decision.recommended_card}</span>
                    {' '}(saves {formatCurrency(decision.card_savings ?? 0)})
                  </p>
                )}
              </div>
            ) : null}

            {/* Decision Reason */}
            {decision.decision_reason && (
              <div className="mt-6 pt-6 border-t border-secondary-200">
                <p className="text-sm text-neutral-600 mb-2">Decision Reason:</p>
                <p className="text-sm text-neutral-800 italic">"{decision.decision_reason}"</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-danger-50 rounded-lg p-6 mb-6 text-left">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-danger-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-danger-900 mb-1">No Deal</p>
                <p className="text-sm text-danger-700">
                  {decision.decision_reason || 'The buyer decided not to purchase this item.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Negotiation Stats */}
        <div className="bg-neutral-50 rounded-lg p-6 mb-6">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4">Negotiation Stats</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-neutral-600">Rounds</p>
              <p className="text-2xl font-bold text-primary-600">{rounds}</p>
            </div>
            {duration && (
              <div>
                <p className="text-sm text-neutral-600">Duration</p>
                <p className="text-2xl font-bold text-primary-600">{formatDuration(duration)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-neutral-600">Status</p>
              <p className="text-sm font-semibold text-secondary-600 mt-1">
                {decision.selected_seller_id ? 'Completed' : 'No deal'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          {decision.selected_seller_id && (
            <>
              <Button variant="secondary" onClick={handleDownloadInvoice}>
                Download Invoice
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  // Dispatch custom event to open PaymentDialog in parent
                  window.dispatchEvent(new CustomEvent('dealforge:openPayment'));
                }}
              >
                Pay Now
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={handleNextItem} disabled={isNavigating}>
            Next Item
          </Button>
          <Button onClick={handleViewSummary} disabled={isNavigating}>
            {isNavigating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Preparing Summary...
              </>
            ) : (
              'View Episode Summary'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

