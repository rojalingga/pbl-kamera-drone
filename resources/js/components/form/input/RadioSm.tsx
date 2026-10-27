import { cn } from "@/utils";

interface RadioProps {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  label: string;
  onChange: (value: string) => void;
  className?: string;
}

const RadioSm: React.FC<RadioProps> = ({
  id,
  name,
  value,
  checked,
  label,
  onChange,
  className = "",
}) => {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center text-sm text-gray-500 select-none dark:text-gray-400",
        className,
      )}
    >
      <span className="relative">

        <input
          type="radio"
          id={id}
          name={name}
          value={value}
          checked={checked}
          onChange={() => onChange(value)}
          className="sr-only"
        />

        <span
          className={cn(
            "me-2 flex h-4 w-4 items-center justify-center rounded-full border",
            checked
              ? "border-brand-500 bg-brand-500"
              : "border-gray-300 bg-transparent dark:border-gray-700",
          )}
        >

          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              checked ? "bg-white" : "bg-white dark:bg-[#1e2636]",
            )}
          ></span>
        </span>
      </span>
      {label}
    </label>
  );
};

export default RadioSm;
