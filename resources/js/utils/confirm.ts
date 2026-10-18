import axios from "axios";
import Swal from "sweetalert2";
import { notifySuccess } from "./toast";

interface ConfirmDeleteOptions {

  message: string;

  url: string;

  successText: string;

  onDeleted: () => void;
}

export const confirmDelete = ({
  message,
  url,
  successText,
  onDeleted,
}: ConfirmDeleteOptions): void => {
  Swal.fire({
    title: "Apakah Anda yakin?",
    text: message,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    buttonsStyling: false,
    customClass: {
      confirmButton:
        "inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 mx-2 focus:outline-none",
      cancelButton:
        "inline-flex items-center justify-center rounded-lg bg-gray-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none",
    },
    showLoaderOnConfirm: true,
    preConfirm: async () => {
      try {
        const res = await axios.post(url, {
          _method: "DELETE",
        });
        if (res.data.status !== "success") {
          throw new Error(res.data.error || "Gagal menghapus");
        }
        return res.data;
      } catch (error: any) {
        Swal.showValidationMessage(
          `Gagal menghapus: ${error.response?.data?.error || error.message}`
        );
      }
    },
    allowOutsideClick: () => !Swal.isLoading(),
  }).then((result) => {
    if (result.isConfirmed) {
      notifySuccess("Berhasil!", successText);
      onDeleted();
    }
  });
};