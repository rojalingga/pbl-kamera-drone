import Input from "@/components/form/input/InputField";
import { formatInteger } from "@/utils/format";

interface RupiahInputProps {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  hint?: string;
  disabled?: boolean;
}

const RupiahInput = ({
  id,
  name,
  value,
  onChange,
  placeholder = "Contoh: 150.000",
  error = false,
  hint = "",
  disabled = false,
}: RupiahInputProps) => {
  return (
    <div className="relative">
      <Input
        id={id}
        name={name ?? id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        className="ps-14"
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits ? formatInteger(digits) : "");
        }}
        error={error}
        hint={hint}
        disabled={disabled}
      />
      <span className="absolute start-0 top-0 flex h-11 items-center border-e border-gray-200 px-3.5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        Rp.
      </span>
    </div>
  );
};

export default RupiahInput;