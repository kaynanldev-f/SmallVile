#!/bin/bash
set -e

URL=$1
MAX_RETRIES=10
RETRY_DELAY=3

for i in $(seq 1 $MAX_RETRIES); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo "Healthcheck OK ($STATUS) na tentativa $i"
    exit 0
  fi
  echo "Tentativa $i/$MAX_RETRIES falhou (status $STATUS), aguardando ${RETRY_DELAY}s..."
  sleep $RETRY_DELAY
done

echo "Healthcheck falhou após $MAX_RETRIES tentativas"
exit 1
