## KuubStream
A simple stream player that comes with a chat  
Uses node.js and websockets for the chat and page rendering, served with [nginx](http://nginx.org/) and the [nginx-rtmp-module](https://github.com/sergey-dryabzhinsky/nginx-rtmp-module)

## Example nginx config

```Nginx
upstream nodejs {
    server unix:/tmp/nodejs.socket;
}

server {
    listen 80;
    listen [::]:80;

    server_name your.hostname.com;

    root /var/www/your/public_html;

    location / {
        try_files $uri @nodejs;
    }

    location /ws {
        proxy_pass http://nodejs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location @nodejs {
        proxy_pass http://nodejs;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

rtmp {
    server {
        listen 1935;
        chunk_size 4096;

        application stream {
            live on;
            record off;

            allow play all;
            allow publish all;
        }
    }
}
```

## License
The project itself is licensed under the MIT License, included files (jQuery, normalize.css, jwplayer, etc) come with their own licensing header
