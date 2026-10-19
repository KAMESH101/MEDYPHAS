import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

interface SymptomSearchProps {
    selectedSymptoms: string[];
    onSymptomsChange: (symptoms: string[]) => void;
}

export const SymptomSearch: React.FC<SymptomSearchProps> = ({ selectedSymptoms, onSymptomsChange }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [allSymptoms, setAllSymptoms] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadSymptoms = async () => {
            const data = await api.getSymptoms();
            setAllSymptoms(data.symptoms);
        };
        loadSymptoms();
    }, []);

    useEffect(() => {
        if (query.trim() === '') {
            setSuggestions([]);
            return;
        }
        const filtered = allSymptoms.filter(s =>
            s.toLowerCase().includes(query.toLowerCase()) &&
            !selectedSymptoms.includes(s)
        );
        setSuggestions(filtered);
        setIsOpen(true);
    }, [query, allSymptoms, selectedSymptoms]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const addSymptom = (symptom: string) => {
        onSymptomsChange([...selectedSymptoms, symptom]);
        setQuery('');
        setIsOpen(false);
    };

    const removeSymptom = (symptom: string) => {
        onSymptomsChange(selectedSymptoms.filter(s => s !== symptom));
    };

    return (
        <div className="space-y-4" ref={wrapperRef}>
            {/* Search Input */}
            <div className="relative">
                <div className="flex items-center gap-3 bg-[#eef2f6] dark:bg-[#1e293b] rounded-2xl px-4 py-3 shadow-inner border border-transparent focus-within:border-primary/50 transition-all">
                    <span className="material-symbols-outlined text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Search symptoms (e.g., Fever, Headache)..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsOpen(true)}
                        className="bg-transparent border-none outline-none w-full text-slate-700 dark:text-slate-200 font-medium placeholder-slate-400"
                    />
                </div>

                {/* Dropdown Suggestions */}
                {isOpen && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 max-h-60 overflow-y-auto custom-scrollbar">
                        {suggestions.map((s) => (
                            <button
                                key={s}
                                onClick={() => addSymptom(s)}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center justify-between group"
                            >
                                <span>{s}</span>
                                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary text-sm opacity-0 group-hover:opacity-100 transition-all">add_circle</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Selected Tags */}
            <div className="flex flex-wrap gap-2">
                {selectedSymptoms.map((s) => (
                    <div key={s} className="animate-in zoom-in duration-300 bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
                        <span>{s}</span>
                        <button
                            onClick={() => removeSymptom(s)}
                            className="hover:text-red-500 transition-colors flex items-center"
                        >
                            <span className="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>
                ))}
                {selectedSymptoms.length === 0 && (
                    <span className="text-sm text-slate-400 italic pl-1">No symptoms selected</span>
                )}
            </div>
        </div>
    );
};
