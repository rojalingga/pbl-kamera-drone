# -----------------------------------------------------------
# Stage 1: Build Frontend Assets (Vite + React + Tailwind v4)
# -----------------------------------------------------------
FROM node:20-alpine AS frontend
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# -----------------------------------------------------------
# Stage 2: Production PHP 8.3 + FPM + Nginx + Supervisor
# -----------------------------------------------------------
FROM php:8.3-fpm-alpine

# Install paket sistem yang dibutuhkan
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    git \
    unzip \
    libpq-dev \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    icu-dev \
    linux-headers

# Install ekstensi PHP
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        pgsql \
        zip \
        gd \
        bcmath \
        intl \
        opcache \
        pcntl \
        exif

# Copy Composer binary dari official image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Salin composer files terlebih dahulu untuk cache layer
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# Salin seluruh source code proyek
COPY . .

# Salin aset frontend hasil build dari Stage 1
COPY --from=frontend /app/public/build ./public/build

# Selesaikan instalasi composer & autoloader optimize
RUN composer dump-autoload --optimize --no-dev

# Salin konfigurasi Docker
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/custom.ini
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set permission storage dan bootstrap/cache
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
