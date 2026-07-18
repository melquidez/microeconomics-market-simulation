import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion, faClose } from '@fortawesome/free-solid-svg-icons';

// Real numbers from a finished round, used to build worked examples.
export interface HelpCtx {
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
export const TOPICS: Record<string, HelpTopic> = {
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
    body: 'How much of the maximum possible total surplus the market actually captured. It equals realized surplus ÷ the most surplus physically possible (best matching of high-value buyers to low-cost sellers). 100% means every mutually-beneficial trade happened. Taxes and subsidies are transfers, so they are netted out here — this metric reflects real resource allocation, not government cash.',
    example: (c) =>
      `You created ₱${c.realizedSurplus.toFixed(0)} of surplus out of a possible ₱${c.maxSurplus.toFixed(
        0
      )}, so you captured ${c.allocativeEfficiency}. Any gap is value left on the table.`,
  },
  deadweightLoss: {
    title: 'Deadweight Loss',
    body: 'Value that was destroyed because beneficial trades never happened (or because trades happened that shouldn\'t have). It equals the maximum possible surplus minus the surplus actually created. Taxes (fewer trades happen), subsidies (trades where the buyer values the good less than it costs to make), price ceilings/floors, and no-deals all create it.',
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

export type TopicKey = keyof typeof TOPICS;

// Small "?" button placed at the end of a metric row.
export const HelpButton: React.FC<{ topic: TopicKey; onOpen: () => void }> = ({ topic, onOpen }) => (
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

// The click-to-open explainer. Rendered as a nested modal above the summary.
export const ExplanationModal: React.FC<{
  topic: TopicKey | null;
  ctx: HelpCtx;
  onClose: () => void;
}> = ({ topic, ctx, onClose }) => {
  if (!topic) return null;
  const t = TOPICS[topic];
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-border rounded-xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-foreground">{t.title}</h3>
          <button
            type="button"
            aria-label="Close explanation"
            onClick={onClose}
            className="text-muted hover:text-foreground"
          >
            <FontAwesomeIcon icon={faClose} />
          </button>
        </div>
        <p className="text-sm text-muted mb-3">{t.body}</p>
        <div className="bg-surface-2 rounded-md p-3 text-sm text-foreground border border-border">
          <div className="text-accent font-semibold mb-1 text-xs uppercase tracking-wide">
            Example from this round
          </div>
          {t.example(ctx)}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-primary bg-accent text-black font-semibold rounded-md px-4 py-2 text-sm w-full mt-4"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
