import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/TerminalInput.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTerminalStore } from '../lib/terminalStore';
export function TerminalInput() {
    const [input, setInput] = useState('');
    const inputRef = useRef(null);
    const terminalRef = useRef(null);
    const executeCommand = useTerminalStore((state) => state.executeCommand);
    const clearScreen = useTerminalStore((state) => state.clearScreen);
    const getPrompt = useTerminalStore((state) => state.getPrompt);
    const history = useTerminalStore((state) => state.history);
    const historyIndex = useTerminalStore((state) => state.historyIndex);
    const setHistoryIndex = useTerminalStore((state) => state.setHistoryIndex);
    const cycleCompletion = useTerminalStore((state) => state.cycleCompletion);
    const addLine = useTerminalStore((state) => state.addLine);
    const prompt = getPrompt();
    // Auto focus on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
    }, []);
    const handleSubmit = useCallback(() => {
        if (input.trim()) {
            executeCommand(input);
        }
        else {
            // Just add a new prompt for empty input
            addLine({ type: 'prompt', content: getPrompt() });
        }
        setInput('');
        setHistoryIndex(-1);
    }, [input, executeCommand, addLine, getPrompt, setHistoryIndex]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length > 0) {
                const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
                setHistoryIndex(newIndex);
                setInput(history[newIndex] || '');
            }
        }
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex !== -1) {
                const newIndex = historyIndex + 1;
                if (newIndex >= history.length) {
                    setHistoryIndex(-1);
                    setInput('');
                }
                else {
                    setHistoryIndex(newIndex);
                    setInput(history[newIndex] || '');
                }
            }
        }
        else if (e.key === 'Tab') {
            e.preventDefault();
            const completion = cycleCompletion(input);
            if (completion) {
                const parts = input.split(/\s+/);
                if (parts.length <= 1) {
                    setInput(completion + ' ');
                }
                else {
                    parts[parts.length - 1] = completion;
                    setInput(parts.join(' '));
                }
            }
        }
        else if (e.key === 'c' && e.ctrlKey) {
            e.preventDefault();
            addLine({ type: 'output', content: '^C' });
            addLine({ type: 'prompt', content: getPrompt() });
            setInput('');
            setHistoryIndex(-1);
        }
        else if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            clearScreen();
        }
    }, [input, history, historyIndex, handleSubmit, cycleCompletion, setHistoryIndex, clearScreen, addLine, getPrompt]);
    // Focus input on click anywhere in terminal
    useEffect(() => {
        const handleClick = () => {
            inputRef.current?.focus();
        };
        const terminal = terminalRef.current;
        if (terminal) {
            terminal.addEventListener('click', handleClick);
            return () => terminal.removeEventListener('click', handleClick);
        }
    }, []);
    return (_jsxs("div", { ref: terminalRef, className: "flex items-center w-full py-3 bg-terminal-bg border-t border-terminal-green-dark/30", children: [_jsxs("span", { className: "whitespace-nowrap mr-2 terminal-glow select-none", children: [_jsx("span", { className: "text-terminal-green font-bold", children: "user" }), _jsx("span", { className: "text-terminal-green-dark", children: ":" }), _jsx("span", { className: "text-terminal-green-dark", children: prompt.split(':')[1] })] }), _jsx("span", { className: "terminal-cursor mr-0.5" }), _jsx("input", { ref: inputRef, type: "text", value: input, onChange: (e) => setInput(e.target.value), onKeyDown: handleKeyDown, className: "flex-1 bg-transparent text-terminal-green font-mono text-sm outline-none border-none terminal-glow caret-transparent", autoFocus: true, spellCheck: false, autoComplete: "off", autoCapitalize: "off" })] }));
}
