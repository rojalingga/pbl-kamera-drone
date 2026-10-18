import React from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import AppLayout from "@/layout/AppLayout";
import { LockIcon } from "@/icons";

interface ErrorPageProps {
  status?: number;
  message?: string;
}

const fallbackMessage =
  "Anda tidak memiliki hak akses untuk membuka halaman ini. Hubungi administrator bila Anda merasa ini keliru.";

export default function Forbidden({ status = 403, message = "" }: ErrorPageProps) {
  const { auth } = usePage<{ auth: { user: unknown } | null }>().props;
  const isGuest = !auth?.user;

  const panel = (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-theme-xs sm:px-12 dark:border-gray-800 dark:bg-gray-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-lg flex-col items-center">
        <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400">
          <LockIcon className="size-8" />
        </span>

        <p className="mt-6 text-title-2xl font-semibold tracking-tight text-brand-500/20 dark:text-brand-500/30">
          {status}
        </p>

        <h1 className="-mt-2 text-xl font-semibold text-gray-800 dark:text-white/90">
          Akses Ditolak
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {message || fallbackMessage}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 focus:outline-none"
          >
            Kembali ke Dashboard
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Halaman Utama
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head title="403 - Akses Ditolak" />

      {isGuest ? (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
          {panel}
        </div>
      ) : (
        <AppLayout>{panel}</AppLayout>
      )}
    </>
  );
}