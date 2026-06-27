import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { StartClient } from '@tanstack/react-start';
startTransition(() => {
    hydrateRoot(document, _jsx(StrictMode, { children: _jsx(StartClient, {}) }));
});
