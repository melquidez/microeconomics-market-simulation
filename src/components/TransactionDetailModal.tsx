import React from 'react';
import { TransactionLogEntry } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClose } from '@fortawesome/free-solid-svg-icons';

interface TransactionDetailModalProps {
    entry: TransactionLogEntry | null;
    open: boolean;
    onClose: () => void;
}

// One labelled row in the breakdown. `muted` greys out zero / not-applicable
// values so the eye is drawn to the numbers that matter.
const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({
    label,
    value,
    strong,
}) => (
    <div className="flex items-center justify-between gap-3 py-0.5">
        <span className="text-muted">{label}</span>
        <span className={strong ? 'text-foreground font-semibold' : 'text-foreground'}>{value}</span>
    </div>
);

// Plain-language explanation built from THIS round's own numbers, so a student
// reads the concept on data they just produced. The tax/subsidy lines make the
// "hidden" policy visible and remind the reader those are transfers, not lost
// value (which is why they are netted out of deadweight loss).
const buildExplanation = (e: TransactionLogEntry): string => {
    const budget = e.buyerBudget;
    const baseCost = e.sellerCost;
    const effCost = e.sellerEffCost;
    const tax = e.taxApplied;
    const sub = e.subsidyApplied;
    const cs = e.buyerSurplus;
    const ps = e.sellerProfit;
    const dpNote = e.dynamicPricing
        ? ' The seller had raised their asking price after earlier sales (dynamic pricing).'
        : '';

    if (e.outcome.startsWith('Transacted')) {
        const price = e.sellerEffAsk;
        const isBargain = e.outcome === 'Transacted (Bargain)';

        let sellerClause = '';
        if (tax > 0 && sub > 0) sellerClause = `, with a tax of ₱${tax} and a subsidy of ₱${sub}`;
        else if (tax > 0) sellerClause = `, with a tax of ₱${tax}`;
        else if (sub > 0) sellerClause = `, with a subsidy of ₱${sub}`;

        let priceSentence: string;
        if (isBargain) {
            priceSentence =
                `The buyer bargained (offering ${e.bargainPct}% of their budget = ₱${e.proposedPrice ?? price}) ` +
                `and negotiated the price down from the seller's ask of ₱${e.sellerOrigAsk} to ₱${price}. ` +
                `Because they paid less than the SRP, their consumer surplus is ₱${cs}.`;
        } else {
            priceSentence = `The buyer paid the seller's asking price of ₱${price}, so their consumer surplus is ₱${cs}.`;
        }

        let tail = '';
        if (tax > 0) tail = ` The ₱${tax} tax is a transfer to the government, not lost surplus.`;
        if (sub > 0) tail = ` The ₱${sub} subsidy is paid by the government.`;

        return (
            `The buyer was willing to pay up to ₱${budget}. ${priceSentence} ` +
            `The seller's base cost was ₱${baseCost}${sellerClause}, so their effective cost was ₱${effCost} ` +
            `and their producer surplus is ₱${ps}. ` +
            `Together this trade created ₱${cs + ps} of total surplus.${dpNote}${tail}`
        );
    }

    if (e.outcome === 'Rejected Offer') {
        return (
            `During bargaining the buyer offered ₱${e.proposedPrice ?? 0}. The seller's effective cost was ₱${effCost}, ` +
            `so the offer was below cost and the deal was rejected. No trade happened, so no surplus was created.`
        );
    }

    return (
        `No trade happened for this buyer. Every seller they visited was either too expensive ` +
        `(possibly because of a tax or a price floor) or had already sold out. ` +
        `No surplus was created — this is exactly the kind of missed trade that shows up as deadweight loss.`
    );
};

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ entry, open, onClose }) => {
    if (!open || !entry) return null;

    const isTransacted = entry.outcome.startsWith('Transacted');
    const priceLabel =
        entry.outcome === 'Transacted (Bargain)'
            ? 'Negotiated price'
            : entry.outcome === 'Rejected Offer'
                ? 'Buyer offered'
                : 'Price paid';
    const priceValue =
        isTransacted || entry.outcome === 'Rejected Offer'
            ? `₱${isTransacted ? entry.sellerEffAsk : (entry.proposedPrice ?? 0)}`
            : '—';

    const explanation = buildExplanation(entry);

    return (
        <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-60"
            onClick={onClose}
        >
            <div
                className="bg-panel border border-border rounded-xl p-6 max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-foreground">{entry.outcome}</h3>
                    <button
                        type="button"
                        aria-label="Close details"
                        onClick={onClose}
                        className="text-muted hover:text-foreground"
                    >
                        <FontAwesomeIcon icon={faClose} />
                    </button>
                </div>
                <div className="text-xs text-muted mb-3">
                    Round {entry.round} · {entry.buyerId} → {entry.sellerId}
                </div>

                {/* Breakdown of the data, including the normally-hidden policy numbers. */}
                <div className="bg-surface-2 rounded-md p-3 text-sm">
                    <div className="text-accent font-semibold mb-1 text-xs uppercase tracking-wide">
                        Breakdown
                    </div>
                    <Row label="Buyer budget (willingness to pay)" value={`₱${entry.buyerBudget}`} />
                    <Row label="Seller base cost" value={`₱${entry.sellerCost}`} />
                    <Row label="Tax applied" value={entry.taxApplied > 0 ? `₱${entry.taxApplied}` : '—'} />
                    <Row label="Subsidy applied" value={entry.subsidyApplied > 0 ? `₱${entry.subsidyApplied}` : '—'} />
                    <Row label="Seller effective cost" value={`₱${entry.sellerEffCost}`} strong />
                    <Row label="Seller's ask" value={`₱${entry.sellerOrigAsk}`} />
                    <Row label={priceLabel} value={priceValue} strong />
                    <Row label="Consumer surplus" value={`₱${entry.buyerSurplus}`} />
                    <Row label="Producer surplus" value={`₱${entry.sellerProfit}`} />
                </div>

                {/* Plain-word explanation for students. */}
                <div className="bg-surface-2 rounded-md p-3 text-sm text-foreground border border-border mt-3">
                    <div className="text-accent font-semibold mb-1 text-xs uppercase tracking-wide">
                        What this means
                    </div>
                    {explanation}
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="btn-primary bg-accent text-black font-semibold rounded-md px-4 py-2 text-sm w-full mt-4"
                >
                    Close
                </button>
            </div>
        </div>
    );
};
