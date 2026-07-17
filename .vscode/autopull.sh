#!/bin/bash
# Auto pull en bucle: trae cambios de origin/master cada 2 minutos.
# Usa --ff-only para no tocar nada si hay cambios locales en conflicto.
cd "$(dirname "$0")/.." || exit 1

while true; do
  git pull origin master --ff-only
  sleep 120
done
