import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function PrimaryButton({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-[22px] bg-ink px-5 py-4 text-sm font-medium text-white shadow-panel transition hover:translate-y-[-1px] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:text-brand-700 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextButton({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-[22px] px-4 py-4 text-sm font-medium text-brand-700 transition hover:bg-brand-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
