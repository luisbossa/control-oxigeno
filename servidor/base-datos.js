"use strict";

// Acceso a la base SQLite (libSQL). Localmente usa un archivo; si se definen
// TURSO_DATABASE_URL y TURSO_AUTH_TOKEN, usa una base Turso sin cambiar código.

const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");

const RAIZ = path.join(__dirname, "..");
const EN_VERCEL = Boolean(process.env.VERCEL);
const DIRECTORIO_DATOS = process.env.CCSS_DATA_DIR
  ? path.resolve(process.env.CCSS_DATA_DIR)
  : EN_VERCEL
    ? "/tmp" // Único directorio con escritura en Vercel (temporal).
    : path.join(RAIZ, "datos");
const ARCHIVO_BASE = path.join(DIRECTORIO_DATOS, "oxigeno.db");

const TIPOS_UBICACION = ["ebais", "ambulancias", "emergencias", "manifold"];

const ESQUEMA = [
  `CREATE TABLE IF NOT EXISTS meta (
     clave TEXT PRIMARY KEY,
     valor TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS usuarios (
     id TEXT PRIMARY KEY,
     nombre TEXT NOT NULL,
     cuenta TEXT NOT NULL UNIQUE,
     rol TEXT NOT NULL CHECK (rol IN ('administrador', 'funcionario')),
     activo INTEGER NOT NULL DEFAULT 1,
     sal TEXT NOT NULL,
     hash TEXT NOT NULL,
     creado TEXT NOT NULL,
     ultimo_ingreso TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS pacientes (
     id TEXT PRIMARY KEY,
     cedula TEXT,
     nombre TEXT,
     datos TEXT NOT NULL,
     actualizado_en TEXT NOT NULL,
     actualizado_por TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS cilindros (
     numero TEXT PRIMARY KEY,
     estado TEXT,
     tipo TEXT,
     paciente_id TEXT,
     datos TEXT NOT NULL,
     actualizado_en TEXT NOT NULL,
     actualizado_por TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS ubicaciones (
     tipo TEXT NOT NULL,
     id TEXT NOT NULL,
     nombre TEXT,
     orden INTEGER NOT NULL DEFAULT 0,
     datos TEXT NOT NULL,
     actualizado_en TEXT NOT NULL,
     actualizado_por TEXT,
     PRIMARY KEY (tipo, id)
   )`,
  `CREATE TABLE IF NOT EXISTS devoluciones_proveedor (
     id TEXT PRIMARY KEY,
     fecha TEXT,
     datos TEXT NOT NULL,
     actualizado_en TEXT NOT NULL,
     actualizado_por TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS notificaciones_leidas (
     usuario_id TEXT NOT NULL,
     aviso_id TEXT NOT NULL,
     PRIMARY KEY (usuario_id, aviso_id)
   )`,
  `CREATE TABLE IF NOT EXISTS bitacora (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     fecha TEXT NOT NULL,
     usuario_id TEXT,
     usuario_nombre TEXT,
     entidad TEXT NOT NULL,
     entidad_id TEXT NOT NULL,
     accion TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_cilindros_estado ON cilindros (estado)`,
  `CREATE INDEX IF NOT EXISTS idx_cilindros_paciente ON cilindros (paciente_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pacientes_cedula ON pacientes (cedula)`,
  `CREATE INDEX IF NOT EXISTS idx_bitacora_entidad ON bitacora (entidad, entidad_id)`,
];

let cliente = null;
let preparacion = null;

function crearCliente() {
  if (process.env.TURSO_DATABASE_URL)
    return createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  fs.mkdirSync(DIRECTORIO_DATOS, { recursive: true });
  return createClient({ url: "file:" + ARCHIVO_BASE.replace(/\\/g, "/") });
}

// Devuelve el cliente listo para usar, con el esquema creado.
async function obtenerBase() {
  if (!preparacion) {
    preparacion = (async () => {
      cliente = crearCliente();
      if (!process.env.TURSO_DATABASE_URL) await cliente.execute("PRAGMA journal_mode = WAL");
      await cliente.batch(ESQUEMA, "write");
      return cliente;
    })().catch((error) => {
      preparacion = null;
      throw error;
    });
  }
  return preparacion;
}

function usaArchivoLocal() {
  return !process.env.TURSO_DATABASE_URL;
}

