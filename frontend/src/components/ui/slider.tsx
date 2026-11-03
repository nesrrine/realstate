"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, min = 0, max = 100, step = 1, value, onValueChange, ...props }, ref) => {
    const handleChangeMin = (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange([Number(e.target.value), value[1]]);
    };

    const handleChangeMax = (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange([value[0], Number(e.target.value)]);
    };

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={handleChangeMin}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[1]}
          onChange={handleChangeMax}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600"
        />
      </div>
    );
  }
);

Slider.displayName = "Slider";

export { Slider };