import Swal from "sweetalert2";
import { playSound } from "./sound";

export const TOAST_ICON_HTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

export const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  customClass: {
    popup: "swal2-toast-error-custom",
    icon: "swal2-toast-icon-custom",
  },
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

export const notifyError = (title: string): void => {
  playSound("notification");
  Toast.fire({ iconHtml: TOAST_ICON_HTML, title });
};

export const notifySuccess = (title: string, text?: string): void => {
  playSound("success");
  Swal.fire({
    icon: "success",
    title,
    ...(text ? { text } : {}),
    showConfirmButton: false,
    timer: 2000,
  });
};

export const notifyServerError = (text: string): void => {
  playSound("notification");
  Swal.fire({ icon: "error", title: "Gagal!", text });
};

export const toast = Toast;

export const confirmDialog = async (title: string, text: string): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#f87201",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Ya, Lanjutkan",
    cancelButtonText: "Batal",
  });
  return result.isConfirmed;
};