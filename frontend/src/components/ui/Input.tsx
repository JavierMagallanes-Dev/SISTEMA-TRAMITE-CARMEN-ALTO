// src/components/ui/Input.tsx
import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:   string;
  error?:   string;
  helper?:  string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-3 py-2 text-sm border rounded-lg outline-none
            transition-colors placeholder:text-gray-400
            ${error
              ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }
            disabled:bg-gray-50 disabled:text-gray-400
            ${className}
          `}
          {...props}
        />
        {error  && <p className="text-xs text-red-500">{error}</p>}
        {helper && <p className="text-xs text-gray-500">{helper}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;