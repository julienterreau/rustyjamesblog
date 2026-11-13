#!/bin/sh
set -eu

if [ -z "${GEOIP_DB_PATH:-}" ]; then
  GEOIP_DB_PATH=/app/data/GeoLite2-City.mmdb
  export GEOIP_DB_PATH
fi

if [ -n "${MAXMIND_LICENSE_KEY:-}" ] && [ ! -f "$GEOIP_DB_PATH" ]; then
  echo "Téléchargement de GeoLite2…"
  node /app/scripts/update-geolite.mjs || echo "GeoLite2 indisponible : les villes resteront vides."
fi

exec node server.js
