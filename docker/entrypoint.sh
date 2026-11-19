#!/bin/sh
set -e

# Pastikan seluruh folder storage & framework ada
mkdir -p /var/www/html/storage/framework/cache/data \
         /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/logs \
         /var/www/html/bootstrap/cache

# Pastikan permission folder storage dan bootstrap/cache aman
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Sesuaikan port Nginx dengan variabel $PORT dari hosting (default 80)
PORT=${PORT:-80}
sed -i "s/listen 80;/listen ${PORT};/g" /etc/nginx/http.d/default.conf
sed -i "s/listen \[::\]:80;/listen [::]:${PORT};/g" /etc/nginx/http.d/default.conf

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
