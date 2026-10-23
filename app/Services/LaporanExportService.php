<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use TCPDF;

class LaporanExportService
{
    private const WARNA_HEADER_EXCEL = 'FDE3B8';

    private const WARNA_HEADER_PDF = '#FDE3B8';

    /**
     * Waktu cetak dan nama berkas mengikuti waktu lokal Indonesia,
     * bukan UTC default config/app.php.
     */
    private const ZONA_WAKTU = 'Asia/Jakarta';

    /** Lebar kolom No (persen) pada tabel PDF. */
    private const LEBAR_NO_PDF = 5.0;

    public function excel(string $namaFile, string $judul, array $kepala, array $baris): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(mb_substr($judul, 0, 31));
        $spreadsheet->getProperties()->setTitle($judul);

        $jumlahKolom = count($kepala);

        foreach (array_values($kepala) as $indeks => $teks) {
            $sheet->setCellValue([$indeks + 1, 1], $teks);
        }

        $sheet->getStyle([1, 1, $jumlahKolom, 1])->applyFromArray([
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::WARNA_HEADER_EXCEL]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);

        foreach ($baris as $indeksBaris => $item) {
            foreach (array_values($item) as $indeksKolom => $nilai) {
                $sheet->setCellValue([$indeksKolom + 1, $indeksBaris + 2], $nilai);
            }
        }

        $barisTerakhir = count($baris) + 1;

        if ($barisTerakhir >= 1 && $jumlahKolom >= 1) {
            $sheet->getStyle([1, 1, $jumlahKolom, $barisTerakhir])->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
        }

        for ($kolom = 1; $kolom <= $jumlahKolom; $kolom++) {
            $sheet->getColumnDimensionByColumn($kolom)->setAutoSize(true);
        }

        $sheet->freezePane('A2');

        $namaBerkas = $namaFile.'-'.Carbon::now(self::ZONA_WAKTU)->format('Ymd-His').'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $namaBerkas, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function pdf(string $namaFile, string $judul, array $kepala, array $baris, ?string $subjudul = null): Response
    {
        $pdf = new TCPDF('L', 'mm', 'A4', true, 'UTF-8', false);
        $pdf->SetCreator('Rental Kamera Drone');
        $pdf->SetTitle($judul);
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetMargins(10, 10, 10);
        $pdf->SetAutoPageBreak(true, 10);
        $pdf->AddPage();
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->Cell(0, 8, $judul, 0, 1, 'C');
        $pdf->SetFont('helvetica', '', 9);
        $pdf->Cell(0, 6, ($subjudul ? $subjudul.' | ' : '').'Dicetak: '.Carbon::now(self::ZONA_WAKTU)->locale('id')->translatedFormat('j F Y H:i'), 0, 1, 'C');
        $pdf->Ln(2);

        $jumlahKolom = count($kepala) + 1;
        $lebarKolom = $this->lebarKolomPdf(count($kepala));

        $html = '<table border="1" cellpadding="4" cellspacing="0" style="width:100%;border-collapse:collapse;">';

        $html .= '<colgroup>';
        foreach ($lebarKolom as $lebar) {
            $html .= '<col width="'.$lebar.'%" />';
        }
        $html .= '</colgroup><thead><tr>';

        $html .= '<th width="'.$lebarKolom[0].'%" style="background-color:'.self::WARNA_HEADER_PDF.';font-weight:bold;text-align:center;">No</th>';

        foreach ($kepala as $indeks => $teks) {
            $html .= '<th width="'.$lebarKolom[$indeks + 1].'%" style="background-color:'.self::WARNA_HEADER_PDF.';font-weight:bold;text-align:center;">'.e($teks).'</th>';
        }

        $html .= '</tr></thead><tbody>';

        if ($baris === []) {
            $html .= '<tr><td colspan="'.max(1, $jumlahKolom).'" style="text-align:center;">Belum ada data.</td></tr>';
        }

        foreach ($baris as $indeksBaris => $item) {
            $html .= '<tr>';
            $html .= '<td width="'.$lebarKolom[0].'%" style="text-align:center;">'.($indeksBaris + 1).'</td>';

            foreach (array_values($item) as $indeksKolom => $nilai) {
                $html .= '<td width="'.$lebarKolom[$indeksKolom + 1].'%">'.e((string) $nilai).'</td>';
            }

            $html .= '</tr>';
        }

        $html .= '</tbody></table>';

        $pdf->writeHTML($html, true, false, true, false, '');

        $konten = $pdf->Output($namaFile.'-'.Carbon::now(self::ZONA_WAKTU)->format('Ymd-His').'.pdf', 'S');

        return response($konten, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$namaFile.'.pdf"',
        ]);
    }

    /**
     * Lebar tiap kolom dalam persen: kolom No sempit, sisanya dibagi rata,
     * totalnya tepat 100% agar garis header dan isi tabel sejajar.
     *
     * @return array<int, float>
     */
    private function lebarKolomPdf(int $jumlahKolom): array
    {
        if ($jumlahKolom < 1) {
            return [100.0];
        }

        $sisa = 100 - self::LEBAR_NO_PDF;
        $dasar = $sisa / $jumlahKolom;

        $lebar = array_fill(0, $jumlahKolom, round($dasar, 4));
        $lebar[$jumlahKolom - 1] = round($sisa - array_sum(array_slice($lebar, 0, $jumlahKolom - 1)), 4);

        return array_merge([self::LEBAR_NO_PDF], $lebar);
    }
}
