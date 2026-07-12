import React from 'react';
import { SimStatus } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPause, faPlay, faRefresh } from '@fortawesome/free-solid-svg-icons';

interface ControlsProps {
    status: SimStatus;
    speed: 'slow' | 'normal' | 'fast';
    dynamicPricing: boolean;
    bargaining: boolean;
    onStart: () => void;
    onPause: () => void;
    onReset: () => void;
    onNext: () => void;
    onSpeedChange: (speed: 'slow' | 'normal' | 'fast') => void;
    onDynamicPricingToggle: (enabled: boolean) => void;
    onBargainingToggle: (enabled: boolean) => void;
}

export const Controls: React.FC<ControlsProps> = ({
    status,
    speed,
    dynamicPricing,
    bargaining,
    onStart,
    onPause,
    onReset,
    onNext,
    onSpeedChange,
    onDynamicPricingToggle,
    onBargainingToggle,
}) => {
    return (
        <div className="panel bg-panel border border-border rounded-lg p-3">
            <div className="section-label text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">
                Round Controls
            </div>
            <div className="flex gap-2 flex-wrap">
                <button
                    className="btn-primary bg-primary hover:bg-primary-hover text-black font-semibold rounded-md px-4 py-2 text-sm disabled:opacity-50"
                    onClick={onStart}
                    disabled={status !== 'idle'}
                >
                    <FontAwesomeIcon icon={faPlay} className='mr-1'/>
                    Start Round
                </button>
                <button
                    className="btn-primary bg-green-400 hover:bg-green-500 text-black font-semibold rounded-md px-4 py-2 text-sm disabled:opacity-50"
                    onClick={onNext}
                    disabled={status !== 'roundEnd'}
                >
                    Next Round
                    <FontAwesomeIcon icon={faPlay} className='ml-1'/>
                </button>
                <button
                    className="btn-outline border border-accent text-accent rounded-md px-4 py-2 text-sm disabled:opacity-50"
                    onClick={onPause}
                    disabled={status !== 'running' && status !== 'paused'}
                >


                    {status === 'running' ? (
                        <>
                            <FontAwesomeIcon icon={faPause} className='mr-1'/>
                            Pause
                        </>
                    ) : (
                        <> 
                            <FontAwesomeIcon icon={faPlay} className='mr-1'/>
                            Resume
                        </>
                    )}


                </button>
                <button
                    className="btn-outline border border-accent text-accent rounded-md px-4 py-2 text-sm"
                    onClick={onReset}
                >
                    <FontAwesomeIcon icon={faRefresh} className='mr-1'/> Reset
                </button>
                
            </div>
            <div className="mt-2 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <label className="text-xs text-muted">Speed:</label>
                    <select
                        className="bg-[#2a2d35] border border-[#444] text-gray-200 rounded-md px-2 py-1 text-xs"
                        value={speed}
                        onChange={(e) => onSpeedChange(e.target.value as 'slow' | 'normal' | 'fast')}
                    >
                        <option value="slow">Slow</option>
                        <option value="normal">Normal</option>
                        <option value="fast">Fast</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={dynamicPricing}
                            onChange={(e) => onDynamicPricingToggle(e.target.checked)}
                        />
                        Dynamic Pricing
                    </label>
                    <span className="text-xs text-muted">{dynamicPricing ? '(ON)' : '(OFF)'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={bargaining}
                            onChange={(e) => onBargainingToggle(e.target.checked)}
                        />
                        Bargaining
                    </label>
                    <span className="text-xs text-muted">{bargaining ? '(ON)' : '(OFF)'}</span>
                </div>
            </div>
        </div>
    );
};