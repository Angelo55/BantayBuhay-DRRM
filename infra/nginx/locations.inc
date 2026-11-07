# Shared by the HTTP-only and HTTPS sites. The API listens on 127.0.0.1:3000 on the same server.
server_tokens off;
client_max_body_size 5m;

root /opt/bantaybuhay/current/apps/web/dist;
index index.html;

# Ubuntu's nginx compresses only HTML by default. The app's script bundle is about 460 KB raw and
# about 145 KB compressed, which matters most on a phone connection.
gzip on;
gzip_vary on;
gzip_comp_level 6;
gzip_min_length 1024;
gzip_types text/css text/javascript application/javascript application/json image/svg+xml;

# Applies to every location below, none of which sets its own add_header.
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
# The console's map loads its street basemap from OpenFreeMap and runs its renderer in a worker.
add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https://tiles.openfreemap.org; img-src 'self' data: blob:; worker-src 'self' blob:; child-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;

# Detector-only routes serve the detection server on the private network. They also need a
# token, but there's no reason to expose them through the public entrance at all.
location ^~ /api/internal/ {
    return 404;
}
location ~ ^/api/cameras/[^/]+/heartbeat$ {
    return 404;
}
location = /api/detections {
    limit_except GET {
        deny all;
    }
    limit_req zone=api burst=40 nodelay;
    limit_req_status 429;
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /api/ {
    limit_req zone=api burst=40 nodelay;
    limit_req_status 429;
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /socket.io/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 1h;
}

# Nginx's default types don't include .mjs, and browsers won't run a module worker
# served as application/octet-stream.
location ~ ^/assets/.+\.mjs$ {
    default_type text/javascript;
    expires 1y;
    try_files $uri =404;
}

location /assets/ {
    expires 1y;
    try_files $uri =404;
}

# The web app routes /, /login, /app and /styleguide itself.
location / {
    try_files $uri /index.html;
}
