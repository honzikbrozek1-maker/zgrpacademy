import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Number input that allows the field to be empty (NaN) so the user can
 * comfortably retype values. Use `Number.isFinite(value)` before saving
 * to validate that the user actually entered a number.
 */
export const NumberField = React.forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, className, ...rest }, ref) => {
    return (
      <Input
        ref={ref}
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : ''}
        onChange={e => {
          const v = e.target.value;
          onChange(v === '' ? NaN : Number(v));
        }}
        className={cn(className)}
        {...rest}
      />
    );
  },
);
NumberField.displayName = 'NumberField';
