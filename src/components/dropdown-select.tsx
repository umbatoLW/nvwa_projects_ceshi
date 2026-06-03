"use client";

import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, ReactNode } from "react";

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface DropdownSelectProps {
  label?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showDescription?: boolean;
}

export function DropdownSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "请选择",
  disabled = false,
  showDescription = false,
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <label className="text-xs text-[#9CA3AF] mb-1.5 block">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#1A1C22] border border-[#2C2E33] rounded-lg text-sm hover:border-[#0ABAB5]/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0 w-5 h-5 flex items-center justify-center text-xs font-bold text-white rounded bg-gradient-to-br from-[#8B5CF6] to-[#EC4899]">
              {typeof selectedOption.icon === 'string' 
                ? selectedOption.icon.substring(0, 2) 
                : selectedOption.icon}
            </span>
          )}
          <span className={`truncate ${value ? "text-[#F5F5F5]" : "text-[#666666]"}`}>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#888888] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 w-full mt-1 bg-[#1E1F24] border border-[#2C2E33] rounded-lg shadow-xl overflow-hidden max-h-72 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full px-3 py-2.5 text-left transition-colors flex items-start gap-2 ${
                option.disabled
                  ? "text-[#666666] cursor-not-allowed"
                  : value === option.value
                  ? "text-[#0ABAB5] bg-[#0ABAB5]/10"
                  : "text-[#F5F5F5] hover:bg-[#2C2E33]"
              }`}
            >
              {option.icon && (
                <span className="shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold text-white rounded bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] mt-0.5">
                  {typeof option.icon === 'string' ? option.icon.substring(0, 2) : option.icon}
                </span>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm">{option.label}</span>
                {option.description && (
                  <span className={`text-xs mt-0.5 ${value === option.value ? "text-[#0ABAB5]/70" : "text-[#888888]"}`}>
                    {option.description}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface SelectButtonGroupProps {
  label: string;
  value: number;
  options: { value: number; label: string }[];
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function SelectButtonGroup({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: SelectButtonGroupProps) {
  return (
    <div>
      <label className="text-xs text-[#9CA3AF] mb-1.5 block">{label}</label>
      <div className="flex gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(option.value)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              disabled
                ? "opacity-40 cursor-not-allowed"
                : value === option.value
                ? "bg-[#0ABAB5] text-white"
                : "bg-[#1A1C22] border border-[#2C2E33] text-[#888888] hover:border-[#0ABAB5]/50 hover:text-[#F5F5F5]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface AspectRatioOption {
  value: string;
  label: string;
  icon: string;
}

interface AspectRatioSelectorProps {
  label: string;
  value: string;
  options: AspectRatioOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function AspectRatioSelector({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: AspectRatioSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Aspect ratio display boxes
  const renderAspectBox = (ratio: string) => {
    const [w, h] = ratio.split(':').map(Number);
    const maxSize = 16;
    const scale = maxSize / Math.max(w, h);
    const boxW = Math.round(w * scale);
    const boxH = Math.round(h * scale);
    
    return (
      <div 
        className="flex items-center justify-center"
        style={{ width: boxW, height: boxH }}
      >
        <div 
          className="border border-current rounded-sm"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  };

  return (
    <div className="relative" ref={ref}>
      <label className="text-xs text-[#9CA3AF] mb-1.5 block">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#1A1C22] border border-[#2C2E33] rounded-lg text-sm hover:border-[#0ABAB5]/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          {selectedOption && (
            <span className="w-4 h-4 flex items-center justify-center text-[#888888]">
              {renderAspectBox(selectedOption.value)}
            </span>
          )}
          <span className={`${value ? "text-[#F5F5F5]" : "text-[#666666]"}`}>
            {selectedOption?.label || "请选择"}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#888888] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 w-full mt-1 bg-[#1E1F24] border border-[#2C2E33] rounded-lg shadow-xl overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full px-3 py-2.5 text-left transition-colors flex items-center gap-3 ${
                disabled
                  ? "text-[#666666] cursor-not-allowed"
                  : value === option.value
                  ? "text-[#0ABAB5] bg-[#0ABAB5]/10"
                  : "text-[#F5F5F5] hover:bg-[#2C2E33]"
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center text-[#888888]">
                {renderAspectBox(option.value)}
              </span>
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