const ahora = () => new Date().toISOString();
const texto = (valor) => (valor === undefined || valor === null ? null : String(valor));

// ---------------------------------------------------------------------------
// Versión de los datos: aumenta con cada sincronización para que los demás
// equipos sepan cuándo deben recargar.
// ---------------------------------------------------------------------------

async function leerMeta(base, clave) {
  const { rows } = await base.execute({ sql: "SELECT valor FROM meta WHERE clave = ?", args: [clave] });
  return rows[0] ? rows[0].valor : null;
}

async function versionActual(base) {
  return Number((await leerMeta(base, "version_datos")) || 0);
}

async function obtenerVersion() {
  return versionActual(await obtenerBase());
}

// Copia de seguridad del archivo local (VACUUM INTO crea una copia consistente).
async function crearRespaldo(destino) {
  const base = await obtenerBase();
  await base.execute({ sql: "VACUUM INTO ?", args: [destino] });
}

// ---------------------------------------------------------------------------
// Lectura completa del sistema (en el formato que espera el navegador).
// ---------------------------------------------------------------------------

async function leerSistema(usuarioId) {
  const base = await obtenerBase();
  const [pacientes, cilindros, ubicaciones, devoluciones, leidas, version] = await Promise.all([
    base.execute("SELECT datos FROM pacientes ORDER BY rowid"),
    base.execute("SELECT datos FROM cilindros ORDER BY rowid"),
    base.execute("SELECT tipo, datos FROM ubicaciones ORDER BY tipo, orden"),
    base.execute("SELECT datos FROM devoluciones_proveedor ORDER BY rowid"),
    base.execute({ sql: "SELECT aviso_id FROM notificaciones_leidas WHERE usuario_id = ?", args: [usuarioId] }),
    versionActual(base),
  ]);

  const ubicacionesInstitucionales = Object.fromEntries(TIPOS_UBICACION.map((tipo) => [tipo, []]));
  for (const fila of ubicaciones.rows)
    if (ubicacionesInstitucionales[fila.tipo]) ubicacionesInstitucionales[fila.tipo].push(JSON.parse(fila.datos));

  return {
    version,
    datos: {
      pacientes: pacientes.rows.map((f) => JSON.parse(f.datos)),
      cilindros: cilindros.rows.map((f) => JSON.parse(f.datos)),
      historialDevolucionesProveedor: devoluciones.rows.map((f) => JSON.parse(f.datos)),
      // null indica al navegador que debe crear las ubicaciones iniciales.
      ubicacionesInstitucionales: ubicaciones.rows.length ? ubicacionesInstitucionales : null,
      notificacionesLeidas: leidas.rows.map((f) => f.aviso_id),
    },
  };
}

// ---------------------------------------------------------------------------
// Sincronización: el navegador envía solo lo que cambió desde la última vez.
// ---------------------------------------------------------------------------

function validarLista(lista, nombre) {
  if (lista === undefined) return [];
  if (!Array.isArray(lista)) throw Object.assign(new Error(`Formato inválido en ${nombre}.`), { estado: 400 });
  return lista;
}

