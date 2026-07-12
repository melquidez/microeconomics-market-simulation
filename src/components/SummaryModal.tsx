import React from 'react';
import { TransactionLogEntry } from '../types';
import { isSuccessfulOutcome } from '../hooks/simulationHelpers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faChartArea, faChartBar, faCheckCircle, faClose, faMoneyBill, faShoppingCart } from '@fortawesome/free-solid-svg-icons';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionLog: TransactionLogEntry[];
  totalBuyers: number;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  transactionLog,
  totalBuyers,
}) => {
  if (!isOpen) return null;

  // Compute statistics
  const transactedLogs = transactionLog.filter((l) => isSuccessfulOutcome(l.outcome));
  const totalTrans = transactedLogs.length;
  const totalNoDeal = transactionLog.filter((l) => l.outcome === 'No Deal').length;

  const avgPrice =
    totalTrans > 0
      ? transactedLogs.reduce((s, l) => s + l.clearingPrice, 0) / totalTrans
      : 0;

  const totalConsumerSurplus = transactedLogs.reduce(
    (s, l) => s + (typeof l.buyerSurplus === 'number' ? l.buyerSurplus : 0),
    0
  );

  const totalProducerSurplus = transactedLogs.reduce(
    (s, l) => s + (typeof l.sellerProfit === 'number' ? l.sellerProfit : 0),
    0
  );

  const efficiency =
    totalBuyers > 0 ? ((totalTrans / totalBuyers) * 100).toFixed(1) : '0.0';

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose} // Clicking backdrop closes modal
    >
      <div
        className="bg-panel border border-border rounded-xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <h2 className="text-xl font-bold text-white mb-3">
          <FontAwesomeIcon icon={faChartBar} className="text-green-500 mr-1" />
          Round Summary
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="stat-badge bg-panel rounded-md px-3 py-1">
            <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-1" />
            Transactions: <b className="text-success">{totalTrans}</b>
          </div>
          <div className="stat-badge bg-panel rounded-md px-3 py-1">
            <FontAwesomeIcon icon={faClose} className="text-red-500 mr-1" />
            No-Deals: <b className="text-danger">{totalNoDeal}</b>
          </div>
          <div className="stat-badge bg-panel rounded-md px-3 py-1">
            <FontAwesomeIcon icon={faMoneyBill} className="text-yellow-500 mr-1" />
            Avg Clear Price: <b className="text-accent">₱{avgPrice.toFixed(1)}</b>
          </div>
          <div className="stat-badge bg-panel rounded-md px-3 py-1">
            <FontAwesomeIcon icon={faShoppingCart} className="text-blue-500 mr-1" />
            Consumer Surplus: <b>₱{totalConsumerSurplus.toFixed(0)}</b>
          </div>
          <div className="stat-badge bg-panel rounded-md px-3 py-1">
            <FontAwesomeIcon icon={faBuilding} className='text-muted mr-1' />
            Producer Surplus: <b>₱{totalProducerSurplus.toFixed(0)}</b>
          </div>
          <div className="stat-badge bg-panel rounded-md px-3 py-1 col-span-2">
            <FontAwesomeIcon icon={faChartArea} className="text-green-500 mr-1" />
            Efficiency: <b>{efficiency}%</b> (transactions / total buyers)
          </div>
        </div>
        <button
          className="btn-primary bg-accent text-black font-semibold rounded-md px-4 py-2 text-sm w-full mt-4"
          onClick={onClose}
        >
          Close Summary
        </button>
      </div>
    </div>
  );
};