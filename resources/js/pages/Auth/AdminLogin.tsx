import React, { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import axios from "axios";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { fieldErrorProps } from "@/components/form/FieldError";
import { CheckCircleIcon, EyeCloseIcon, EyeIcon, LockIcon, UserIcon } from "@/icons";
import { handleFormError } from "@/utils/form-error";
import { playSound } from "@/utils/sound";
import type { PageProps } from "@/types";

const FITUR = [
  "Kelola penyewaan, pengembalian, dan perawatan unit dalam satu tempat.",
  "Pantau stok, keuangan, dan piutang secara real-time.",
  "Hak akses bertingkat untuk setiap pengguna tim.",
];

export default function AdminLogin() {
  const { appName } = usePage<PageProps>().props;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const response = await axios.post("/admin/login", { username, password });

      playSound("success");
      router.visit(response.data.redirect);
    } catch (err) {
      handleFormError(err, setErrors);
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head title="Login Admin" />

      {/* min-h-screen dikompensasi zoom 0.9 di app.css agar panel tetap penuh setinggi viewport */}
      <div className="selection:bg-brand-500 selection:text-white flex min-h-[calc(100vh/0.9)] bg-gray-50 dark:bg-gray-900">
        {/* Panel kiri: branding */}
        <div className="relative hidden w-1/2 overflow-hidden bg-gray-900 lg:flex lg:flex-col xl:w-[55%]">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-800 to-gray-900" />
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.35),transparent_45%),radial-gradient(circle_at_82%_72%,rgba(248,114,1,0.45),transparent_45%)]" />
          <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:48px_48px]" />

          <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
            <img src="/assets/img/Logo White.svg" alt="Logo SkyLens" className="h-9 w-auto" />

            <div className="max-w-md">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/80 ring-1 ring-inset ring-white/20">
                Admin CMS
              </span>

              <h1 className="mt-6 text-3xl font-semibold text-white xl:text-4xl">
                Sistem Rental Kamera &amp; Drone
              </h1>
              <p className="mt-4 text-base/relaxed text-white/70">
                Kelola transaksi sewa, inventaris, dan keuangan rental Anda dari satu panel yang rapi dan mudah dipantau.
              </p>

              <ul className="mt-8 space-y-4">
                {FITUR.map((fitur) => (
                  <li key={fitur} className="flex items-start gap-3 text-sm text-white/80">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/20">
                      <CheckCircleIcon className="size-3.5" />
                    </span>
                    <span>{fitur}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-white/50">
              &copy; {new Date().getFullYear()} {appName}. Seluruh hak cipta dilindungi.
            </p>
          </div>
        </div>

        {/* Panel kanan: form login */}
        <div className="flex w-full items-center justify-center px-6 py-12 sm:px-12 lg:w-1/2 xl:w-[45%]">
          <div className="w-full max-w-md">
            <div className="mb-10 flex justify-center lg:hidden">
              <img src="/assets/img/Logo Black.svg" alt="Logo SkyLens" className="h-9 w-auto dark:hidden" />
              <img src="/assets/img/Logo White.svg" alt="Logo SkyLens" className="hidden h-9 w-auto dark:block" />
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Masuk ke Admin CMS
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Gunakan akun yang terdaftar untuk melanjutkan.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <div>
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="ps-[44px]"
                    {...fieldErrorProps(errors, "username")}
                  />
                  <span className="pointer-events-none absolute start-0 top-0 flex h-11 items-center ps-3.5 text-gray-500 dark:text-gray-400">
                    <UserIcon className="size-5" />
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ps-[44px] pe-[44px]"
                    {...fieldErrorProps(errors, "password")}
                  />
                  <span className="pointer-events-none absolute start-0 top-0 flex h-11 items-center ps-3.5 text-gray-500 dark:text-gray-400">
                    <LockIcon className="size-5" />
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    className="absolute end-0 top-0 flex h-11 items-center pe-3.5 text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeCloseIcon className="size-5" /> : <EyeIcon className="size-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>

            <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Akun demo</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Username <span className="font-medium text-gray-700 dark:text-gray-300">admin</span>
                {" · "}
                Password <span className="font-medium text-gray-700 dark:text-gray-300">password</span>
              </p>
            </div>

            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-brand-600 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Kembali ke website
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}