# Quick Demo

The fastest way to see Kairos running. You only need **Docker** — no Node.js or database setup required.

## Run it

```bash
# 1. Get the demo compose file
curl -O https://raw.githubusercontent.com/kharis-github/kairos/main/docker-compose.demo.yml

# 2. Start everything
docker compose -f docker-compose.demo.yml up --build
```

Then open **http://localhost:3002** in your browser.

## Demo credentials

| Field    | Value                  |
|----------|------------------------|
| Email    | `admin@kairos.church`  |
| Password | `Password1!`           |

The first run takes a few minutes to build the images. After that, subsequent runs are instant. The database seeds automatically with realistic branches, members, fellowships, and outreach data.

## Stop / reset

```bash
# Stop
docker compose -f docker-compose.demo.yml down

# Wipe all data and start fresh
docker compose -f docker-compose.demo.yml down -v && docker compose -f docker-compose.demo.yml up
```

## Next step

Ready to develop locally? See [Local Setup](/guide/local-setup).
