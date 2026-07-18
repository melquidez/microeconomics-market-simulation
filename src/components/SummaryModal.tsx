import React, { useState } from 'react';
import { TransactionLogEntry } from '../types';
import { isSuccessfulOutcome } from '../hooks/simulationHelpers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faChartArea,
  faChartBar,
  faCheckCircle,
  faCircleQuestion,
  faClose,
  faMoneyBill,
  faShoppingCart,
} from '@fortawesome/free-solid-svg-icons';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionLog: TransactionLogEntry[];
  totalBuyers: number;
  allocativeEfficiency: string;
  deadweightLoss: string;
}

// Real numbers from this round, used to build worked examples in the help modal.
interface HelpCtx {
  totalTrans: number;
  totalNoDeal: number;
  avgPrice: number;
  totalConsumerSurplus: number;
  totalProducerSurplus: number;
  allocativeEfficiency: string;
  deadweightLoss: string;
  efficiency: string;
  realizedSurplus: number;
  maxSurplus: number;
  dwlNum: number;
  totalBuyers: number;
}

interface HelpTopic {
  title: string;
  body: string;
  example: (c: HelpCtx) => string;
}

// Plain-language explanations. Each `example` plugs in the round's actual
// numbers so the learner sees the concept on their own data.
const TOPICS: Record<string, HelpTopic> = {
  transactions: {
    title: 'Transactions',
    body: 'The number of buyer–seller deals that successfully closed this round. Each one means a unit of the good changed hands at an agreed price.',
    example: (c) =>
      `In this round ${c.totalTrans} deals closed. Together they moved ${c.totalTrans} units at an average price of ₱${c.avgPrice.toFixed(
        1
      )}.`,
  },
  noDeals: {
    title: 'No-Deals',
    body: 'Buyers who left the market without buying anything. A "No-Deal" is a buyer who was willing to pay at least what some seller needed, yet no trade happened — usually because of a binding price control or simply failing to meet the right seller.',
    example: (c) =>
      `${c.totalNoDeal} buyers walked away empty-handed. Every one of them is a trade that *could* have happened (buyer value ≥ seller cost) but didn't — lost opportunity sitting right there in the market.`,
  },
  avgPrice: {
    title: 'Average Clearing Price',
    body: 'The average price that deals settled at this round. Compare it to the equilibrium price (pe) on the chart to see whether a control is biting.',
    example: (c) =>
      `Deals averaged ₱${c.avgPrice.toFixed(1)}. If that's far below pe, a price ceiling is holding prices down; if it's above pe, a price floor or rising dynamic pricing is pushing them up.`,
  },
  consumerSurplus: {
    title: 'Consumer Surplus',
    body: "The total benefit buyers got from paying less than their maximum budget. For each deal it's (buyer's budget − price paid), summed over all deals.",
    example: (c) =>
      `Total consumer surplus this round is ₱${c.totalConsumerSurplus.toFixed(0)} — the sum over every deal of (budget − price paid). It's the "extra happiness" buyers kept because they paid less than their top price.`,
  },
  producerSurplus: {
    title: 'Producer Surplus',
    body: "The total profit sellers kept above their cost. For each deal it's (price received − seller's cost), summed over all deals.",
    example: (c) =>
      `Total producer surplus this round is ₱${c.totalProducerSurplus.toFixed(0)} — the sum over every deal of (price received − cost). It's what sellers earned above what the unit cost them.`,
  },
  allocativeEff: {
    title: 'Allocative Efficiency',
    body: 'How much of the maximum possible total surplus the market actually captured. It equals realized surplus ÷ the most surplus physically possible (best matching of high-value buyers to low-cost sellers). 100% means every mutually-beneficial trade happened.',
    example: (c) =>
      `You created ₱${c.realizedSurplus.toFixed(0)} of surplus out of a possible ₱${c.maxSurplus.toFixed(
        0
      )}, so you captured ${c.allocativeEfficiency}. Any gap is value left on the table.`,
  },
  deadweightLoss: {
    title: 'Deadweight Loss',
    body: 'Value that was destroyed because beneficial trades never happened. It equals the maximum possible surplus minus the surplus actually created. Taxes, price ceilings/floors, and no-deals all create it.',
    example: (c) =>
      `The market could have produced ₱${c.maxSurplus.toFixed(0)} of total surplus, but only produced ₱${c.realizedSurplus.toFixed(
        0
      )}. So ₱${c.dwlNum} of value simply vanished — real welfare lost to trades that should have happened but didn't.`,
  },
  dealRate: {
    title: 'Deal Rate',
    body: 'The share of buyers who successfully bought something. It equals transactions ÷ total buyers. It measures how *many* traders were served, not how *well* — a high deal rate can still leave surplus on the table (low allocative efficiency).',
    example: (c) =>
      `Deal rate = ${c.totalTrans} deals ÷ ${c.totalBuyers} buyers = ${c.efficiency}%. This says how many buyers got served; allocative efficiency says how good those matches were.`,
  },
};

const HelpButton: React.FC<{ topic: keyof typeof TOPICS; onOpen: () => void }> = ({ topic, onOpen }) => (
  <button
    type="button"
    aria-label={`Explain ${TOPICS[topic].title}`}
    title={`What is ${TOPICS[topic].title}?`}
    onClick={(e) => {
      e.stopPropagation();
      onOpen();
    }}
    className="ml-auto pl-2 text-muted hover:text-accent transition-colors leading-none"
  >
    <FontAwesomeIcon icon={faCircleQuestion} className="text-sm" />
  </button>
);

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  transactionLog,
  totalBuyers,
  allocativeEfficiency,
  deadweightLoss,
}) => {
  const [helpTopic, setHelpTopic] = useState<keyof typeof TOPICS | null>(null);

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

  // Real numbers for the worked examples.
  const realizedSurplus = totalConsumerSurplus + totalProducerSurplus;
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

  const active = helpTopic ? TOPICS[helpTopic] : null;

  return (
    <>
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
      </div>

      {active && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]"
          onClick={() => setHelpTopic(null)}
        >
          <div
            className="bg-panel border border-border rounded-xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">{active.title}</h3>
              <button
                type="button"
                aria-label="Close explanation"
                onClick={() => setHelpTopic(null)}
                className="text-muted hover:text-white"
              >
                <FontAwesomeIcon icon={faClose} />
              </button>
            </div>
            <p className="text-sm text-gray-300 mb-3">{active.body}</p>
            <div className="bg-black/30 rounded-md p-3 text-sm text-gray-200 border border-border">
              <div className="text-accent font-semibold mb-1 text-xs uppercase tracking-wide">
                Example from this round
              </div>
              {active.example(ctx)}
            </div>
            <button
              type="button"
              onClick={() => setHelpTopic(null)}
              className="btn-primary bg-accent text-black font-semibold rounded-md px-4 py-2 text-sm w-full mt-4"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
