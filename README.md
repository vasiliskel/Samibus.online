# samibus.online

Static landing page ("coming soon") for **Antisamos Express** — the daily beach
shuttle service in Kefalonia, operated by Alter Tours / Alter Exploring Team.

## Layout

```
samibus.online/
├── docker-compose.yml      # standalone compose project: samibus-online
├── Dockerfile              # nginx:alpine + site/ copied in
├── nginx.conf              # SPA-style fallback, asset caching
├── site/
│   ├── index.html          # the coming-soon page
│   └── assets/
│       ├── hero.jpg        # full-bleed bus background
│       ├── flyer-full.jpg  # flyer preview (front + back)
│       ├── flyer-back.jpg  # back of the flyer (route + contact)
│       └── qr-samibus.svg  # QR pointing to https://samibus.online
└── images/                 # original source artwork (uncropped)
```

## Build & run

The site joins the existing `alterexploring_internal` docker network created by
the `alterexploring_webapp` stack and is exposed via the shared edge nginx
under `samibus.online` / `www.samibus.online`.

1. Bring up the main stack first (creates the network):

   ```bash
   cd /root/projects/alterexploring_webapp
   docker compose up -d
   ```

2. Build & start this site:

   ```bash
   cd /root/projects/samibus.online
   docker compose up -d --build
   ```

3. The edge nginx config in `alterexploring_webapp/edge/nginx.conf` already
   proxies `samibus.online` to `samibus-online-frontend:80`.

## QR code

`site/assets/qr-samibus.svg` is generated with `qrencode`:

```bash
qrencode -t SVG -o site/assets/qr-samibus.svg -m 2 -s 10 "https://samibus.online"
```

Re-run if the URL changes.

## Roadmap

- [ ] Replace "coming soon" with the full timetable
- [ ] Add per-route departure tables (weekday / weekend / Sunday-night party)
- [ ] Booking / contact form
- [ ] Multi-language (EN / GR)
