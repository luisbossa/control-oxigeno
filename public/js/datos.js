/* =========================================================
   DATOS INICIALES
========================================================= */

// Un sistema nuevo arranca sin pacientes ni cilindros: se registran desde la aplicación.
function datosIniciales() {
    pacientes = [];
    cilindros = [];
}


/* =========================================================
   PERSISTENCIA EN EL SERVIDOR (SQLite)
========================================================= */

// Cada colección se compara con la última versión sincronizada y solo se envían
// los registros nuevos, modificados o eliminados. Así varios usuarios pueden
// trabajar a la vez sin sobrescribir los cambios de los demás.

const CLAVE_ESTADO_UI = "ccss_oxigeno_estado_ui";
const INTERVALO_REFRESCO = 30000;
const ESPERA_REINTENTO = 15000;

let temporizadorGuardado = null;
let temporizadorReintento = null;
let guardadoEnCurso = Promise.resolve();
let datosServidorCargados = false;
let estadoUIActual = null;
let versionDatos = 0;
let instantaneaSincronizada = null;
let leidasSincronizadas = new Set();
let errorGuardadoVisible = false;

async function api(ruta, opciones = {}) {
    const respuesta = await fetch(ruta, {
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...(opciones.headers || {}) },
        ...opciones
    });
    let resultado = null;
    try { resultado = await respuesta.json(); } catch (error) { resultado = {}; }
    if (!respuesta.ok) {
        if (respuesta.status === 401 && usuarioEnSesion) sesionVencida();
        throw new Error(resultado?.mensaje || "No se pudo comunicar con el servidor.");
    }
    return resultado;
}

// Mapa clave → JSON de cada registro compartido.
function instantaneaDe(origen) {
    const mapa = { pacientes: new Map(), cilindros: new Map(), ubicaciones: new Map(), devoluciones: new Map() };
    (origen.pacientes || []).forEach(p => mapa.pacientes.set(String(p.id), JSON.stringify(p)));
    (origen.cilindros || []).forEach(c => mapa.cilindros.set(String(c.numero), JSON.stringify(c)));
    Object.entries(origen.ubicacionesInstitucionales || {}).forEach(([tipo, lista]) =>
        (lista || []).forEach((datos, orden) => mapa.ubicaciones.set(`${tipo}/${datos.id}`, JSON.stringify({ tipo, orden, datos }))));
    (origen.historialDevolucionesProveedor || []).forEach(d => mapa.devoluciones.set(String(d.id), JSON.stringify(d)));
    return mapa;
}

function instantaneaActual() {
    return instantaneaDe({ pacientes, cilindros, ubicacionesInstitucionales, historialDevolucionesProveedor });
}

function calcularCambios(anterior, actual) {
    const cambios = {};
    const comparar = (nombre, claveEliminar) => {
        const guardar = [];
        const eliminar = [];
        actual[nombre].forEach((json, clave) => { if (anterior[nombre].get(clave) !== json) guardar.push(JSON.parse(json)); });
        anterior[nombre].forEach((json, clave) => { if (!actual[nombre].has(clave)) eliminar.push(claveEliminar(clave, json)); });
        if (guardar.length || eliminar.length) cambios[nombre] = { guardar, eliminar };
    };
    comparar("pacientes", clave => clave);
    comparar("cilindros", clave => clave);
    comparar("ubicaciones", (clave, json) => { const { tipo, datos } = JSON.parse(json); return { tipo, id: datos.id }; });
    comparar("devoluciones", clave => clave);
    const nuevasLeidas = notificacionesLeidas.filter(id => !leidasSincronizadas.has(id));
    if (nuevasLeidas.length) cambios.notificacionesLeidas = nuevasLeidas;
    return cambios;
}

function hayCambiosPendientes() {
    return Boolean(instantaneaSincronizada) && Object.keys(calcularCambios(instantaneaSincronizada, instantaneaActual())).length > 0;
}

// La vista, el paciente abierto y la búsqueda son preferencias de este navegador.
function guardarEstadoUI() {
    try {
        localStorage.setItem(CLAVE_ESTADO_UI, JSON.stringify({
            vista: vistaActual,
            pacienteId: pacienteSeleccionado ? pacienteSeleccionado.id : null,
            busquedaPacientes: document.getElementById("buscarPacientes")?.value || ""
        }));
    } catch (error) { /* El navegador puede bloquear el almacenamiento local. */ }
}

function leerEstadoUI() {
    try { return JSON.parse(localStorage.getItem(CLAVE_ESTADO_UI)) || null; } catch (error) { return null; }
}

