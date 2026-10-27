<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Google Gemini API Configuration
    |--------------------------------------------------------------------------
    */

    'api_key' => env('GEMINI_API_KEY', ''),

    'model' => env('GEMINI_MODEL', 'gemini-3.5-flash-lite'),

    'api_base_url' => 'https://generativelanguage.googleapis.com/v1beta/models',

    /*
    |--------------------------------------------------------------------------
    | Request Timeout (detik)
    |--------------------------------------------------------------------------
    */
    'timeout' => 30,

    /*
    |--------------------------------------------------------------------------
    | Safety Settings — blokir konten berbahaya di level tinggi
    |--------------------------------------------------------------------------
    */
    'safety_settings' => [
        [
            'category' => 'HARM_CATEGORY_HARASSMENT',
            'threshold' => 'BLOCK_MEDIUM_AND_ABOVE',
        ],
        [
            'category' => 'HARM_CATEGORY_HATE_SPEECH',
            'threshold' => 'BLOCK_MEDIUM_AND_ABOVE',
        ],
        [
            'category' => 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            'threshold' => 'BLOCK_MEDIUM_AND_ABOVE',
        ],
        [
            'category' => 'HARM_CATEGORY_DANGEROUS_CONTENT',
            'threshold' => 'BLOCK_MEDIUM_AND_ABOVE',
        ],
    ],
];
