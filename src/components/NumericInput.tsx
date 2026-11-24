import { useEffect, useState } from 'react';

interface NumericInputProps {
  id?: string;
  ariaLabel?: string;
  title?: string;
  value: number;
  min?: number;
  max?: number;
  integer?: boolean;
  placeholder?: string;
  className?: string;
  onValueChange: (next: number) => void;
}

/**
 * Frictionless numeric input for desktop & mobile touch keyboards:
 * - Allows clearing the field and typing decimals ("0.05", "14.5") without cursor jumps or stuck leading zeros.
 * - Immediately emits valid clamped values on every keystroke and normalizes cleanly on blur.
 */
export function NumericInput({
  id,
  ariaLabel,
  title,
  value,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  integer = false,
  placeholder,
  className,
  onValueChange,
}: NumericInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!focused) {
      setDraft(String(value));
    }
  }, [value, focused]);

  const handleChange = (raw: string) => {
    // Allow digits, optional single decimal point (or comma converted to dot)
    const normalized = raw.replace(',', '.');
    const pattern = integer ? /^\d*$/ : /^\d*\.?\d*$/;
    if (!pattern.test(normalized)) return;

    setDraft(normalized);

    if (normalized === '' || normalized === '.') {
      return;
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(max, Math.max(min, integer ? Math.floor(parsed) : parsed));
      onValueChange(clamped);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = Number(draft.replace(',', '.'));
    if (draft.trim() === '' || !Number.isFinite(parsed)) {
      const fallback = Math.max(min, value);
      setDraft(String(fallback));
      onValueChange(fallback);
      return;
    }
    const clamped = Math.min(max, Math.max(min, integer ? Math.floor(parsed) : parsed));
    setDraft(String(clamped));
    onValueChange(clamped);
  };

  return (
    <input
      id={id}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      aria-label={ariaLabel}
      title={title}
      value={draft}
      placeholder={placeholder}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onBlur={handleBlur}
      onChange={(e) => handleChange(e.target.value)}
      className={className}
    />
  );
}
