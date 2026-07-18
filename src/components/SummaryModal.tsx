import React, { useState } from 'react';
import { TransactionLogEntry } from '../types';
import { isSuccessfulOutcome } from '../hooks/simulationHelpers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faChartArea,
  faChartBar,
  faCheckCircle,
  faClose,
  faMoneyBill,
  faShoppingCart,
} from '@fortawesome/free-solid-svg-icons';
import { HelpCtx, HelpButton, ExplanationModal, TopicKey } from './ConceptExplainer';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionLog: TransactionLogEntry[];
  totalBuyers: number;
  allocativeEfficiency: string;
  deadweightLoss: string;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  transactionLog,
  totalBuyers,
  allocativeEfficiency,
  deadweightLoss,
}) => {
  const [helpTopic, setHelpTopic] = useState<TopicKey | null>(null);

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

  // Real numbers for the worked examples. Use the BASE-cost surplus basis
  // (buyerBudget - sellerCost) so this matches the deadweight-loss / allocative
  // efficiency figures, which also net out tax/subsidy transfers. The displayed
  // Consumer/Producer Surplus badges below are the private surpluses (they still
  // reflect tax/subsidy incidence on the buyer/seller).
  const realizedSurplus = transactedLogs.reduce(
    (s, l) => s + (l.buyerBudget - (typeof l.sellerCost === 'number' ? l.sellerCost : 0)),
    0
  );
  const dwlNum = parseInt((deadweightLoss || '').replace(/[^\d]/g, ''), 10) || 0;
  const maxSurplus = realizedSurplus + dwlNum;
  const ctx: HelpCtx = {
    totalTrans,
    totalNoDeal,
    avgPrice,
    totalConsumerSurplus,
    totalProducerSurplus,
    allocativeEfficiency,
    deadweightLoss,
    efficiency: efficiency + '%',
    realizedSurplus,
    maxSurplus,
    dwlNum,
    totalBuyers,
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose} // Clicking backdrop closes modal
    >
      <div
        className="bg-panel border border-border rounded-xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <h2 className="text-xl font-bold text-foreground mb-3">
          <FontAwesomeIcon icon={faChartBar} className="text-green-500 mr-1" />
          Round Summary
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="stat-badge bg-panel rounded-md px-3 py-1 flex items-center">
            <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-1" />
            <span>
              Transactions: <b className="text-success">{totalTrans}</b>
            </span>
            <HelpButton topic="transactions" onOpen={() => setHelpTopic('transactions')} />
          </div>
          <div className="stat-badge bg-panel rounded-md px-3 py-1 flex items-center">
            <FontAwesomeIcon icon={faClose} className="text-red-500 mr-1" />
            <span>
              No-Deals: <b className="text-danger">{totalNoDeal}</b>
            </span>
            <HelpButton topic="noDeals" onOpen={() => setHelpTopic('noDeals')} />
          </div>
          <div className="stat-badge bg-panel rounded-md px-3 py-1 flex items-center">
            <FontAwesomeIcon icon={faMoneyBill} className="text-yellow-500 mr-1" />
            <span>
              Avg Clear Price: <b className="text-accent">₱{avgPrice.toFixed(1)}</b>
            </span>
            <HelpButton topic="avgPrice" onOpen={() => setHelpTopic('avgPrice')} />
          </div>
          <div className="stat-badge bg-panel rounded-md px-3 py-1 flex items-center">
            <FontAwesomeIcon icon={faShoppingCart} className="text-blue-500 mr-1" />
            <span>
              Consumer Surplus: <b>₱{totalConsumerSurplus.toFixed(0)}</b>
            </span>
            <HelpButton topic="consumerSurplus" onOpen={() => setHelpTopic('consumerSurplus')} />
          </div>
          <div className="stat-badge bg-panel rounded-md px-3 py-1 flex items-center">
            <FontAwesomeIcon icon={faBuilding} className="text-muted mr-1" />
            <span>
              Producer Surplus: <b>₱{totalProducerSurplus.toFixed(0)}</b>
            </span>
            <HelpButton topic="producerSurplus" onOpen={() => setHelpTopic('producerSurplus')} />
          </div>
          <div className="stat-badge bg-panel rounded-md px-3 py-1 flex items-center">
            <FontAwesomeIcon icon={faChartArea} className="text-green-500 mr-1" />
            <span>
              Allocative Eff: <b>{allocativeEfficiency}</b>
            </span>
            <HelpButton topic="allocativeEff" onOpen={() => setHelpTopic('allocativeEff')} />
          </div>
          <div className="stat-badge bg-panel rounded-md px-3 py-1 flex items-center">
            <FontAwesomeIcon icon={faChartBar} className="text-red-500 mr-1" />
            <span>
              Deadweight Loss: <b>{deadweightLoss}</b>
            </span>
            <HelpButton topic="deadweightLoss" onOpen={() => setHelpTopic('deadweightLoss')} />
          </div>
          <div className="stat-badge bg-panel rounded-md px-3 py-1 col-span-2 flex items-center">
            <FontAwesomeIcon icon={faChartArea} className="text-green-500 mr-1" />
            <span>
              Deal Rate: <b>{efficiency}%</b> (transactions / total buyers)
            </span>
            <HelpButton topic="dealRate" onOpen={() => setHelpTopic('dealRate')} />
          </div>
        </div>
        <button
          className="btn-primary bg-accent text-black font-semibold rounded-md px-4 py-2 text-sm w-full mt-4"
          onClick={onClose}
        >
          Close Summary
        </button>
      </div>

      <ExplanationModal topic={helpTopic} ctx={ctx} onClose={() => setHelpTopic(null)} />
    </div>
  );
};
