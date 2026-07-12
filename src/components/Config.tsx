import React from 'react';
import { Config as ConfigType } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog } from '@fortawesome/free-solid-svg-icons';

interface ConfigProps {
    config: ConfigType;
    onConfigChange: (newConfig: ConfigType) => void;
    disabled: boolean;
}

export const Config: React.FC<ConfigProps> = ({ config, onConfigChange, disabled }) => {
    const handleChange = (key: keyof ConfigType, value: number) => {
        if (!disabled) {
            onConfigChange({ ...config, [key]: value });
        }
    };

    // Debug log
    // React.useEffect(() => {
    //     console.log('Config updated:', config);
    // }, [config]);

    return (
        <div className="panel bg-panel border border-border rounded-lg p-3">
            <div className="section-label text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">
                <FontAwesomeIcon icon={faCog} className="text-accent mr-1" />
                Configuration <span className="tooltip-text text-[10px] text-muted">(editable before round)</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                    <label className="text-gray-400">Buyers: {config.numBuyers}</label>
                    <input
                        type="range"
                        min="3"
                        max="100"
                        value={config.numBuyers}
                        onInput={(e) => handleChange('numBuyers', Number((e.target as HTMLInputElement).value))}
                        className="w-full accent-accent"
                        disabled={disabled}
                    />
                </div>
                <div>
                    <label className="text-gray-400">Sellers: {config.numSellers}</label>
                    <input
                        type="range"
                        min="2"
                        max="100"
                        value={config.numSellers}
                        onInput={(e) => handleChange('numSellers', Number((e.target as HTMLInputElement).value))}
                        className="w-full accent-accent"
                        disabled={disabled}
                    />
                </div>
                <div>
                    <label className="text-gray-400">Budget Min: {config.budgetMin}</label>
                    <input
                        type="range"
                        min="20"
                        max="200"
                        value={config.budgetMin}
                        onInput={(e) => handleChange('budgetMin', Number((e.target as HTMLInputElement).value))}
                        className="w-full accent-accent"
                        disabled={disabled}
                    />
                </div>
                <div>
                    <label className="text-gray-400">Budget Max: {config.budgetMax}</label>
                    <input
                        type="range"
                        min="50"
                        max="400"
                        value={config.budgetMax}
                        onInput={(e) => handleChange('budgetMax', Number((e.target as HTMLInputElement).value))}
                        className="w-full accent-accent"
                        disabled={disabled}
                    />
                </div>
                <div>
                    <label className="text-gray-400">Ask Price Min: {config.askMin}</label>
                    <input
                        type="range"
                        min="30"
                        max="250"
                        value={config.askMin}
                        onInput={(e) => handleChange('askMin', Number((e.target as HTMLInputElement).value))}
                        className="w-full accent-accent"
                        disabled={disabled}
                    />
                </div>
                <div>
                    <label className="text-gray-400">Ask Price Max: {config.askMax}</label>
                    <input
                        type="range"
                        min="50"
                        max="350"
                        value={config.askMax}
                        onInput={(e) => handleChange('askMax', Number((e.target as HTMLInputElement).value))}
                        className="w-full accent-accent"
                        disabled={disabled}
                    />
                </div>
                <div>
                    <label className="text-gray-400">Cost Min: {config.costMin}</label>
                    <input
                        type="range"
                        min="10"
                        max="150"
                        value={config.costMin}
                        onInput={(e) => handleChange('costMin', Number((e.target as HTMLInputElement).value))}
                        className="w-full accent-accent"
                        disabled={disabled}
                    />
                </div>
                <div>
                    <label className="text-gray-400">Cost Max: {config.costMax}</label>
                    <input
                        type="range"
                        min="30"
                        max="250"
                        value={config.costMax}
                        onInput={(e) => handleChange('costMax', Number((e.target as HTMLInputElement).value))}
                        className="w-full accent-accent"
                        disabled={disabled}
                    />
                </div>
                <div className="col-span-2">
                    <label className="text-gray-400">Stock per Seller: {config.stockPerSeller}</label>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={config.stockPerSeller}
                        onInput={(e) => handleChange('stockPerSeller', Number((e.target as HTMLInputElement).value))}
                        className="w-full accent-accent"
                        disabled={disabled}
                    />
                </div>
            </div>
        </div>
    );
};