async function sincronizarCambios() {
    if (!instantaneaSincronizada || !usuarioEnSesion) return;
    const actual = instantaneaActual();
    const cambios = calcularCambios(instantaneaSincronizada, actual);
    if (!Object.keys(cambios).length) return;
    try {
        const respuesta = await api("/api/sincronizar", { method: "POST", body: JSON.stringify({ cambios }) });
        instantaneaSincronizada = actual;
        (cambios.notificacionesLeidas || []).forEach(id => leidasSincronizadas.add(id));
        // Si la versión avanzó más de un paso, otro usuario guardó cambios: se recargan.
        const huboOtrosCambios = respuesta.version > versionDatos + 1;
        versionDatos = respuesta.version;
        if (huboOtrosCambios) setTimeout(refrescarDatos, 0);
        if (errorGuardadoVisible) {
            errorGuardadoVisible = false;
            mostrarPopup("La conexión se restableció y los cambios pendientes se guardaron.", "exito");
        }
    } catch (error) {
        // Sin sesión (venció): los cambios quedan retenidos y se envían al volver a ingresar.
        if (!usuarioEnSesion) return;
        console.error("No se pudieron guardar los datos en el servidor:", error);
        if (!errorGuardadoVisible) {
            errorGuardadoVisible = true;
            mostrarPopup(`No se pudieron guardar los últimos cambios: ${error.message}\nSe reintentará automáticamente; no cierre esta ventana.`, "error");
        }
        clearTimeout(temporizadorReintento);
        temporizadorReintento = setTimeout(() => guardarDatos(true), ESPERA_REINTENTO);
    }
}

function guardarDatos(inmediato = false) {
    guardarEstadoUI();
    programarRecalculoAvisos();
    if (!datosServidorCargados) return Promise.resolve();
    clearTimeout(temporizadorGuardado);
    return new Promise(resolve => {
        temporizadorGuardado = setTimeout(() => {
            guardadoEnCurso = guardadoEnCurso.then(sincronizarCambios).finally(resolve);
        }, inmediato ? 0 : 350);
    });
}

// Carga el estado del servidor y deja registrada la instantánea sincronizada.
function aplicarDatosServidor(respuesta) {
    const datos = respuesta.datos || {};
    instantaneaSincronizada = instantaneaDe(datos);
    leidasSincronizadas = new Set(datos.notificacionesLeidas || []);
    versionDatos = respuesta.version || 0;
    cargarDatos(datos);
}

function hayEdicionEnCurso() {
    const activo = document.activeElement;
    if (activo && ["INPUT", "TEXTAREA", "SELECT"].includes(activo.tagName) && activo.id !== "buscarPacientes") return true;
    if (document.querySelector(".modal-bg.flex, .ccss-popup-overlay.activo")) return true;
    return vistaActual === "intercambio" && Boolean(pacienteSeleccionado);
}

// Trae los cambios hechos por otros usuarios y vuelve a dibujar la vista actual.
async function refrescarDatos() {
    if (!datosServidorCargados || !usuarioEnSesion || document.hidden || hayEdicionEnCurso()) return;
    await guardadoEnCurso;
    if (hayCambiosPendientes()) return;
    try {
        const respuesta = await api(`/api/datos?version=${versionDatos}`);
        if (respuesta.sinCambios || hayEdicionEnCurso() || hayCambiosPendientes()) return;
        const pacienteAbierto = pacienteSeleccionado?.id ?? null;
        aplicarDatosServidor(respuesta);
        pacienteSeleccionado = pacienteAbierto === null ? null : pacientes.find(p => p.id === pacienteAbierto) || null;
        redibujarVistaActual();
    } catch (error) {
        console.warn("No se pudieron consultar cambios recientes:", error.message);
    }
}

function redibujarVistaActual() {
    renderPacientes();
    if (vistaActual === "paciente-detalle") {
        if (pacienteSeleccionado) abrirPaciente(pacienteSeleccionado.id);
        else mostrarVista("pacientes");
    } else if (vistaActual === "cilindros" && bodegaActiva) {
        seleccionarBodega(bodegaActiva);
    } else if (vistaActual === "institucionales") {
        renderInstitucionales();
    } else if (vistaActual === "panel") {
        renderPanel();
    }
    calcularNotificacionesSistema();
}


function fechaHoyLocal() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

function calcularFechaCambioPorRecepcion(fechaRecepcion) {
    if (!fechaRecepcion) return null;

    // Regla: fecha de cambio = fecha de recepción del proveedor + 4 meses.
    const fecha = new Date(fechaRecepcion + "T00:00:00");
    if (isNaN(fecha.getTime())) return null;

    return sumarMeses(fecha, 4).toISOString().slice(0, 10);
}

