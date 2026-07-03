import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
  className?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  className?: string;
}

export default function CustomSelect({ value, onChange, options, className = "" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close dropdown on outside click (using mousedown for reliability)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Sync focused index with active value when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === value);
      setFocusedIndex(idx >= 0 ? idx : 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen, value, options]);

  // Keyboard navigation inside dropdown menu
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % options.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + options.length) % options.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, focusedIndex, options, onChange]);

  // Focus option button on index changes
  useEffect(() => {
    if (focusedIndex >= 0 && optionsRefs.current[focusedIndex]) {
      optionsRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className} font-sans`}>
      <button
        id="custom-select-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center justify-between gap-2 bg-neutral-900 border border-neutral-800 rounded px-3 py-1.5 text-xs text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors focus:outline-none cursor-pointer w-full text-left"
      >
        <span className={selectedOption?.className}>{selectedOption?.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
      </button>

      {isOpen && (
        <div 
          role="listbox"
          aria-labelledby="custom-select-button"
          className="absolute left-0 mt-1 z-[250] min-w-full bg-neutral-950 border border-neutral-800 rounded-lg shadow-2xl p-1 max-h-60 overflow-y-auto scrollbar-thin animate-fade-in"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isFocused = idx === focusedIndex;

            return (
              <button
                key={opt.value}
                ref={(el) => {
                  optionsRefs.current[idx] = el;
                }}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs rounded transition-colors block cursor-pointer border-none focus:outline-none ${
                  isSelected 
                    ? "text-white bg-neutral-900 font-semibold" 
                    : isFocused
                    ? "text-white bg-neutral-850"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60"
                }`}
              >
                <span className={opt.className}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
