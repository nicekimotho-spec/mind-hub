import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";

const FIELD_BASE =
  "block w-full rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm " +
  "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 " +
  "disabled:bg-stone-100 disabled:text-stone-500";
const FIELD_ERROR = "border-rose-400";
const FIELD_NORMAL = "border-stone-300";

function describedBy(hintId?: string, errorId?: string): string | undefined {
  return [hintId, errorId].filter(Boolean).join(" ") || undefined;
}

function FieldLabel({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-stone-700">
      {label}
      {required && (
        <span className="ml-0.5 text-rose-600" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

function FieldMessages({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return (
    <>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-stone-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { id, label, error, hint, required, className, ...props },
  ref,
) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint ? `${id}-hint` : undefined, error ? `${id}-error` : undefined)}
        className={clsx(FIELD_BASE, error ? FIELD_ERROR : FIELD_NORMAL, className)}
        {...props}
      />
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
});

interface TextareaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  { id, label, error, hint, required, className, rows = 4, ...props },
  ref,
) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint ? `${id}-hint` : undefined, error ? `${id}-error` : undefined)}
        className={clsx(FIELD_BASE, error ? FIELD_ERROR : FIELD_NORMAL, className)}
        {...props}
      />
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
});

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { id, label, error, hint, required, className, children, ...props },
  ref,
) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <select
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint ? `${id}-hint` : undefined, error ? `${id}-error` : undefined)}
        className={clsx(FIELD_BASE, error ? FIELD_ERROR : FIELD_NORMAL, "pr-8", className)}
        {...props}
      >
        {children}
      </select>
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
});

interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  id: string;
  label: string;
}

export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(function CheckboxField(
  { id, label, className, ...props },
  ref,
) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm text-stone-700">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={clsx(
          "mt-0.5 h-4 w-4 rounded border-stone-300 text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500",
          className,
        )}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
});

/** A labelled group of yes/no radio pairs — used for the intake safety-screening
 * questions, where each item needs its own fieldset/legend so screen readers announce
 * the question the two radio options belong to. */
export function YesNoField({
  legend,
  name,
  value,
  onChange,
  hint,
}: {
  legend: string;
  name: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <fieldset aria-describedby={hintId}>
      <legend className="mb-1 text-sm font-medium text-stone-700">{legend}</legend>
      {hint && (
        <p id={hintId} className="mb-1 text-xs text-stone-500">
          {hint}
        </p>
      )}
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 text-sm text-stone-700">
          <input
            type="radio"
            name={name}
            checked={value === true}
            onChange={() => onChange(true)}
            className="h-4 w-4 border-stone-300 text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          Yes
        </label>
        <label className="flex items-center gap-1.5 text-sm text-stone-700">
          <input
            type="radio"
            name={name}
            checked={value === false}
            onChange={() => onChange(false)}
            className="h-4 w-4 border-stone-300 text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          No
        </label>
      </div>
    </fieldset>
  );
}

/** A labelled group of checkboxes toggling membership in a string[] value — used for
 * the intake form's concern tags, availability days, and times of day. */
export function CheckboxGroupField({
  legend,
  name,
  options,
  labels,
  value,
  onChange,
  error,
  columns = 1,
}: {
  legend: string;
  name: string;
  options: readonly string[];
  labels?: Record<string, string>;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  columns?: 1 | 2 | 3;
}) {
  const errorId = error ? `${name}-error` : undefined;
  const gridClass = columns === 3 ? "grid-cols-3" : columns === 2 ? "grid-cols-2" : "grid-cols-1";

  function toggle(option: string) {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  }

  return (
    <fieldset aria-describedby={errorId}>
      <legend className="mb-1 text-sm font-medium text-stone-700">{legend}</legend>
      <div className={clsx("grid gap-2", gridClass)}>
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name={name}
              checked={value.includes(option)}
              onChange={() => toggle(option)}
              className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {labels?.[option] ?? option}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}
