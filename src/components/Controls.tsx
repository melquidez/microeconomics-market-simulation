import React from 'react';
import { SimStatus } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPause, faPlay, faRefresh, faClock, faChartLine, faHandshake, faGripLines, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

interface ControlsProps {
    status: SimStatus;
    speed: 'slow' | 'normal' | 'fast';
    dynamicPricing: boolean;
    bargaining: boolean;
    bargainPct: number;
    onStart: () => void;
    onPause: () => void;
    onReset: () => void;
    onNext: () => void;
    onSpeedChange: (speed: 'slow' | 'normal' | 'fast') => void;
    onDynamicPricingToggle: (enabled: boolean) => void;
    onBargainingToggle: (enabled: boolean) => void;
    onBargainPctChange: (pct: number) => void;
}

// Speed button component with visual feedback (active uses primary color)
const SpeedButton: React.FC<{ 
    label: string; 
    active: boolean; 
    onClick: () => void;
}> = ({ label, active, onClick }) => {
    const baseClasses = 'px-3 py-1 text-xs rounded-md font-medium transition-all duration-200';
    const activeClasses = 'bg-primary text-black shadow-md transform scale-105 ring-2 ring-primary/50';
    const inactiveClasses = 'bg-panel border border-border text-muted hover:text-foreground hover:bg-surface-2';
    
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
            aria-pressed={active}
        >
            {label}
        </button>
    );
};

// iOS-style toggle switch: gray when off, primary color when on
const ToggleSwitch: React.FC<{ 
    checked: boolean; 
    onChange: () => void;
}> = ({ checked, onChange }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${checked ? 'bg-primary' : 'bg-track'}`}
    >
        <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}`}
        />
    </button>
);

// Tooltip component
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative group">
        {children}
        <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-[#111827] text-white rounded-md 
                       opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                       transition-all duration-200 whitespace-nowrap z-50"
        >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#111827] -mt-1"></div>
        </div>
    </div>
);

export const Controls: React.FC<ControlsProps> = ({ 
    status,
    speed,
    dynamicPricing,
    bargaining,
    bargainPct,
    onStart,
    onPause,
    onReset,
    onNext,
    onSpeedChange,
    onDynamicPricingToggle,
    onBargainingToggle,
    onBargainPctChange,
}) => {
    const isRunning = status === 'running';
    const isPaused = status === 'paused';
    const canStart = status === 'idle';
    const canPause = isRunning || isPaused;
    const canNext = status === 'roundEnd';
    
    return (
        <div className="panel bg-panel border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
                <div className="section-label text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">
                    Round Controls
                </div>
                <div className="text-xs text-muted flex items-center gap-1">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-accent" />
                    <span className="hidden sm:inline">Space/Enter: toggle play/pause</span>
                </div>
            </div>
            
            {/* Action Buttons Row */}
            <div className="flex flex-wrap gap-2 mb-3">
                <Tooltip text="Start a new market simulation round">
                    <button
                        className="btn-primary bg-primary hover:bg-primary-hover text-black font-semibold rounded-md px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={onStart}
                        disabled={!canStart}
                        aria-label="Start new round"
                    >
                        <FontAwesomeIcon icon={faPlay} className='mr-1'/>
                        Start Round
                    </button>
                </Tooltip>
                
                <Tooltip text="End current round and prepare for next (keeps same config)">
                    <button
                        className="btn-primary bg-success hover:brightness-110 text-black font-semibold rounded-md px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={onNext}
                        disabled={!canNext}
                        aria-label="Prepare next round"
                    >
                        <FontAwesomeIcon icon={faPlay} className='ml-1'/>
                        Prepare Next
                    </button>
                </Tooltip>
                
                <Tooltip text={isRunning ? 'Pause the simulation' : 'Resume the simulation'}>
                    <button
                        className="btn-outline border border-accent text-accent rounded-md px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={onPause}
                        disabled={!canPause}
                        aria-label={isRunning ? 'Pause simulation' : 'Resume simulation'}
                    >
                        <FontAwesomeIcon icon={isRunning ? faPause : faPlay} className='mr-1'/>
                        {isRunning ? 'Pause' : 'Resume'}
                    </button>
                </Tooltip>
                
                <Tooltip text="Reset simulation to initial state">
                    <button
                        className="btn-outline border border-accent text-accent rounded-md px-4 py-2 text-sm"
                        onClick={onReset}
                        aria-label="Reset simulation"
                    >
                        <FontAwesomeIcon icon={faRefresh} className='mr-1'/> Reset
                    </button>
                </Tooltip>
            </div>
            
            {/* Speed Controls */}
            <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                    <FontAwesomeIcon icon={faClock} className="text-xs text-muted"/>
                    <span className="text-xs text-muted font-medium">Speed</span>
                </div>
                <div className="flex gap-1">
                    <SpeedButton 
                        label="Slow" 
                        active={speed === 'slow'} 
                        onClick={() => onSpeedChange('slow')} 
                    />
                    <SpeedButton 
                        label="Normal" 
                        active={speed === 'normal'} 
                        onClick={() => onSpeedChange('normal')} 
                    />
                    <SpeedButton 
                        label="Fast" 
                        active={speed === 'fast'} 
                        onClick={() => onSpeedChange('fast')} 
                    />
                </div>
            </div>
            
            {/* Simulation Options */}
            <div className="flex flex-col gap-3">
                {/* Dynamic Pricing Toggle */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faChartLine} className="text-xs text-accent"/>
                        <span className="text-xs text-muted">Dynamic Pricing</span>
                        <Tooltip text="Sellers adjust prices (+5% after sale, -5% after rejection)">
                            <FontAwesomeIcon icon={faInfoCircle} className="text-xs text-muted hover:text-accent cursor-pointer" />
                        </Tooltip>
                    </div>
                    <ToggleSwitch 
                        checked={dynamicPricing}
                        onChange={() => onDynamicPricingToggle(!dynamicPricing)}
                    />
                </div>
                
                {/* Bargaining Toggle */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faHandshake} className="text-xs text-accent"/>
                        <span className="text-xs text-muted">Bargaining</span>
                        <Tooltip text="Buyers can negotiate lower prices (default: 95% of budget)">
                            <FontAwesomeIcon icon={faInfoCircle} className="text-xs text-muted hover:text-accent cursor-pointer" />
                        </Tooltip>
                    </div>
                    <ToggleSwitch 
                        checked={bargaining}
                        onChange={() => onBargainingToggle(!bargaining)}
                    />
                </div>
                
                {/* Bargain Percentage - only visible when bargaining is on */}
                {bargaining && (
                    <div className="pt-2 border-t border-border">
                        <div className="flex items-center gap-2 mb-1">
                            <FontAwesomeIcon icon={faGripLines} className="text-xs text-accent"/>
                            <span className="text-xs text-muted font-medium">Bargain Power</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min={50}
                                max={100}
                                value={bargainPct}
                                onChange={(e) => onBargainPctChange(Number(e.target.value))}
                                className="flex-1 accent-accent"
                                aria-label="Bargain percentage"
                            />
                            <span className="text-xs font-mono bg-panel px-2 py-1 rounded border border-border">₱{bargainPct}%</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted mt-1">
                            <span>Conservative (50%)</span>
                            <span>Generous (100%)</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};