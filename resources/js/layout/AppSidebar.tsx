import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, usePage } from "@inertiajs/react";
import { useSidebar } from "@/context/SidebarContext";
import { cn } from "@/utils";
import {
  BoxIcon,
  GridIcon,
  BoxCubeIcon,
  PieChartIcon,
  TruckDelivery,
  PageIcon,
  SettingsAltIcon,
  ChevronDownIcon,
  HorizontaLDots,
} from "../icons";

type MenuSubItem = {
  name: string;
  path: string;
};

type NavItem = {
  key: string;
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: MenuSubItem[];
};

type SidebarMenuChild = {
  title: string;
  route_name: string;
  icon: string;
  urutan: number;
  url: string | null;
};

type SidebarMenu = {
  title: string;
  route_name: string;
  icon: string;
  urutan: number;
  url: string | null;
  children: SidebarMenuChild[];
};

/**
 * Menu sidebar berasal dari session `getmenus` yang disusun middleware
 * SetMenuSession dari hak akses user, bukan daftar hardcoded.
 * `menuIcons` hanya pemetaan tampilan: menu baru tetap muncul otomatis
 * dengan ikon default walau judulnya belum terdaftar di sini.
 */
const menuIcons: Record<string, React.ReactNode> = {
  Dashboard: <GridIcon fontSize={24} />,
  "Master Data": <BoxCubeIcon fontSize={24} />,
  Keuangan: <PieChartIcon fontSize={24} />,
  Transaksi: <TruckDelivery fontSize={24} />,
  Laporan: <PageIcon fontSize={24} />,
  Inventori: <BoxIcon fontSize={24} />,
  Pengaturan: <SettingsAltIcon fontSize={24} />,
};

const defaultIcon = <BoxCubeIcon fontSize={24} />;

/**
 * Samakan URL dari server dengan `usePage().url` yang berupa path
 * relatif: buang origin, query string, dan trailing slash.
 */