function normalizarFechasVigencia() {
    cilindros.forEach(cil => {
        if (!cil) return;

        // Compatibilidad con registros anteriores:
        // el antiguo campo fechaAlmacenamiento se migra a fechaRecepcion.
        if (!cil.fechaRecepcion && cil.fechaAlmacenamiento) {
            cil.fechaRecepcion = cil.fechaAlmacenamiento;
        }

        // Si el cilindro ya estaba asignado y no tenía fecha de recepción,
        // usamos la fecha de entrega al paciente como la mejor fecha histórica disponible.
        if (!cil.fechaRecepcion && cil.fechaEntrega) {
            cil.fechaRecepcion = cil.fechaEntrega;
        }

        // Para cilindros llenos antiguos sin ninguna fecha histórica disponible,
        // se toma la fecha de la primera carga de esta nueva versión.
        if (!cil.fechaRecepcion && cil.estado === "Disponible") {
            cil.fechaRecepcion = fechaHoyLocal();
        }

        cil.fechaCambio = calcularFechaCambioPorRecepcion(cil.fechaRecepcion);

        // Se conserva este campo para compatibilidad con registros históricos
        // de versiones anteriores. Ahora representa la misma fecha de cambio.
        cil.fechaAlertaCambio = cil.fechaCambio;
        cil.fechaVencimientoUso = cil.vencimiento || null;
    });
}

