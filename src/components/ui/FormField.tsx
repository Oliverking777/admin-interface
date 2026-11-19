import type { ReactNode } from "react";

type FormFieldProps = {
  /** Id of the control inside; the error message gets the id `${id}-error`. */
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

/** Label + control + hint/error, shared by the drawers' forms. */
export default function FormField({ id, label, error, hint, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}