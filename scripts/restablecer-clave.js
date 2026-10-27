"use strict";

// Asigna una contraseña temporal a un usuario y lo reactiva.
// Uso:  npm run restablecer-clave -- <usuario>

const crypto = require("crypto");
const db = require("../servidor/base-datos");
const auth = require("../servidor/autenticacion");

async function restablecer(cuenta) {
  const usuario = await db.buscarUsuarioPorCuenta(auth.normalizarCuenta(cuenta));
  if (!usuario) throw new Error(`No existe el usuario "${cuenta}".`);

  const temporal = crypto.randomBytes(9).toString("base64url");
  await db.actualizarUsuario(usuario.id, { ...(await auth.protegerClave(temporal)), activo: true });

  console.log(`Usuario:              ${usuario.cuenta} (${usuario.nombre}, ${usuario.rol})`);
  console.log(`Contraseña temporal:  ${temporal}`);
  console.log("Cámbiela al ingresar con el botón de la llave, abajo en el menú.");
}

const cuenta = process.argv[2];
if (!cuenta) {
  console.error("Indique el usuario:  npm run restablecer-clave -- <usuario>");
  process.exit(1);
}
restablecer(cuenta).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
