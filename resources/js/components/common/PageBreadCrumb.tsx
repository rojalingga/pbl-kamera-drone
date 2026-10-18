import { Link } from "@inertiajs/react";

interface BreadcrumbProps {
  pageTitle: string;
  parent?: string;
  parentHref?: string;
}

const ArrowIcon = () => (
  <svg
    className="stroke-current rtl:rotate-180"
    width="17"
    height="16"
    viewBox="0 0 17 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
      stroke=""
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({
  pageTitle,
  parent,
  parentHref,
}) => {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h2
        className="text-xl font-semibold text-gray-800 dark:text-white/90"
        x-text="pageName"
      >
        {pageTitle}
      </h2>
      <nav>
        <ol className="flex items-center gap-1.5">
          {parent ? (
            <li>
              {parentHref ? (
                <Link
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                  href={parentHref}
                >
                  {parent}
                  <ArrowIcon />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  {parent}
                  <ArrowIcon />
                </span>
              )}
            </li>
          ) : (
            <li>
              <Link
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                href="/admin/dashboard"
              >
                Home
                <ArrowIcon />
              </Link>
            </li>
          )}
          <li className="text-sm text-gray-800 dark:text-white/90">
            {pageTitle}
          </li>
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;