"use strict";

// Rutas de la API. Se usa igual en el servidor local (server.js) y en la
// función de Vercel (api/index.js).

const crypto = require("crypto");
const db = require("./base-datos");
const auth = require("./autenticacion");

const LIMITE_CUERPO = 25 * 1024 * 1024;

function responderJSON(res, estado, contenido) {
  const cuerpo = JSON.stringify(contenido);
  res.statusCode = estado;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(cuerpo));
  res.setHeader("Cache-Control", "no-store");
  res.end(cuerpo);
}

function errorHttp(estado, mensaje) {
  return Object.assign(new Error(mensaje), { estado });
}

function leerCuerpo(req) {
  // Vercel ya entrega el cuerpo procesado en req.body.
  if (req.body !== undefined) {
    if (typeof req.body === "string") {
      try {
        return Promise.resolve(req.body ? JSON.parse(req.body) : {});
      } catch {
        return Promise.reject(errorHttp(400, "El contenido enviado no es JSON válido."));
      }
    }
    return Promise.resolve(req.body || {});
  }
  return new Promise((resolve, reject) => {
    let texto = "";
    req.on("data", (bloque) => {
      texto += bloque;
      if (Buffer.byteLength(texto) > LIMITE_CUERPO) {
        reject(errorHttp(413, "Solicitud demasiado grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(texto ? JSON.parse(texto) : {});
      } catch {
        reject(errorHttp(400, "El contenido enviado no es JSON válido."));
      }
    });
    req.on("error", reject);
  });
}

// Documentos adjuntos: PDF o imagen de hasta 3 MB (Vercel limita el cuerpo de
// la solicitud a 4,5 MB y el archivo llega en base64). El tipo se comprueba por
// los primeros bytes del archivo, no por lo que declara el navegador.
const TAMANO_MAXIMO_DOCUMENTO = 3 * 1024 * 1024;
const FIRMAS_DOCUMENTO = {
  "application/pdf": (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
};

async function exigirSesion(req, res, soloAdministrador = false) {
  const usuario = await auth.sesionActual(req, res);
  if (!usuario) throw errorHttp(401, "La sesión venció. Ingrese nuevamente.");
  if (soloAdministrador && usuario.rol !== "administrador") throw errorHttp(403, "Esta operación requiere una cuenta administradora.");
  return usuario;
}

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

const rutas = {
  "GET /api/estado": async (req, res) => {
    const [total, usuario] = await Promise.all([db.contarUsuarios(), auth.sesionActual(req, res)]);
    return { configurado: total > 0, usuario: auth.usuarioPublico(usuario) };
  },

  "POST /api/configurar": async (req, res) => {
    if ((await db.contarUsuarios()) > 0) throw errorHttp(409, "El sistema ya tiene una cuenta administradora.");
    const cuerpo = await leerCuerpo(req);
    const nombre = String(cuerpo.nombre || "").trim();
    const cuenta = auth.normalizarCuenta(cuerpo.cuenta);
    if (!nombre || !cuenta || !auth.validarClave(cuerpo.clave))
      throw errorHttp(400, "Complete los datos. La contraseña requiere al menos 8 caracteres.");
    const usuario = {
      id: crypto.randomUUID(),
      nombre,
      cuenta,
      rol: "administrador",
      activo: true,
      ...(await auth.protegerClave(cuerpo.clave)),
      creado: new Date().toISOString(),
      ultimoIngreso: new Date().toISOString(),
    };
    await db.crearUsuario(usuario);
    await auth.crearSesion(req, res, usuario);
    return { usuario: auth.usuarioPublico(usuario) };
  },

  "POST /api/login": async (req, res) => {
    const cuerpo = await leerCuerpo(req);
    const cuenta = auth.normalizarCuenta(cuerpo.cuenta);
    if (auth.cuentaBloqueada(cuenta)) throw errorHttp(429, "Demasiados intentos fallidos. Espere 10 minutos e intente de nuevo.");
    const usuario = await db.buscarUsuarioPorCuenta(cuenta);
    const valido = Boolean(usuario && usuario.activo && (await auth.verificarClave(cuerpo.clave, usuario)));
    auth.registrarIntento(cuenta, valido);
    if (!valido) throw errorHttp(401, "Usuario o contraseña incorrectos.");
    usuario.ultimoIngreso = new Date().toISOString();
    await db.actualizarUsuario(usuario.id, { ultimoIngreso: usuario.ultimoIngreso });
    await auth.crearSesion(req, res, usuario);
    return { usuario: auth.usuarioPublico(usuario) };
  },

  "POST /api/logout": async (req, res) => {
    auth.cerrarSesion(req, res);
    return { ok: true };
  },

  "POST /api/cuenta/clave": async (req, res) => {
    const usuario = await exigirSesion(req, res);
    const cuerpo = await leerCuerpo(req);
    if (!(await auth.verificarClave(cuerpo.actual, usuario))) throw errorHttp(400, "La contraseña actual no es correcta.");
    if (!auth.validarClave(cuerpo.nueva)) throw errorHttp(400, "La nueva contraseña requiere al menos 8 caracteres.");
    await db.actualizarUsuario(usuario.id, await auth.protegerClave(cuerpo.nueva));
    return { ok: true };
  },

  "GET /api/datos": async (req, res, url) => {
    const usuario = await exigirSesion(req, res);
    const versionCliente = url.searchParams.get("version");
    if (versionCliente !== null) {
      const version = await db.obtenerVersion();
      if (String(version) === versionCliente) return { sinCambios: true, version };
    }
    return db.leerSistema(usuario.id);
  },

  "POST /api/sincronizar": async (req, res) => {
    const usuario = await exigirSesion(req, res);
    const cuerpo = await leerCuerpo(req);
    if (!cuerpo || typeof cuerpo.cambios !== "object" || Array.isArray(cuerpo.cambios))
      throw errorHttp(400, "Estructura de cambios inválida.");
    return { ok: true, ...(await db.aplicarCambios(cuerpo.cambios, usuario)) };
  },

  "GET /api/usuarios": async (req, res) => {
    await exigirSesion(req, res, true);
    return { usuarios: (await db.listarUsuarios()).map(auth.usuarioPublico) };
  },

  "POST /api/usuarios": async (req, res) => {
    await exigirSesion(req, res, true);
    const cuerpo = await leerCuerpo(req);
    const nombre = String(cuerpo.nombre || "").trim();
    const cuenta = auth.normalizarCuenta(cuerpo.cuenta);
    const rol = cuerpo.rol === "administrador" ? "administrador" : "funcionario";
    if (!nombre || !cuenta || !auth.validarClave(cuerpo.clave))
      throw errorHttp(400, "Complete los datos. La contraseña requiere al menos 8 caracteres.");
    if (await db.buscarUsuarioPorCuenta(cuenta)) throw errorHttp(409, "Ese nombre de usuario ya existe.");
    const nuevo = {
      id: crypto.randomUUID(),
      nombre,
      cuenta,
      rol,
      activo: true,
      ...(await auth.protegerClave(cuerpo.clave)),
      creado: new Date().toISOString(),
    };
    await db.crearUsuario(nuevo);
    return { usuario: auth.usuarioPublico(nuevo) };
  },

  "POST /api/documentos": async (req, res) => {
    const usuario = await exigirSesion(req, res, true);
    const cuerpo = await leerCuerpo(req);
    const tipo = String(cuerpo.tipo || "");
    const firma = FIRMAS_DOCUMENTO[tipo];
    if (!firma) throw errorHttp(400, "Solo se permiten archivos PDF o imágenes (JPG, PNG o WebP).");
    const contenido = Buffer.from(String(cuerpo.contenido || ""), "base64");
    if (!contenido.length) throw errorHttp(400, "El archivo está vacío.");
    if (contenido.length > TAMANO_MAXIMO_DOCUMENTO) throw errorHttp(413, "El archivo supera el máximo de 3 MB.");
    if (!firma(contenido)) throw errorHttp(400, "El contenido del archivo no corresponde a un PDF o imagen válida.");
    const documento = {
      id: crypto.randomUUID(),
      pacienteId: cuerpo.pacienteId ?? null,
      nombre: String(cuerpo.nombre || "documento").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 120),
      tipo,
      tamano: contenido.length,
      contenido,
      creado: new Date().toISOString(),
      creadoPor: usuario.id,
    };
    await db.guardarDocumento(documento);
    return { documento: { id: documento.id, nombre: documento.nombre, tipo, tamano: documento.tamano, creado: documento.creado } };
  },
};

// Rutas con parámetro: /api/documentos/:id
async function rutaDocumento(req, res, id) {
  if (req.method === "GET") {
    await exigirSesion(req, res);
    const documento = await db.leerDocumento(id);
    if (!documento) throw errorHttp(404, "Documento no encontrado.");
    res.statusCode = 200;
    res.setHeader("Content-Type", documento.tipo);
    res.setHeader("Content-Length", documento.contenido.length);
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(documento.nombre)}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.end(documento.contenido);
    return undefined;
  }
  if (req.method === "DELETE") {
    await exigirSesion(req, res, true);
    await db.eliminarDocumento(id);
    return { ok: true };
  }
  throw errorHttp(405, "Método no permitido.");
}

// Rutas con parámetro: /api/usuarios/:id
async function rutaUsuario(req, res, id) {
  const actual = await exigirSesion(req, res, true);
  const usuario = await db.buscarUsuarioPorId(id);
  if (!usuario) throw errorHttp(404, "Usuario no encontrado.");
  const administradoresActivos = (await db.listarUsuarios()).filter((u) => u.rol === "administrador" && u.activo).length;
  const esUltimoAdministrador = usuario.rol === "administrador" && usuario.activo && administradoresActivos <= 1;

  if (req.method === "PATCH") {
    const cuerpo = await leerCuerpo(req);
    const cambios = {};
    if (Object.prototype.hasOwnProperty.call(cuerpo, "activo")) {
      if (usuario.id === actual.id && !cuerpo.activo) throw errorHttp(400, "No puede desactivar su propia cuenta.");
      if (esUltimoAdministrador && !cuerpo.activo) throw errorHttp(400, "Debe permanecer al menos un administrador activo.");
      cambios.activo = Boolean(cuerpo.activo);
    }
    if (Object.prototype.hasOwnProperty.call(cuerpo, "rol")) {
      const rol = cuerpo.rol === "administrador" ? "administrador" : "funcionario";
      if (esUltimoAdministrador && rol !== "administrador") throw errorHttp(400, "Debe permanecer al menos un administrador activo.");
      cambios.rol = rol;
    }
    if (Object.prototype.hasOwnProperty.call(cuerpo, "clave")) {
      if (!auth.validarClave(cuerpo.clave)) throw errorHttp(400, "La contraseña requiere al menos 8 caracteres.");
      Object.assign(cambios, await auth.protegerClave(cuerpo.clave));
    }
    await db.actualizarUsuario(usuario.id, cambios);
    return { usuario: auth.usuarioPublico({ ...usuario, ...cambios }) };
  }

  if (req.method === "DELETE") {
    if (usuario.id === actual.id) throw errorHttp(400, "No puede eliminar su propia cuenta.");
    if (esUltimoAdministrador) throw errorHttp(400, "Debe permanecer al menos un administrador activo.");
    await db.eliminarUsuario(usuario.id);
    return { ok: true };
  }

  throw errorHttp(405, "Método no permitido.");
}

// Atiende cualquier solicitud /api/*. En Vercel la ruta llega en ?ruta=.
async function manejarAPI(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const ruta = url.searchParams.has("__ruta") ? `/api/${url.searchParams.get("__ruta")}` : url.pathname;
    const manejador = rutas[`${req.method} ${ruta.replace(/\/+$/, "")}`];
    let resultado;
    if (manejador) resultado = await manejador(req, res, url);
    else {
      const usuario = ruta.match(/^\/api\/usuarios\/([^/]+)$/);
      const documento = ruta.match(/^\/api\/documentos\/([^/]+)$/);
      if (usuario) resultado = await rutaUsuario(req, res, decodeURIComponent(usuario[1]));
      else if (documento) resultado = await rutaDocumento(req, res, decodeURIComponent(documento[1]));
      else throw errorHttp(404, "Ruta no encontrada.");
    }
    // Las rutas que entregan un archivo ya respondieron.
    if (!res.writableEnded) responderJSON(res, 200, resultado);
  } catch (error) {
    if (!error.estado) console.error(error);
    if (!res.headersSent)
      responderJSON(res, error.estado || 500, { mensaje: error.estado ? error.message : "Error interno del servidor." });
    else res.end();
  }
}

module.exports = { manejarAPI, responderJSON };
