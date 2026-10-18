import { cn } from "@/utils";

export type FormErrors = Record<string, string[] | undefined>;

export const firstError = (errors: FormErrors, key: string): string => {
  const messages = errors[key];
  return messages && messages.length > 0 ? messages[0] : "";
};

export const hasError = (errors: FormErrors, key: string): boolean => {
  return firstError(errors, key) !== "";
};

export const fieldErrorProps = (
  errors: FormErrors,
  key: string,
): { error: boolean; hint: string } => {
  const message = firstError(errors, key);
  return { error: message !== "", hint: message };
};

interface FieldErrorProps {

  error?: string | string[] | undefined;
  className?: string;
}

const FieldError = ({ error, className }: FieldErrorProps) => {
  const message = Array.isArray(error) ? error[0] : error;
  if (!message) {
    return null;
  }
  return (
    <p className={cn("mt-1.5 text-xs text-error-500", className)}>{message}</p>
  );
};

export default FieldError;
