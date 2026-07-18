import React, { useRef } from 'react';
import { DisruptorState, DisruptorType } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faDotCircle } from '@fortawesome/free-solid-svg-icons';

interface DisruptorsProps {
    disruptors: DisruptorState;
    onToggleDisruptor: (type: DisruptorType, amount: number) => void;
    onDemandShock: (num: number) => void;
}

export const Disruptors: React.FC<DisruptorsProps> = ({
    disruptors,
    onToggleDisruptor,
    onDemandShock,
}) => {
    const ceilingInputRef = useRef<HTMLInputElement>(null);
    const floorInputRef = useRef<HTMLInputElement>(null);
    const taxInputRef = useRef<HTMLInputElement>(null);
    const subsidyInputRef = useRef<HTMLInputElement>(null);
    const shockInputRef = useRef<HTMLInputElement>(null);

    const handleToggle = (type: DisruptorType, inputRef: React.RefObject<HTMLInputElement | null>) => {
        if (inputRef.current) {
            onToggleDisruptor(type, Number(inputRef.current.value));
        }
    };

    const indicator = ()=>{
        return(
            <>
                <FontAwesomeIcon icon={faDotCircle} className="text-green-500 mr-1" /> Active 
            </>
        );
        
    }

    return (
        <div className="panel bg-panel border border-border rounded-lg p-3">
            <div className="section-label text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">
                <FontAwesomeIcon icon={faBolt} className="text-yellow-500 mr-1" />
                Market Disruptors <span className="tooltip-text text-[10px] text-muted">(toggle anytime)</span>
            </div>
            <div className="flex flex-col gap-2 text-xs">
                {/* Price Ceiling */}
                <div className={`flex items-center gap-2 flex-wrap ${disruptors.priceCeiling ? 'disruptor-active bg-red-900/20 border border-danger rounded-lg p-2' : ''}`}>
                    <span className="w-20 text-muted">Price Ceiling:</span>
                    <input
                        type="number"
                        ref={ceilingInputRef}
                        defaultValue={100}
                        min={10}
                        max={300}
                        className="w-16 bg-panel border border-border text-foreground rounded-md px-2 py-1 text-xs"
                    />
                    <button
                        className="btn-outline border border-accent text-accent rounded-md px-3 py-1 text-xs"
                        onClick={() => handleToggle('priceCeiling', ceilingInputRef)}
                    >
                        {disruptors.priceCeiling ? 'Remove' : 'Apply'}
                    </button>
                    <span className={`text-[10px] ${disruptors.priceCeiling ? 'text-danger font-semibold' : 'text-muted'}`}>
                        {disruptors.priceCeiling ? indicator() : 'Off'}
                    </span>
                </div>

                {/* Price Floor */}
                <div className={`flex items-center gap-2 flex-wrap ${disruptors.priceFloor ? 'disruptor-active bg-red-900/20 border border-danger rounded-lg p-2' : ''}`}>
                    <span className="w-20 text-muted">Price Floor:</span>
                    <input
                        type="number"
                        ref={floorInputRef}
                        defaultValue={80}
                        min={10}
                        max={300}
                        className="w-16 bg-panel border border-border text-foreground rounded-md px-2 py-1 text-xs"
                    />
                    <button
                        className="btn-outline border border-accent text-accent rounded-md px-3 py-1 text-xs"
                        onClick={() => handleToggle('priceFloor', floorInputRef)}
                    >
                        {disruptors.priceFloor ? 'Remove' : 'Apply'}
                    </button>
                    <span className={`text-[10px] ${disruptors.priceFloor ? 'text-danger font-semibold' : 'text-muted'}`}>
                        {disruptors.priceFloor ? indicator() : 'Off'}
                    </span>
                </div>

                {/* Tax */}
                <div className={`flex items-center gap-2 flex-wrap ${disruptors.tax ? 'disruptor-active bg-red-900/20 border border-danger rounded-lg p-2' : ''}`}>
                    <span className="w-20 text-muted">Tax on Sellers:</span>
                    <input
                        type="number"
                        ref={taxInputRef}
                        defaultValue={15}
                        min={1}
                        max={100}
                        className="w-16 bg-panel border border-border text-foreground rounded-md px-2 py-1 text-xs"
                    />
                    <button
                        className="btn-outline border border-accent text-accent rounded-md px-3 py-1 text-xs"
                        onClick={() => handleToggle('tax', taxInputRef)}
                    >
                        {disruptors.tax ? 'Remove' : 'Apply'}
                    </button>
                    <span className={`text-[10px] ${disruptors.tax ? 'text-danger font-semibold' : 'text-muted'}`}>
                        {disruptors.tax ? indicator() : 'Off'}
                    </span>
                </div>

                {/* Subsidy */}
                <div className={`flex items-center gap-2 flex-wrap ${disruptors.subsidy ? 'disruptor-active bg-green-900/20 border border-success rounded-lg p-2' : ''}`}>
                    <span className="w-20 text-muted">Subsidy:</span>
                    <input
                        type="number"
                        ref={subsidyInputRef}
                        defaultValue={15}
                        min={1}
                        max={100}
                        className="w-16 bg-panel border border-border text-foreground rounded-md px-2 py-1 text-xs"
                    />
                    <button
                        className="btn-outline border border-accent text-accent rounded-md px-3 py-1 text-xs"
                        onClick={() => handleToggle('subsidy', subsidyInputRef)}
                    >
                        {disruptors.subsidy ? 'Remove' : 'Apply'}
                    </button>
                    <span className={`text-[10px] ${disruptors.subsidy ? 'text-success font-semibold' : 'text-muted'}`}>
                        {disruptors.subsidy ? indicator() : 'Off'}
                    </span>
                </div>

                {/* Demand Shock */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-20 text-muted">Demand Shock:</span>
                    <input
                        type="number"
                        ref={shockInputRef}
                        defaultValue={5}
                        min={1}
                        max={20}
                        className="w-16 bg-panel border border-border text-foreground rounded-md px-2 py-1 text-xs"
                    />
                    <button
                        className="btn-outline border border-accent text-accent rounded-md px-3 py-1 text-xs"
                        onClick={() => {
                            if (shockInputRef.current) {
                                onDemandShock(Number(shockInputRef.current.value));
                            }
                        }}
                    >
                        Inject Buyers
                    </button>
                </div>
            </div>
        </div>
    );
};
