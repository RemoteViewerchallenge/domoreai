import React, { useState, useEffect, useRef } from 'react';

interface DualRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  label?: string;
  unit?: string;
}

const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
  unit = '',
}) => {
  const [minValue, setMinValue] = useState(value[0]);
  const [maxValue, setMaxValue] = useState(value[1]);
  const rangeRef = useRef<HTMLDivElement>(null);

  // Sync internal state with props
  useEffect(() => {
    setMinValue(value[0]);
    setMaxValue(value[1]);
  }, [value]);

  // Calculate percentage for positioning
  const getPercent = React.useCallback(
    (val: number) => Math.round(((val - min) / (max - min)) * 100),
    [min, max]
  );

  // Update the visual range bar
  useEffect(() => {
    if (rangeRef.current) {
      const minPercent = getPercent(minValue);
      const maxPercent = getPercent(maxValue);
      rangeRef.current.style.left = `${minPercent}%`;
      rangeRef.current.style.width = `${maxPercent - minPercent}%`;
    }
  }, [minValue, maxValue, getPercent]);

  const handleMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(event.target.value), maxValue - step);
    setMinValue(val);
    onChange([val, maxValue]);
  };

  const handleMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(event.target.value), minValue + step);
    setMaxValue(val);
    onChange([minValue, val]);
  };

  return (
    <div className="w-full py-2 font-mono">
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase">{label}</span>
          <span className="text-[10px] text-blue-400">
            {minValue} - {maxValue} {unit}
          </span>
        </div>
      )}
      
      <div className="relative w-full h-1 bg-gray-800">
        {/* The active range bar */}
        <div
          ref={rangeRef}
          className="absolute h-full bg-blue-500 z-10"
        />

        {/* Hidden Range Inputs */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minValue}
          onChange={handleMinChange}
          className="absolute w-full h-full opacity-0 z-20 cursor-pointer pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3"
          style={{ WebkitAppearance: 'none' }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          onChange={handleMaxChange}
          className="absolute w-full h-full opacity-0 z-20 cursor-pointer pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3"
          style={{ WebkitAppearance: 'none' }}
        />

        {/* Visual Thumbs */}
        <div 
            className="absolute w-3 h-3 bg-black border border-blue-400 shadow -mt-1 z-30 pointer-events-none"
            style={{ left: `calc(${getPercent(minValue)}% - 6px)` }}
        ></div>
        <div 
            className="absolute w-3 h-3 bg-black border border-blue-400 shadow -mt-1 z-30 pointer-events-none"
            style={{ left: `calc(${getPercent(maxValue)}% - 6px)` }}
        ></div>
      </div>
    </div>
  );
};

export default DualRangeSlider;