const toPath = (value: string): string => {
  const path = value.split(/[?#]/)[0].replace(/^[a-zA-Z][a-zA-Z\d+.-]*:\/\/[^/]+/, "");

  return path.length > 1 ? path.replace(/\/+$/, "") : path;
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, setIsMobileOpen } =
    useSidebar();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
  const { url, props } = usePage<{
    auth: { menus: SidebarMenu[] | null } | null;
  }>();

  const navItems = useMemo<NavItem[]>(() => {
    const menus = props.auth?.menus ?? [];

    return menus
      .map((menu) => {
        const subItems = (menu.children ?? [])
          .filter((child) => Boolean(child.url))
          .map((child) => ({ name: child.title, path: child.url as string }));

        return {
          key: String(menu.route_name),
          name: menu.title,
          icon: menuIcons[menu.title] ?? defaultIcon,
          path: menu.url ?? undefined,
          subItems: subItems.length > 0 ? subItems : undefined,
        };
      })
      .filter((nav) => Boolean(nav.path) || (nav.subItems?.length ?? 0) > 0);
  }, [props.auth?.menus]);

  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<number, number>>({});
  const subMenuRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [url]);

  const isActive = useCallback(
    (path: string) => toPath(url) === toPath(path) || toPath(url).startsWith(`${toPath(path)}/`),
    [url],
  );

  useEffect(() => {
    let submenuMatched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu(index);
            submenuMatched = true;
          }
        });
      }
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [url, isActive, navItems]);

  useEffect(() => {
    if (openSubmenu !== null && subMenuRefs.current[openSubmenu]) {
      setSubMenuHeight((prev) => ({
        ...prev,
        [openSubmenu]: subMenuRefs.current[openSubmenu]?.scrollHeight || 0,
      }));
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prev) => (prev === index ? null : index));
  };

  return (
    <aside
      className={cn(
        "fixed inset-s-0 top-0 z-50 flex h-screen flex-col border-e border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out xl:translate-x-0 xl:rtl:translate-x-0 dark:border-gray-800 dark:bg-gray-900",
        isExpanded || isMobileOpen ? "w-72.5" : isHovered ? "w-72.5" : "w-22.5",
        isMobileOpen
          ? "translate-x-0"
          : "-translate-x-full rtl:translate-x-full",
      )}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "flex py-8",
          !isExpanded && !isHovered ? "xl:justify-center" : "justify-start",
        )}
      >
        <Link href="/admin/dashboard" className="flex cursor-default items-center px-4" onClick={(e) => e.preventDefault()}>
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                src="/assets/img/Logo Black.svg"
                alt="SkyLens Logo"
                className="h-10 w-auto object-contain dark:hidden"
              />
              <img
                src="/assets/img/Logo White.svg"
                alt="SkyLens Logo"
                className="hidden h-10 w-auto object-contain dark:block"
              />
            </>
          ) : (
            <img
              src="/assets/img/Icon Black.svg"
              alt="SkyLens Icon"
              className="size-8 object-contain"
            />
          )}
        </Link>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear flex-1">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "MENU"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>

              <ul className="flex flex-col gap-1">
                {navItems.map((nav, index) => (
                  <li key={nav.key}>
                    {nav.subItems ? (
                      <button
                        onClick={() => handleSubmenuToggle(index)}
                        className={`group menu-item ${
                          openSubmenu === index
                            ? "menu-item-active"
                            : "menu-item-inactive"
                        } cursor-pointer w-full ${
                          !isExpanded && !isHovered
                            ? "xl:justify-center"
                            : "xl:justify-start"
                        }`}
                      >
                        <span
                          className={`menu-item-icon-size ${
                            openSubmenu === index
                              ? "menu-item-icon-active"
                              : "menu-item-icon-inactive"
                          }`}
                        >
                          {nav.icon}
                        </span>

                        {(isExpanded || isHovered || isMobileOpen) && (
                          <span className="menu-item-text">{nav.name}</span>
                        )}

                        {(isExpanded || isHovered || isMobileOpen) && (
                          <ChevronDownIcon
                            className={`ms-auto h-5 w-5 transition-transform duration-200 ${
                              openSubmenu === index
                                ? "rotate-180 text-brand-500"
                                : ""
                            }`}
                          />
                        )}
                      </button>
                    ) : (
                      nav.path && (
                        <Link
                          href={nav.path}
                          className={`group menu-item ${
                            isActive(nav.path)
                              ? "menu-item-active"
                              : "menu-item-inactive"
                          }`}
                        >
                          <span
                            className={`menu-item-icon-size ${
                              isActive(nav.path)
                                ? "menu-item-icon-active"
                                : "menu-item-icon-inactive"
                            }`}
                          >
                            {nav.icon}
                          </span>
                          {(isExpanded || isHovered || isMobileOpen) && (
                            <span className="menu-item-text">{nav.name}</span>
                          )}
                        </Link>
                      )
                    )}

                    {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
                      <div
                        ref={(el) => {
                          subMenuRefs.current[index] = el;
                        }}
                        className="overflow-hidden transition-all duration-300"
                        style={{
                          height:
                            openSubmenu === index
                              ? `${subMenuHeight[index] || 0}px`
                              : "0px",
                        }}
                      >
                        <ul className="ms-9 mt-2 space-y-1">
                          {nav.subItems.map((subItem) => (
                            <li
                              key={subItem.name}
                              className="relative before:absolute before:-left-3 before:-top-2 before:bottom-0 before:border-l-2 before:border-dashed before:border-gray-400/60 before:content-[''] last:before:bottom-[10%] dark:before:border-gray-600/60"
                            >
                              <Link
                                href={subItem.path}
                                className={`menu-dropdown-item ${
                                  isActive(subItem.path)
                                    ? "menu-dropdown-item-active"
                                    : "menu-dropdown-item-inactive"
                                }`}
                              >
                                {subItem.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
