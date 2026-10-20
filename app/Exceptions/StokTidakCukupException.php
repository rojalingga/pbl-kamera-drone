<?php

namespace App\Exceptions;

use RuntimeException;

class StokTidakCukupException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?string $idBarang = null,
        public readonly ?int $stokTersedia = null
    ) {
        parent::__construct($message);
    }
}