async function aplicarCambios(cambios, usuario) {
  const base = await obtenerBase();
  const fecha = ahora();
  const sentencias = [];
  const registrar = (entidad, id, accion) =>
    sentencias.push({
      sql: "INSERT INTO bitacora (fecha, usuario_id, usuario_nombre, entidad, entidad_id, accion) VALUES (?, ?, ?, ?, ?, ?)",
      args: [fecha, usuario.id, usuario.nombre, entidad, String(id), accion],
    });

  const pacientes = cambios.pacientes || {};
  for (const paciente of validarLista(pacientes.guardar, "pacientes")) {
    if (paciente?.id === undefined || paciente?.id === null) throw Object.assign(new Error("Paciente sin identificador."), { estado: 400 });
    sentencias.push({
      sql: `INSERT INTO pacientes (id, cedula, nombre, datos, actualizado_en, actualizado_por) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET cedula = excluded.cedula, nombre = excluded.nombre, datos = excluded.datos,
            actualizado_en = excluded.actualizado_en, actualizado_por = excluded.actualizado_por`,
      args: [String(paciente.id), texto(paciente.cedula), texto(paciente.nombre), JSON.stringify(paciente), fecha, usuario.id],
    });
    registrar("paciente", paciente.id, "guardar");
  }
  for (const id of validarLista(pacientes.eliminar, "pacientes")) {
    sentencias.push({ sql: "DELETE FROM pacientes WHERE id = ?", args: [String(id)] });
    registrar("paciente", id, "eliminar");
  }

  const cilindros = cambios.cilindros || {};
  for (const cilindro of validarLista(cilindros.guardar, "cilindros")) {
    if (!cilindro?.numero) throw Object.assign(new Error("Cilindro sin número."), { estado: 400 });
    sentencias.push({
      sql: `INSERT INTO cilindros (numero, estado, tipo, paciente_id, datos, actualizado_en, actualizado_por) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (numero) DO UPDATE SET estado = excluded.estado, tipo = excluded.tipo, paciente_id = excluded.paciente_id,
            datos = excluded.datos, actualizado_en = excluded.actualizado_en, actualizado_por = excluded.actualizado_por`,
      args: [String(cilindro.numero), texto(cilindro.estado), texto(cilindro.tipo), texto(cilindro.pacienteId), JSON.stringify(cilindro), fecha, usuario.id],
    });
    registrar("cilindro", cilindro.numero, "guardar");
  }
  for (const numero of validarLista(cilindros.eliminar, "cilindros")) {
    sentencias.push({ sql: "DELETE FROM cilindros WHERE numero = ?", args: [String(numero)] });
    registrar("cilindro", numero, "eliminar");
  }

  const ubicaciones = cambios.ubicaciones || {};
  for (const item of validarLista(ubicaciones.guardar, "ubicaciones")) {
    if (!TIPOS_UBICACION.includes(item?.tipo) || !item?.datos?.id)
      throw Object.assign(new Error("Ubicación institucional inválida."), { estado: 400 });
    sentencias.push({
      sql: `INSERT INTO ubicaciones (tipo, id, nombre, orden, datos, actualizado_en, actualizado_por) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (tipo, id) DO UPDATE SET nombre = excluded.nombre, orden = excluded.orden, datos = excluded.datos,
            actualizado_en = excluded.actualizado_en, actualizado_por = excluded.actualizado_por`,
      args: [item.tipo, String(item.datos.id), texto(item.datos.nombre), Number(item.orden) || 0, JSON.stringify(item.datos), fecha, usuario.id],
    });
    registrar("ubicacion", `${item.tipo}/${item.datos.id}`, "guardar");
  }
  for (const item of validarLista(ubicaciones.eliminar, "ubicaciones")) {
    sentencias.push({ sql: "DELETE FROM ubicaciones WHERE tipo = ? AND id = ?", args: [String(item.tipo), String(item.id)] });
    registrar("ubicacion", `${item.tipo}/${item.id}`, "eliminar");
  }

  const devoluciones = cambios.devoluciones || {};
  for (const devolucion of validarLista(devoluciones.guardar, "devoluciones")) {
    if (devolucion?.id === undefined || devolucion?.id === null) throw Object.assign(new Error("Devolución sin identificador."), { estado: 400 });
    sentencias.push({
      sql: `INSERT INTO devoluciones_proveedor (id, fecha, datos, actualizado_en, actualizado_por) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET fecha = excluded.fecha, datos = excluded.datos,
            actualizado_en = excluded.actualizado_en, actualizado_por = excluded.actualizado_por`,
      args: [String(devolucion.id), texto(devolucion.fecha), JSON.stringify(devolucion), fecha, usuario.id],
    });
    registrar("devolucion", devolucion.id, "guardar");
  }
  for (const id of validarLista(devoluciones.eliminar, "devoluciones")) {
    sentencias.push({ sql: "DELETE FROM devoluciones_proveedor WHERE id = ?", args: [String(id)] });
    registrar("devolucion", id, "eliminar");
  }

  // Las notificaciones leídas son personales de cada usuario.
  for (const avisoId of validarLista(cambios.notificacionesLeidas, "notificaciones"))
    sentencias.push({
      sql: "INSERT OR IGNORE INTO notificaciones_leidas (usuario_id, aviso_id) VALUES (?, ?)",
      args: [usuario.id, String(avisoId)],
    });

  const huboCambiosCompartidos = sentencias.some((s) => !s.sql.includes("notificaciones_leidas"));
  if (huboCambiosCompartidos)
    sentencias.push({
      sql: `INSERT INTO meta (clave, valor) VALUES ('version_datos', '1')
            ON CONFLICT (clave) DO UPDATE SET valor = CAST(valor AS INTEGER) + 1`,
      args: [],
    });
  if (sentencias.length) await base.batch(sentencias, "write"); // Transacción: todo o nada.
  return { version: await versionActual(base), actualizadoEn: fecha };
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

function filaUsuario(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    nombre: fila.nombre,
    cuenta: fila.cuenta,
    rol: fila.rol,
    activo: Boolean(fila.activo),
    sal: fila.sal,
    hash: fila.hash,
    creado: fila.creado,
    ultimoIngreso: fila.ultimo_ingreso,
  };
}

