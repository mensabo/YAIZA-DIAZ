#!/bin/bash
# Cron pull para Raiola: descarga el ultimo dist.zip publicado por el
# workflow "Publicar en un Release" (.github/workflows/deploy-raiola-pull.yml)
# y lo pone en produccion.
#
# NOTA: este archivo se escribe deliberadamente en ASCII puro (sin tildes
# ni enes), aunque el resto del repo esta en espanol normal con acentos.
# Motivo (aprendido en mensabo/RenacerCanarias, mismo mecanismo, ya en
# produccion alli): el archivo viaja por una cadena fragil (GitHub ->
# navegador -> editor de cPanel -> servidor de Raiola) que ha demostrado
# corromper caracteres UTF-8 multibyte (tildes, "?") de formas dificiles
# de diagnosticar -- eliminarlos del todo evita esa clase entera de
# problemas, pase lo que pase por el camino.
#
# Pensado para ejecutarse como Tarea Cron dentro de cPanel (Raiola), NO desde
# GitHub Actions -- asi la conexion hacia GitHub la abre siempre el propio
# servidor de Raiola (saliente, no bloqueada), por si el firewall de Raiola
# bloquea tambien el SFTP (puerto 22) de deploy-raiola.yml, igual que ya
# bloqueo el FTP/cPanel del hosting de RenacerCanarias en la misma cuenta.
#
# --- CONFIGURACION (una sola vez, solo si hace falta activar este plan B) ---
# 1. Subir este archivo (por FileManager o el propio editor de cPanel) FUERA
#    de la carpeta publica del sitio, ej.:
#      /home/jzpvizms/scripts-yaizadiaz/raiola-cron-pull.sh
#    Darle permiso de ejecucion: chmod +x raiola-cron-pull.sh (o desde el
#    gestor de archivos: Permisos -> 744).
#
# 2. En la misma carpeta, crear un archivo raiola-deploy.env (NUNCA dentro
#    de la carpeta publica del sitio) con este contenido, cada valor entre
#    comillas:
#
#      GITHUB_TOKEN="pega_aqui_el_token"
#      GITHUB_REPO="mensabo/YAIZA-DIAZ"
#      SITE_DIR="/home/jzpvizms/RUTA_REAL_DEL_SITIO_DE_YAIZA_DIAZ"
#
#    SITE_DIR: confirmar la ruta real en el Gestor de archivos de cPanel
#    (en RenacerCanarias fue /home/jzpvizms/renacercanarias.com -- lo mas
#    probable es que aqui sea /home/jzpvizms/yaizadiaz.com, pero hay que
#    comprobarlo, no darlo por hecho).
#
#    El GITHUB_TOKEN es un Personal Access Token fine-grained
#    (github.com/settings/personal-access-tokens/new), acotado SOLO al
#    repositorio mensabo/YAIZA-DIAZ, con permiso "Contents: Read-only" --
#    con eso basta para descargar el asset de un Release en un repo
#    privado, no hace falta nada mas. Despues, en el gestor de archivos de
#    cPanel, poner permisos 600 a ese archivo (solo el propio usuario puede
#    leerlo).
#
# 3. cPanel -> Avanzado -> Tareas Cron -> Anadir tarea cron:
#      Minuto: */5   Hora: *   Dia: *   Mes: *   Dia de la semana: *
#      Comando (normaliza el propio script antes de cada ejecucion, por si
#      el editor de cPanel vuelve a guardarlo con saltos de linea raros):
#        tr -d '\r' < /home/jzpvizms/scripts-yaizadiaz/raiola-cron-pull.sh > /home/jzpvizms/scripts-yaizadiaz/raiola-cron-pull.sh.tmp && mv -f /home/jzpvizms/scripts-yaizadiaz/raiola-cron-pull.sh.tmp /home/jzpvizms/scripts-yaizadiaz/raiola-cron-pull.sh && bash /home/jzpvizms/scripts-yaizadiaz/raiola-cron-pull.sh >> /home/jzpvizms/scripts-yaizadiaz/raiola-cron-pull.log 2>&1
#
# 4. Antes de que el Cron tenga algo que descargar, disparar una vez a mano
#    el workflow "Publicar en un Release" (Actions -> workflow_dispatch).
#
# --- FUNCIONAMIENTO ---
# - Consulta la API de GitHub por el Release de tag "raiola-dist" y localiza
#   el id de su asset dist.zip.
# - Si ese id coincide con el guardado en la ejecucion anterior, termina sin
#   hacer nada (no hay build nueva).
# - Si ha cambiado: descarga el .zip, lo descomprime en una carpeta nueva
#   aparte y SOLO si esa descompresion salio bien y contiene un index.html
#   real, hace el cambio (2 "mv", ventana de corte minima). Conserva la
#   carpeta anterior como SITE_DIR.backup por si hace falta revertir a mano.
#
# --- REVERTIR A MANO SI ALGO SALE MAL ---
#   rm -rf SITE_DIR
#   mv SITE_DIR.backup SITE_DIR

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/raiola-deploy.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Falta $ENV_FILE -- sigue los pasos de configuracion de la cabecera de este script." >&2
    exit 1
