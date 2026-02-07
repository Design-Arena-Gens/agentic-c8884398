"use client";

import type {
  ChangeEvent,
  Dispatch,
  FC,
  SetStateAction,
} from "react";
import type { StrategyConfig } from "@/lib/types";

type StrategyControlsProps = {
  config: StrategyConfig;
  onConfigChange: Dispatch<SetStateAction<StrategyConfig>>;
  autoLearn: boolean;
  onToggleAutoLearn: (value: boolean) => void;
};

export const StrategyControls: FC<StrategyControlsProps> = ({
  config,
  onConfigChange,
  autoLearn,
  onToggleAutoLearn,
}) => {
  const handleChange =
    (key: keyof StrategyConfig) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      onConfigChange((prev) => ({
        ...prev,
        [key]: Number.isFinite(value) ? value : prev[key],
      }));
    };

  const numericInput = (
    label: string,
    key: keyof StrategyConfig,
    min: number,
    max: number,
    step: number,
  ) => (
    <label className="control">
      <span>{label}</span>
      <input
        type="number"
        value={config[key]}
        min={min}
        max={max}
        step={step}
        onChange={handleChange(key)}
      />
    </label>
  );

  return (
    <section className="panel">
      <header className="panelHead">
        <div>
          <h2>Strategy Controls</h2>
          <p>Adjust the live trading parameters; learning refines them after every cycle.</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={autoLearn}
            onChange={(event) => onToggleAutoLearn(event.target.checked)}
          />
          <span>Auto-learn</span>
        </label>
      </header>
      <div className="controlsGrid">
        {numericInput("Short EMA", "shortWindow", 2, config.longWindow - 1, 1)}
        {numericInput("Long EMA", "longWindow", config.shortWindow + 1, 64, 1)}
        {numericInput("Threshold", "threshold", -5, 5, 0.1)}
        {numericInput("Risk / Trade", "riskPerTrade", 0.01, 1, 0.01)}
        {numericInput("Max Position", "maxPosition", 0.25, 5, 0.25)}
        {numericInput("Learning Rate", "learningRate", 0.05, 1, 0.05)}
      </div>
    </section>
  );
};
