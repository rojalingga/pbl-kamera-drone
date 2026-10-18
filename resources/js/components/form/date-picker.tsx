import Label from "@/components/form/Label";
import { CalenderIcon } from "@/icons";
import { cn } from "@/utils";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Indonesian } from "flatpickr/dist/l10n/id.js";
import { useEffect, useRef } from "react";
type Hook = flatpickr.Options.Hook;
type DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  minDate?: DateOption;
  static?: boolean;
  align?: "auto" | "left" | "right";
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  minDate,
  static: isStatic = true,
  align = "auto",
  placeholder,
  className,
  disabled = false,
}: PropsType) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const updatePosition = (instance: flatpickr.Instance) => {
    const calendar = instance.calendarContainer;
    const input = inputRef.current || document.getElementById(id);
    if (!calendar || !input) return;

    calendar.style.transform = "";

    const calendarWidth = calendar.offsetWidth || 260;
    const inputRect = input.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // Find nearest container with overflow or modal dialog
    const container = input.closest<HTMLElement>(
      '.overflow-y-auto, .overflow-hidden, [role="dialog"], .rounded-3xl, .rounded-2xl'
    );
    const containerRect = container ? container.getBoundingClientRect() : null;

    const safeLeft = Math.max(8, (containerRect ? containerRect.left : 0) + 8);
    const safeRight = Math.min(
      viewportWidth - 8,
      (containerRect ? containerRect.right : viewportWidth) - 8
    );

    let effectiveAlign = align;

    if (effectiveAlign === "auto") {
      const rightEdgeIfLeft = inputRect.left + calendarWidth;
      const leftEdgeIfRight = inputRect.right - calendarWidth;

      if (rightEdgeIfLeft > safeRight && leftEdgeIfRight >= safeLeft) {
        effectiveAlign = "right";
      } else if (leftEdgeIfRight < safeLeft && rightEdgeIfLeft <= safeRight) {
        effectiveAlign = "left";
      } else {
        const centerPoint = containerRect
          ? (containerRect.left + containerRect.right) / 2
          : viewportWidth / 2;
        const inputCenter = (inputRect.left + inputRect.right) / 2;
        effectiveAlign = inputCenter > centerPoint ? "right" : "left";
      }
    }

    if (effectiveAlign === "right") {
      calendar.classList.add("align-right");
      calendar.classList.remove("align-left");
      calendar.style.left = "auto";
      calendar.style.right = "0px";
    } else {
      calendar.classList.add("align-left");
      calendar.classList.remove("align-right");
      calendar.style.left = "0px";
      calendar.style.right = "auto";
    }

    // Safety clamp: ensure calendar doesn't bleed outside safeLeft / safeRight
    requestAnimationFrame(() => {
      if (!calendar) return;
      const calRect = calendar.getBoundingClientRect();
      if (calRect.left < safeLeft) {
        const shift = Math.ceil(safeLeft - calRect.left);
        calendar.style.transform = `translateX(${shift}px)`;
      } else if (calRect.right > safeRight) {
        const shift = Math.floor(safeRight - calRect.right);
        calendar.style.transform = `translateX(${shift}px)`;
      }
    });
  };

  useEffect(() => {
    const el = inputRef.current || document.getElementById(id);
    if (!el) return;

    const fp = flatpickr(el, {
      locale: {
        ...Indonesian,
        firstDayOfWeek: 1,
      },
      mode: mode || "single",
      static: isStatic,
      clickOpens: !disabled,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      defaultDate,
      minDate,
      onReady: (_selectedDates, _dateStr, instance) => {
        updatePosition(instance);
      },
      onOpen: (_selectedDates, _dateStr, instance) => {
        updatePosition(instance);
      },
      onChange: (selectedDates, dateStr, instance) => {
        if (Array.isArray(onChangeRef.current)) {
          onChangeRef.current.forEach((fn) => fn(selectedDates, dateStr, instance));
        } else if (onChangeRef.current) {
          onChangeRef.current(selectedDates, dateStr, instance);
        }
      },
      prevArrow:
        '<svg class="stroke-current rtl:rotate-180" width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      nextArrow:
        '<svg class="stroke-current rtl:rotate-180" width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    });

    fpRef.current = Array.isArray(fp) ? fp[0] : fp;

    const handleResize = () => {
      if (fpRef.current && fpRef.current.isOpen) {
        updatePosition(fpRef.current);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (fpRef.current) {
        fpRef.current.destroy();
        fpRef.current = null;
      }
    };
  }, [id, mode, disabled, isStatic, align]);

  useEffect(() => {
    if (fpRef.current && defaultDate !== undefined) {
      fpRef.current.setDate(defaultDate, false);
    }
  }, [defaultDate]);

  useEffect(() => {
    if (fpRef.current && minDate !== undefined) {
      fpRef.current.set("minDate", minDate);
    }
  }, [minDate]);

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "h-11 w-full appearance-none rounded-lg border border-gray-300 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-400" +
            "  bg-transparent py-2.5 ps-4 pe-10 text-start text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800",
            className,
          )}
        />

        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
          <CalenderIcon className="size-6" />
        </span>
      </div>
    </div>
  );
}
