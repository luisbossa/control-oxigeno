"use strict";

// Contraseñas (PBKDF2) y sesiones en cookie firmada (HMAC). La cookie no
// depende de memoria del servidor, por lo que funciona en Vercel.

const crypto = require("crypto");
const { promisify } = require("util");
const db = require("./base-datos");

const pbkdf2 = promisify(crypto.pbkdf2);
const NOMBRE_COOKIE = "ccss_sesion";
// Horas que dura la sesión sin actividad (se renueva mientras el sistema está abierto).
// Se puede cambiar con la variable SESION_HORAS.
const HORAS_SESION = Number(process.env.SESION_HORAS) > 0 ? Number(process.env.SESION_HORAS) : 12;
const DURACION_SESION = HORAS_SESION * 60 * 60 * 1000;
const MAXIMO_INTENTOS = 5;
const BLOQUEO_INTENTOS = 10 * 60 * 1000;
const intentosFallidos = new Map();

async function derivarClave(clave, sal) {
  return (await pbkdf2(clave, sal, 210000, 32, "sha512")).toString("hex");
}

function compararSeguro(a, b) {
  const primero = Buffer.from(String(a), "hex");
  const segundo = Buffer.from(String(b), "hex");
  return primero.length === segundo.length && crypto.timingSafeEqual(primero, segundo);
}

async function protegerClave(clave) {
  const sal = crypto.randomBytes(24).toString("hex");
  return { sal, hash: await derivarClave(clave, sal) };
}

async function verificarClave(clave, usuario) {
  return compararSeguro(await derivarClave(String(clave || ""), usuario.sal), usuario.hash);
}

function validarClave(clave) {
  return typeof clave === "string" && clave.length >= 8 && clave.length <= 128;
}

function normalizarCuenta(valor) {
  return String(valor || "").trim().toLowerCase().replace(/\s+/g, "");
}

function usuarioPublico(usuario) {
  if (!usuario) return null;
  const { hash, sal, ...publico } = usuario;
  return publico;
}

// ---------------------------------------------------------------------------
// Bloqueo temporal tras varios intentos fallidos (por cuenta).
// ---------------------------------------------------------------------------

function cuentaBloqueada(cuenta) {
  const registro = intentosFallidos.get(cuenta);
  if (!registro) return false;
  if (Date.now() - registro.desde > BLOQUEO_INTENTOS) {
    intentosFallidos.delete(cuenta);
    return false;
  }
  return registro.total >= MAXIMO_INTENTOS;
}

function registrarIntento(cuenta, exitoso) {
  if (exitoso) return intentosFallidos.delete(cuenta);
  const registro = intentosFallidos.get(cuenta) || { total: 0, desde: Date.now() };
  registro.total += 1;
  intentosFallidos.set(cuenta, registro);
}

// ---------------------------------------------------------------------------
// Cookie de sesión: base64url(JSON {u, e}) + "." + firma HMAC-SHA256.
// ---------------------------------------------------------------------------

async function secreto() {
  return db.obtenerSecretoSesion(() => crypto.randomBytes(48).toString("hex"));
}

function firmar(contenido, clave) {
  return crypto.createHmac("sha256", clave).update(contenido).digest("base64url");
}

function leerCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((parte) => parte.trim())
      .filter((parte) => parte.includes("="))
      .map((parte) => {
        const indice = parte.indexOf("=");
        return [parte.slice(0, indice), decodeURIComponent(parte.slice(indice + 1))];
      }),
  );
}

function esConexionSegura(req) {
  return Boolean(process.env.VERCEL) || req.headers["x-forwarded-proto"] === "https";
}

function escribirCookie(req, res, valor, maxAgeSegundos) {
  const atributos = [`${NOMBRE_COOKIE}=${valor}`, "HttpOnly", "SameSite=Strict", "Path=/", `Max-Age=${maxAgeSegundos}`];
  if (esConexionSegura(req)) atributos.push("Secure");
  res.setHeader("Set-Cookie", atributos.join("; "));
}

async function crearSesion(req, res, usuario) {
  const contenido = Buffer.from(JSON.stringify({ u: usuario.id, e: Date.now() + DURACION_SESION })).toString("base64url");
  escribirCookie(req, res, `${contenido}.${firmar(contenido, await secreto())}`, DURACION_SESION / 1000);
}

function cerrarSesion(req, res) {
  escribirCookie(req, res, "", 0);
}

// Devuelve el usuario activo de la sesión o null. Renueva la cookie al usarla.
async function sesionActual(req, res) {
  const valor = leerCookies(req)[NOMBRE_COOKIE];
  if (!valor || !valor.includes(".")) return null;
  const [contenido, firma] = valor.split(".");
  const esperada = firmar(contenido, await secreto());
  if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;

  let datos;
  try {
    datos = JSON.parse(Buffer.from(contenido, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!datos.u || !(datos.e > Date.now())) return null;

  const usuario = await db.buscarUsuarioPorId(datos.u);
  if (!usuario || !usuario.activo) return null;
  if (res && datos.e - Date.now() < DURACION_SESION / 2) await crearSesion(req, res, usuario);
  return usuario;
}

module.exports = {
  protegerClave,
  verificarClave,
  validarClave,
  normalizarCuenta,
  usuarioPublico,
  cuentaBloqueada,
  registrarIntento,
  crearSesion,
  cerrarSesion,
  sesionActual,
};
