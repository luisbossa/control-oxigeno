"use strict";

// Función de Vercel: recibe todas las rutas /api/* (ver vercel.json).
const { manejarAPI } = require("../servidor/aplicacion");

module.exports = (req, res) => manejarAPI(req, res);
