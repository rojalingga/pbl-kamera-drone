#!/bin/sh
set -e

# Pastikan permission folder storage dan bootstrap/cache aman
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Jalankan storage:link bila belum ada
php artisan storage:link --force || true

# Cache konfigurasi, route, dan view untuk optimasi production
echo "Caching configurations..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Jalankan migrasi database otomatis bila terkoneksi
echo "Running database migrations..."
php artisan migrate --force || true

echo "Starting Supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
