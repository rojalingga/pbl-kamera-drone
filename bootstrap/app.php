<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetMenuSession;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            SetMenuSession::class,
            HandleInertiaRequests::class,
        ]);
        $middleware->trustProxies(at: '*');
        $middleware->validateCsrfTokens(except: [
            'midtrans/webhook',
        ]);
        $middleware->redirectUsersTo(
            fn (Request $request) => $request->is('admin') || $request->is('admin/*') ? route('dashboard.index') : route('home')
        );
        $middleware->redirectGuestsTo(
            fn (Request $request) => $request->is('admin') || $request->is('admin/*') ? route('login') : route('home')
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (HttpException $e, Request $request) {
            $component = match ($e->getStatusCode()) {
                403 => 'Errors/403',
                404 => 'Errors/404',
                default => null,
            };

            if ($component === null || $request->expectsJson()) {
                return null;
            }

            return Inertia::render($component, [
                'status' => $e->getStatusCode(),
                'message' => $e->getMessage(),
            ])->toResponse($request)->setStatusCode($e->getStatusCode());
        });
    })->create();
