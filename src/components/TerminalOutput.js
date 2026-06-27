import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/TerminalOutput.tsx
import { useEffect, useRef } from 'react';
import { useTerminalStore } from '../lib/terminalStore';
function renderPrompt(content) {
    const rest = content.slice(5); // after 'user:'
    const spaceIdx = rest.indexOf(' ');
    const path = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx);
    const command = spaceIdx === -1 ? '' : rest.slice(spaceIdx);
    return (_jsxs("span", { children: [_jsx("span", { className: "text-terminal-green font-bold", children: "user" }), _jsx("span", { className: "text-terminal-green-dark", children: ":" }), _jsx("span", { className: "text-terminal-green-dark", children: path }), _jsx("span", { children: command })] }));
}
export function TerminalOutput() {
    const lines = useTerminalStore((state) => state.lines);
    const scrollRef = useRef(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines]);
    return (_jsx("div", { ref: scrollRef, className: "flex-1 overflow-y-auto terminal-scrollbar terminal-glow", children: lines.map((line) => (_jsx("div", { className: `whitespace-pre-wrap break-all ${line.type === 'error'
                ? 'text-terminal-red terminal-glow-red'
                : line.type === 'system'
                    ? 'text-terminal-yellow'
                    : 'text-terminal-green'}`, children: line.type === 'prompt' && line.content.startsWith('user:') ? (renderPrompt(line.content)) : (line.content) }, line.id))) }));
}
