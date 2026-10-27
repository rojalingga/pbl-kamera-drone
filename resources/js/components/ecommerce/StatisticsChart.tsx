import type { ApexOptions } from "apexcharts";
import flatpickr from "flatpickr";
import { useEffect, useRef } from "react";
import Chart from "react-apexcharts";
import { useTranslation } from "react-i18next";
import { CalenderIcon } from "../../icons";
import ChartTab from "../common/ChartTab";

export default function StatisticsChart() {
  const { t } = useTranslation();
  const datePickerRef = useRef<HTMLInputElement>(null);

  const options: ApexOptions = {
    legend: {
      show: false,
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#465FFF", "#9CB9FF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line",
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: "straight",
      width: [2, 2],
    },

    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      x: {
        format: "dd MMM yyyy",
      },
    },
    xaxis: {
      type: "category",
      categories: [
        t("ecommerce.months.jan"),
        t("ecommerce.months.feb"),
        t("ecommerce.months.mar"),
        t("ecommerce.months.apr"),
        t("ecommerce.months.may"),
        t("ecommerce.months.jun"),
        t("ecommerce.months.jul"),
        t("ecommerce.months.aug"),
        t("ecommerce.months.sep"),
        t("ecommerce.months.oct"),
        t("ecommerce.months.nov"),
        t("ecommerce.months.dec"),
      ],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"],
        },
      },
      title: {
        text: "",
        style: {
          fontSize: "0px",
        },
      },
    },
  };

  const series = [
    {
      name: t("ecommerce.statistics.sales"),
      data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235],
    },
    {
      name: t("ecommerce.statistics.revenue"),
      data: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140],
    },
  ];

  const fpRef = useRef<flatpickr.Instance | null>(null);

  useEffect(() => {
    if (!datePickerRef.current) return;

    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);

    const fp = flatpickr(datePickerRef.current, {
      mode: "range",
      static: true,
      disableMobile: true,
      monthSelectorType: "static",
      dateFormat: "M d",
      defaultDate: [sevenDaysAgo, today],
      clickOpens: true,
      prevArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 15L7.5 10L12.5 5" stroke="" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>',
      nextArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 15L12.5 10L7.5 5" stroke="" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>',
    });

    fpRef.current = Array.isArray(fp) ? fp[0] : fp;

    return () => {
      if (fpRef.current) {
        fpRef.current.destroy();
        fpRef.current = null;
      }
    };
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-5 sm:px-6 sm:pt-6 dark:border-gray-800 dark:bg-white/3">
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("ecommerce.statistics.title")}
          </h3>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {t("ecommerce.statistics.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3 sm:justify-end">
          <ChartTab />

          <div className="relative inline-flex items-center">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Pilih rentang tanggal"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (fpRef.current) {
                  if (fpRef.current.isOpen) {
                    fpRef.current.close();
                  } else {
                    fpRef.current.open();
                    datePickerRef.current?.focus();
                  }
                }
              }}
              className="absolute inset-s-1/2 top-1/2 z-10 size-5 -translate-x-1/2 -translate-y-1/2 text-gray-500 lg:inset-s-3 lg:top-1/2 lg:translate-x-0 lg:-translate-y-1/2 rtl:translate-x-1/2 rtl:lg:translate-x-0 dark:text-gray-400 cursor-pointer flex items-center justify-center"
            >
              <CalenderIcon className="size-5" />
            </button>
            <input
              ref={datePickerRef}
              className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200 bg-white text-sm font-medium text-transparent outline-none lg:h-auto lg:w-40 lg:py-2 lg:ps-10 lg:pe-3 lg:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:lg:text-gray-300"
              placeholder={t("ecommerce.statistics.selectDateRange")}
            />
          </div>
        </div>
      </div>

      <div className="custom-scrollbar max-w-full overflow-x-auto">
        <div className="min-w-250 xl:min-w-full">
          <Chart options={options} series={series} type="area" height={310} />
        </div>
      </div>
    </div>
  );
}