fi

# No se hace "source" directamente sobre el archivo tal cual: si se ha
# editado alguna vez desde un editor de texto de un panel web (cPanel,
# etc.), es facil que cuele saltos de linea estilo Windows (\r\n) o
# incluso estilo Mac clasico (solo \r) -- bash no los trata como fin de
# linea real y puede mezclar el contenido de varias variables entre si.
# Se normaliza primero a saltos de linea Unix antes de leerlo.
ENV_TMP="$(mktemp)"
trap 'rm -f "$ENV_TMP"' EXIT
tr '\r' '\n' < "$ENV_FILE" > "$ENV_TMP"
# shellcheck disable=SC1090
source "$ENV_TMP"

trim() { local s="$1"; s="${s#"${s%%[![:space:]]*}"}"; s="${s%"${s##*[![:space:]]}"}"; printf '%s' "$s"; }
GITHUB_TOKEN="$(trim "${GITHUB_TOKEN:-}")"
GITHUB_REPO="$(trim "${GITHUB_REPO:-}")"
SITE_DIR="$(trim "${SITE_DIR:-}")"
RELEASE_TAG="$(trim "${RELEASE_TAG:-}")"

: "${GITHUB_TOKEN:?Falta GITHUB_TOKEN en raiola-deploy.env}"
: "${GITHUB_REPO:?Falta GITHUB_REPO en raiola-deploy.env (ej. mensabo/YAIZA-DIAZ)}"
: "${SITE_DIR:?Falta SITE_DIR en raiola-deploy.env (ruta real del sitio en el servidor)}"
RELEASE_TAG="${RELEASE_TAG:-raiola-dist}"

# Si SITE_DIR no existe ya como directorio, algo va mal -- normalmente
# deberia ser la carpeta del sitio YA publicado. Lo mas probable es un
# caracter invisible colado en el .env (ej. un espacio Unicode en vez de
# ASCII) que hace que "mv" cree una carpeta nueva con un nombre casi
# identico en vez de sustituir la real, sin dar ningun error. Se vuelca en
# hex+texto para verlo de un vistazo en el log.
if [ ! -d "$SITE_DIR" ]; then
    echo "$(date -Iseconds) AVISO: SITE_DIR ('$SITE_DIR') no existe como directorio -- no se va a poder hacer backup de lo que ya hay publicado, y el 'mv' final puede acabar creando una carpeta nueva con un nombre parecido en vez de sustituir el sitio real." >&2
    echo "Volcado en hex+texto de SITE_DIR (cada caracter raro se ve como '.' en texto, con su byte real a la izquierda):" >&2
    printf '%s' "$SITE_DIR" | od -An -tx1c >&2
fi

MARKER_FILE="$SCRIPT_DIR/.last-asset-id"
WORK_DIR="$SCRIPT_DIR/work"
mkdir -p "$WORK_DIR"

AUTH_HEADER="Authorization: token $GITHUB_TOKEN"
URL_TAGS="https://api.github.com/repos/$GITHUB_REPO/releases/tags/$RELEASE_TAG"

if ! release_json="$(curl -fsSL -H "$AUTH_HEADER" -H "Accept: application/vnd.github+json" "$URL_TAGS")"; then
    echo "$(date -Iseconds) Fallo al consultar la API de GitHub con esta URL (curl -fsSL \"\$URL_TAGS\")." >&2
    echo "Volcado en hex+texto para detectar caracteres invisibles (cada caracter raro se ve como '.' en la columna de texto, con su byte real a la izquierda):" >&2
    printf '%s' "$URL_TAGS" | od -An -tx1c >&2
    echo "Longitud real de GITHUB_REPO: ${#GITHUB_REPO} caracteres -- 'mensabo/YAIZA-DIAZ' sin nada mas deberia medir 18." >&2
    exit 1
fi

# La API de GitHub devuelve el JSON "bonito" (con sangria, cada campo en su
# propia linea), no compacto en una sola linea. Se usa "grep -Pzo" (modo
# null-data: trata TODA la entrada como un unico bloque, asi \s si cruza
# saltos de linea de verdad) con un lookahead que localiza el "id" del
# asset "dist.zip" sin confundirlo con el id del release o el de su
# "uploader" (que aparece DESPUES de "name" en el JSON de GitHub, asi que
# este patron no lo captura por error). Se anade "|| true" porque, con
# set -e y pipefail activos, un grep sin coincidencia (exit 1) mataria el
# script entero aqui mismo sin dejar rastro en el log -- mejor dejar que
# asset_id quede vacio y que lo capture el "if" de abajo.
asset_id="$(printf '%s' "$release_json" | grep -Pzo \
    '"id":\s*\K[0-9]+(?=,\s*"node_id":\s*"[^"]*",\s*"name":\s*"dist\.zip")' \
    | tr -d '\0' || true)"

if [ -z "$asset_id" ]; then
    echo "$(date -Iseconds) No se encontro el asset dist.zip en el release '$RELEASE_TAG' -- ha corrido ya el workflow al menos una vez?" >&2
    exit 1
fi

last_id="$(cat "$MARKER_FILE" 2>/dev/null || echo "")"
if [ "$asset_id" = "$last_id" ]; then
    exit 0  # Sin cambios desde la ultima ejecucion -- nada que hacer.
fi

echo "$(date -Iseconds) Nueva build detectada (asset $asset_id, antes '${last_id:-ninguna}'). Descargando..."

zip_path="$WORK_DIR/dist.zip"
curl -fsSL -H "$AUTH_HEADER" -H "Accept: application/octet-stream" \
    "https://api.github.com/repos/$GITHUB_REPO/releases/assets/$asset_id" \
    -o "$zip_path"

new_dir="$WORK_DIR/dist-new"
rm -rf "$new_dir"
mkdir -p "$new_dir"
unzip -qo "$zip_path" -d "$new_dir"

if [ ! -f "$new_dir/index.html" ]; then
    echo "$(date -Iseconds) El zip descargado no tiene index.html -- abortando, no se toca el sitio en produccion." >&2
    exit 1
fi

backup_dir="${SITE_DIR}.backup"
rm -rf "$backup_dir"
if [ -d "$SITE_DIR" ]; then
    mv "$SITE_DIR" "$backup_dir"
fi
mv "$new_dir" "$SITE_DIR"

echo "$asset_id" > "$MARKER_FILE"
rm -f "$zip_path"
echo "$(date -Iseconds) Desplegado correctamente (asset $asset_id)."