function cargarDatos(datosServidor = {}) {

    const p = datosServidor.pacientes ? JSON.stringify(datosServidor.pacientes) : null;
    const c = datosServidor.cilindros ? JSON.stringify(datosServidor.cilindros) : null;
    const e = datosServidor.ubicacionesInstitucionales?.ebais ? JSON.stringify(datosServidor.ubicacionesInstitucionales.ebais) : null;
    const a = datosServidor.ubicacionesInstitucionales?.ambulancias ? JSON.stringify(datosServidor.ubicacionesInstitucionales.ambulancias) : null;
    const em = datosServidor.ubicacionesInstitucionales?.emergencias ? JSON.stringify(datosServidor.ubicacionesInstitucionales.emergencias) : null;
    const ma = datosServidor.ubicacionesInstitucionales?.manifold ? JSON.stringify(datosServidor.ubicacionesInstitucionales.manifold) : null;
    const dp = datosServidor.historialDevolucionesProveedor ? JSON.stringify(datosServidor.historialDevolucionesProveedor) : null;

    if (p) {

        pacientes = JSON.parse(p);

        pacientes.forEach(paciente => {

            if (!Array.isArray(paciente.historial)) {
                paciente.historial = [];
            }

            // Compatibilidad con pacientes registrados antes de incorporar reguladores.
            if (!Object.prototype.hasOwnProperty.call(paciente, "reguladorPrestado")) paciente.reguladorPrestado = false;
            if (!Object.prototype.hasOwnProperty.call(paciente, "reguladorTipo")) paciente.reguladorTipo = null;
            if (!Object.prototype.hasOwnProperty.call(paciente, "reguladorSerie")) paciente.reguladorSerie = null;
            if (!Array.isArray(paciente.reguladores)) {
                paciente.reguladores = paciente.reguladorPrestado
                    ? [{ tipo: paciente.reguladorTipo || "", serie: paciente.reguladorSerie || "" }]
                    : [];
            }

        });

    } else {

        datosIniciales();

    }

    // Compatibilidad: los registros antiguos guardaban un solo cilindro en
    // "cilindroActual". Desde esta versión cada paciente conserva una lista.
    pacientes.forEach(paciente => {
        if (!Array.isArray(paciente.cilindros)) {
            paciente.cilindros = paciente.cilindroActual ? [paciente.cilindroActual] : [];
        }
        paciente.cilindros = [...new Set(paciente.cilindros.filter(Boolean))];
        paciente.cilindroActual = paciente.cilindros.at(-1) || null;
        if (!Array.isArray(paciente.reguladores)) {
            paciente.reguladores = paciente.reguladorPrestado
                ? [{ tipo: paciente.reguladorTipo || "", serie: paciente.reguladorSerie || "" }]
                : [];
        }
        paciente.reguladores = paciente.reguladores.filter(Boolean).map(reg => ({
            tipo: reg.tipo || reg.reguladorTipo || "",
            serie: reg.serie || reg.reguladorSerie || ""
        }));
        paciente.reguladorPrestado = paciente.reguladores.length > 0;
        paciente.reguladorTipo = paciente.reguladores[0]?.tipo || null;
        paciente.reguladorSerie = paciente.reguladores[0]?.serie || null;
    });

    if (e) {
        try {
            const guardados = JSON.parse(e);
            if (Array.isArray(guardados)) {
                ubicacionesInstitucionales.ebais.forEach(ebais => {
                    const nombreOficial = ebais.nombre;
                    const anterior = guardados.find(item => item.id === ebais.id || item.nombre === ebais.nombre);
                    if (anterior) Object.assign(ebais, anterior);
                    ebais.nombre = nombreOficial;
                    if (!Array.isArray(ebais.historial)) ebais.historial = [];
                    if (!Array.isArray(ebais.cilindros)) ebais.cilindros = [];
                    if (!Object.prototype.hasOwnProperty.call(ebais, "responsableCilindro")) ebais.responsableCilindro = null;
                    if (!Object.prototype.hasOwnProperty.call(ebais, "reguladorPrestado")) ebais.reguladorPrestado = false;
                });
            }
        } catch (error) {
            console.warn("No se pudieron restaurar los datos de los EBAIS:", error);
        }
    }

    if (a) {
        try {
            const guardadas = JSON.parse(a);
            if (Array.isArray(guardadas)) ubicacionesInstitucionales.ambulancias.forEach(ambulancia => {
                const anterior = guardadas.find(item => item.id === ambulancia.id);
                if (anterior) Object.assign(ambulancia, anterior);
                if (!Array.isArray(ambulancia.cilindros)) ambulancia.cilindros = [];
                if (!Array.isArray(ambulancia.detallesCilindros)) ambulancia.detallesCilindros = [];
                if (!Array.isArray(ambulancia.historial)) ambulancia.historial = [];
            });
        } catch (error) {
            console.warn("No se pudieron restaurar los datos de las ambulancias:", error);
        }
    }
    [["emergencias", em], ["manifold", ma]].forEach(([tipo, guardado]) => {
        if (!guardado) return;
        try {
            const datos = JSON.parse(guardado);
            if (Array.isArray(datos)) ubicacionesInstitucionales[tipo].forEach(ubicacion => {
                const nombreOficial = ubicacion.nombre;
                const subtituloOficial = ubicacion.subtitulo;
                const anterior = datos.find(item => item.id === ubicacion.id);
                if (anterior) Object.assign(ubicacion, anterior);
                if (tipo === "manifold") {
                    ubicacion.nombre = nombreOficial;
                    ubicacion.subtitulo = subtituloOficial;
                }
                if (!Array.isArray(ubicacion.cilindros)) ubicacion.cilindros = [];
                if (!Array.isArray(ubicacion.detallesCilindros)) ubicacion.detallesCilindros = [];
                if (!Array.isArray(ubicacion.historial)) ubicacion.historial = [];
            });
        } catch (error) { console.warn(`No se pudieron restaurar los datos de ${tipo}:`, error); }
    });

    // Restaura las colecciones completas para conservar ubicaciones creadas,
    // nombres editados y eliminaciones realizadas por el usuario.
    [["ebais", e], ["ambulancias", a], ["emergencias", em], ["manifold", ma]].forEach(([tipo, guardado]) => {
        if (!guardado) return;
        try {
            const datos = JSON.parse(guardado);
            if (!Array.isArray(datos)) return;
            ubicacionesInstitucionales[tipo] = datos.map(item => ({
                ...item,
                cilindros: Array.isArray(item.cilindros) ? item.cilindros : [],
                detallesCilindros: Array.isArray(item.detallesCilindros) ? item.detallesCilindros : [],
                historial: Array.isArray(item.historial) ? item.historial : [],
                bancoIzquierdo: Array.isArray(item.bancoIzquierdo) ? item.bancoIzquierdo : [],
                bancoDerecho: Array.isArray(item.bancoDerecho) ? item.bancoDerecho : []
            }));
        } catch (error) {
            console.warn(`No se pudo restaurar la colección completa de ${tipo}:`, error);
        }
    });


    if (c) {

        cilindros = JSON.parse(c);
        
        cilindros.forEach(cil => {
            if (!cil.vencimiento) cil.vencimiento = "2027-01-01";
            if (!Object.prototype.hasOwnProperty.call(cil, "fechaEntrega")) cil.fechaEntrega = null;
            if (!Object.prototype.hasOwnProperty.call(cil, "fechaRecepcion")) cil.fechaRecepcion = cil.fechaAlmacenamiento || null;
            if (!Object.prototype.hasOwnProperty.call(cil, "fechaCambio")) cil.fechaCambio = null;
        });

    } else {

        if (!cilindros.length) {
            datosIniciales();
        }

    }

    normalizarFechasVigencia();
    try {
        historialDevolucionesProveedor = dp ? JSON.parse(dp) : [];
        if (!Array.isArray(historialDevolucionesProveedor)) historialDevolucionesProveedor = [];
    } catch (error) {
        historialDevolucionesProveedor = [];
    }
    estadoUIActual = leerEstadoUI();
    notificacionesLeidas = Array.isArray(datosServidor.notificacionesLeidas) ? datosServidor.notificacionesLeidas : [];
    datosServidorCargados = true;
    guardarDatos();
}