async function contarUsuarios() {
  const base = await obtenerBase();
  const { rows } = await base.execute("SELECT COUNT(*) AS total FROM usuarios");
  return Number(rows[0].total);
}

async function buscarUsuarioPorCuenta(cuenta) {
  const base = await obtenerBase();
  const { rows } = await base.execute({ sql: "SELECT * FROM usuarios WHERE cuenta = ?", args: [cuenta] });
  return filaUsuario(rows[0]);
}

async function buscarUsuarioPorId(id) {
  const base = await obtenerBase();
  const { rows } = await base.execute({ sql: "SELECT * FROM usuarios WHERE id = ?", args: [id] });
  return filaUsuario(rows[0]);
}

async function listarUsuarios() {
  const base = await obtenerBase();
  const { rows } = await base.execute("SELECT * FROM usuarios ORDER BY nombre COLLATE NOCASE");
  return rows.map(filaUsuario);
}

async function crearUsuario(usuario) {
  const base = await obtenerBase();
  await base.execute({
    sql: "INSERT INTO usuarios (id, nombre, cuenta, rol, activo, sal, hash, creado, ultimo_ingreso) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [usuario.id, usuario.nombre, usuario.cuenta, usuario.rol, usuario.activo ? 1 : 0, usuario.sal, usuario.hash, usuario.creado, usuario.ultimoIngreso || null],
  });
}

async function actualizarUsuario(id, campos) {
  const columnas = { nombre: "nombre", rol: "rol", activo: "activo", sal: "sal", hash: "hash", ultimoIngreso: "ultimo_ingreso" };
  const pares = Object.entries(campos).filter(([clave]) => columnas[clave]);
  if (!pares.length) return;
  const base = await obtenerBase();
  await base.execute({
    sql: `UPDATE usuarios SET ${pares.map(([clave]) => `${columnas[clave]} = ?`).join(", ")} WHERE id = ?`,
    args: [...pares.map(([clave, valor]) => (clave === "activo" ? (valor ? 1 : 0) : valor)), id],
  });
}

async function eliminarUsuario(id) {
  const base = await obtenerBase();
  await base.batch(
    [
      { sql: "DELETE FROM notificaciones_leidas WHERE usuario_id = ?", args: [id] },
      { sql: "DELETE FROM usuarios WHERE id = ?", args: [id] },
    ],
    "write",
  );
}

// ---------------------------------------------------------------------------
// Secreto para firmar sesiones: variable de entorno o, si no existe, uno
// aleatorio guardado en la base.
// ---------------------------------------------------------------------------

async function obtenerSecretoSesion(generar) {
  if (process.env.SESION_SECRETO) return process.env.SESION_SECRETO;
  const base = await obtenerBase();
  let secreto = await leerMeta(base, "secreto_sesion");
  if (!secreto) {
    secreto = generar();
    await base.execute({ sql: "INSERT OR IGNORE INTO meta (clave, valor) VALUES ('secreto_sesion', ?)", args: [secreto] });
    secreto = await leerMeta(base, "secreto_sesion");
  }
  return secreto;
}

module.exports = {
  ARCHIVO_BASE,
  EN_VERCEL,
  obtenerBase,
  usaArchivoLocal,
  obtenerVersion,
  crearRespaldo,
  leerSistema,
  aplicarCambios,
  contarUsuarios,
  buscarUsuarioPorCuenta,
  buscarUsuarioPorId,
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  obtenerSecretoSesion,
};
