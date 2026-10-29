"use strict";

// Servidor para uso local: entrega la carpeta public/ y atiende la API.
// En Vercel no se usa; allí la API corre en api/index.js.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { manejarAPI, responderJSON } = require("./servidor/aplicacion");
const db = require("./servidor/base-datos");

const PUERTO = Number(process.env.PORT) || 3000;
const CARPETA_PUBLICA = path.join(__dirname, "public");
const CARPETA_RESPALDOS = path.join(__dirname, "respaldos");
const CADA_MEDIA_HORA = 30 * 60 * 1000;
const RESPALDOS_MAXIMOS = 30;

const TIPOS_DE_ARCHIVO = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

// ---------------------------------------------------------------------------
// Archivos de la carpeta public/
// ---------------------------------------------------------------------------

function servirArchivo(res, ruta) {
  const archivo = path.join(CARPETA_PUBLICA, ruta === "/" ? "index.html" : ruta);
  const tipo = TIPOS_DE_ARCHIVO[path.extname(archivo)];

  // Solo se entregan tipos conocidos que estén dentro de public/.
  if (!tipo || !archivo.startsWith(CARPETA_PUBLICA + path.sep)) {
    return responderJSON(res, 404, { mensaje: "Recurso no encontrado." });
  }

  fs.readFile(archivo, (error, contenido) => {
    if (error) return responderJSON(res, 404, { mensaje: "Recurso no encontrado." });
    res.writeHead(200, { "Content-Type": tipo, "Cache-Control": "no-store" });
    res.end(contenido);
  });
}

// ---------------------------------------------------------------------------
// Respaldos de la base: una copia cada media hora en respaldos/
// ---------------------------------------------------------------------------

async function respaldarBase() {
  if (!db.usaArchivoLocal()) return; // Con Turso los respaldos los gestiona Turso.

  fs.mkdirSync(CARPETA_RESPALDOS, { recursive: true });
  const fecha = new Date().toISOString().replace(/[:.]/g, "-");
  await db.crearRespaldo(path.join(CARPETA_RESPALDOS, `oxigeno-${fecha}.db`));

  // Se conservan solo los más recientes.
  const respaldos = fs
    .readdirSync(CARPETA_RESPALDOS)
    .filter((nombre) => nombre.startsWith("oxigeno-") && nombre.endsWith(".db"))
    .sort();
  for (const nombre of respaldos.slice(0, -RESPALDOS_MAXIMOS)) {
    fs.unlinkSync(path.join(CARPETA_RESPALDOS, nombre));
  }
}

function respaldarSinDetener() {
  respaldarBase().catch((error) => console.error("No se pudo crear el respaldo:", error.message));
}

// ---------------------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------------------

const servidor = http.createServer((req, res) => {
  let pathname;
  try {
    // Una ruta como "//" se interpreta como URL sin servidor y lanza error.
    ({ pathname } = new URL(req.url, "http://localhost"));
  } catch {
    return responderJSON(res, 400, { mensaje: "Dirección inválida." });
  }

  if (pathname.startsWith("/api/")) return manejarAPI(req, res);
  if (req.method === "GET") return servirArchivo(res, pathname);
  responderJSON(res, 405, { mensaje: "Método no permitido." });
});

async function iniciar() {
  await db.obtenerBase();

  servidor.listen(PUERTO, "localhost", () => {
    console.log(`Control de Oxígeno disponible en http://localhost:${PUERTO}`);
  });

  respaldarSinDetener();
  setInterval(respaldarSinDetener, CADA_MEDIA_HORA).unref();
}

iniciar().catch((error) => {
  console.error("No se pudo iniciar el servidor:", error);
  process.exit(1);
});
