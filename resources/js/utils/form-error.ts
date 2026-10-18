import Swal from "sweetalert2";
import { playSound } from "./sound";
import { notifyServerError, Toast, TOAST_ICON_HTML } from "./toast";

interface HandleFormErrorOptions {

  businessError?: boolean;

  includeMessage?: boolean;
}

export const handleFormError = (
  err: any,
  setErrors: (errors: Record<string, string[]>) => void,
  options: HandleFormErrorOptions = {}
): void => {
  const { businessError = false, includeMessage = false } = options;

  if (err.response && err.response.status === 422) {
    if (
      businessError &&
      err.response.data?.error &&
      !err.response.data?.errors
    ) {
      playSound("notification");
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: err.response.data.error,
      });
      return;
    }

    playSound("notification");
    Toast.fire({
      iconHtml: TOAST_ICON_HTML,
      title: "Ada kesalahan input!",
    });
    setErrors(err.response.data.errors || {});
    return;
  }

  notifyServerError(
    err.response?.data?.error ||
      (includeMessage ? err.response?.data?.message : undefined) ||
      "Terjadi kesalahan pada server."
  );
};