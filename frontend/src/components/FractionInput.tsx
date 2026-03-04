import { useState, useCallback } from 'react';
import { c, inputStyle, labelStyle } from '../theme';
import { decimalToFraction, fractionToDecimal, isCleanFraction } from '../utils/fractions';

interface FractionInputProps {
  /** Current value as a decimal string (e.g. "12.375") */
  value: string;
  /** Called with the new decimal string when the user commits a change */
  onChange: (decimalStr: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  label?: string;
}

/**
 * Dimension input that lets users type fractions like "12-3/8"
 * and stores/passes decimal values to the parent.
 *
 * Focused: raw text input (user can type fractions or decimals).
 * Blurred: displays as a fraction if the value is a clean 1/16 increment,
 *          otherwise shows the decimal.
 */
export function FractionInput({ value, onChange, placeholder, style, label }: FractionInputProps) {
  const [focused, setFocused] = useState(false);
  const [rawText, setRawText] = useState('');

  /** Format a decimal string for display when the field is not focused. */
  const displayValue = useCallback((decStr: string): string => {
    if (!decStr && decStr !== '0') return '';
    const num = Number(decStr);
    if (isNaN(num)) return decStr;
    if (isCleanFraction(num)) return decimalToFraction(num);
    return decStr;
  }, []);

  const handleFocus = useCallback(() => {
    setFocused(true);
    // Show the raw decimal so the user can edit precisely
    setRawText(value ?? '');
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const trimmed = rawText.trim();
    if (trimmed === '') {
      onChange('');
      return;
    }
    const parsed = fractionToDecimal(trimmed);
    if (parsed !== null) {
      // Round to 6 decimal places to avoid floating-point dust
      const clean = Math.round(parsed * 1_000_000) / 1_000_000;
      onChange(String(clean));
    }
    // If parse fails, keep the previous value (do nothing)
  }, [rawText, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRawText(e.target.value);
  }, []);

  const shown = focused ? rawText : displayValue(value);

  const mergedStyle: React.CSSProperties = {
    ...inputStyle,
    ...(focused ? { borderColor: c.inputFocus, boxShadow: `0 0 0 2px ${c.accentMuted}` } : {}),
    ...style,
  };

  const input = (
    <input
      type="text"
      value={shown}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      style={mergedStyle}
    />
  );

  if (!label) return input;

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {input}
    </div>
  );
}
