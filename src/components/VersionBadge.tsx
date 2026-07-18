import React from 'react';
// Read straight from package.json so the badge stays in sync with every
// `npm version` bump — no manual edits needed.
import pkg from '../../package.json';

export const VersionBadge: React.FC = () => (
    <span
        className="rounded-md border border-border bg-panel px-2 py-1 font-mono text-[11px] text-muted"
        title="App version"
    >
        v{pkg.version}
    </span>
);
