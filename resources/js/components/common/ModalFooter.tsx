type ModalFooterVariant = "blue" | "brand" | "blueSoft";

interface ModalFooterProps {

  onCancel: () => void;

  isSubmitting?: boolean;

  cancelLocked?: boolean;

  variant?: ModalFooterVariant;
}

const SUBMIT_CLASSES: Record<ModalFooterVariant, string> = {
  blue: "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-blue-700 disabled:opacity-70 transition-colors",
  brand: "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 disabled:opacity-70 focus:outline-none",
  blueSoft:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none",
};

const SPINNER_CLASSES: Record<ModalFooterVariant, string> = {
  blue: "size-4 animate-spin rounded-full border-2 border-white border-t-transparent",
  brand: "size-4 animate-spin rounded-full border-2 border-white border-t-transparent",
  blueSoft:
    "size-4 animate-spin rounded-full border-2 border-white/40 border-t-white",
};

const ModalFooter = ({
  onCancel,
  isSubmitting = false,
  cancelLocked = true,
  variant = "blue",
}: ModalFooterProps) => {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 sm:px-8 sm:py-5 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
      <button
        type="button"
        onClick={onCancel}
        disabled={cancelLocked ? isSubmitting : undefined}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
      >
        Batal
      </button>

      <button
        type="submit"
        disabled={isSubmitting}
        className={SUBMIT_CLASSES[variant]}
      >
        {isSubmitting && (
          <div className={SPINNER_CLASSES[variant]} />
        )}
        <span>{isSubmitting ? "Menyimpan..." : "Simpan"}</span>
      </button>
    </div>
  );
};

export default ModalFooter;