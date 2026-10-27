/* =========================================================
   POPUPS PERSONALIZADOS
========================================================= */

function detectarTipoPopup(mensaje) {
    const texto = String(mensaje || "").toLowerCase();

    if (
        texto.includes("correctamente") ||
        texto.includes("registrada") ||
        texto.includes("guardado") ||
        texto.includes("actualizada") ||
        texto.includes("éxito")
    ) return "exito";

    if (
        texto.includes("no coincide") ||
        texto.includes("debe") ||
        texto.includes("seleccionar") ||
        texto.includes("ingresar") ||
        texto.includes("completar")
    ) return "advertencia";

    if (
        texto.includes("no existe") ||
        texto.includes("no está disponible") ||
        texto.includes("error") ||
        texto.includes("no puede")
    ) return "error";

    return "info";
}

function mostrarPopup(mensaje, tipo = null, titulo = null) {
    const overlay = document.getElementById("ccssPopupOverlay");
    const tituloEl = document.getElementById("ccssPopupTitulo");
    const mensajeEl = document.getElementById("ccssPopupMensaje");
    const iconoEl = document.getElementById("ccssPopupIcono");
    const boton = document.getElementById("ccssPopupAceptar");

    if (!overlay || !tituloEl || !mensajeEl || !iconoEl || !boton) return;

    const tipoFinal = tipo || detectarTipoPopup(mensaje);
    const config = {
        exito: { titulo: "Operación realizada", icono: "check" },
        advertencia: { titulo: "Atención", icono: "triangle-alert" },
        error: { titulo: "No se pudo continuar", icono: "x" },
        info: { titulo: "Información", icono: "info" }
    };

    const seleccionado = config[tipoFinal] || config.info;
    overlay.dataset.tipo = tipoFinal;
    tituloEl.textContent = titulo || seleccionado.titulo;
    mensajeEl.textContent = String(mensaje || "");
    iconoEl.innerHTML = iconoSVG(seleccionado.icono);
    overlay.classList.add("activo");
    overlay.setAttribute("aria-hidden", "false");

    setTimeout(() => boton.focus(), 30);
}

function cerrarPopup() {
    const overlay = document.getElementById("ccssPopupOverlay");
    if (!overlay) return;
    overlay.classList.remove("activo");
    overlay.setAttribute("aria-hidden", "true");
}

// Sustituye las alertas nativas del navegador por el popup del sistema
window.alert = function(mensaje) {
    mostrarPopup(mensaje);
};

(function inicializarPopups() {
    const overlay = document.getElementById("ccssPopupOverlay");
    const boton = document.getElementById("ccssPopupAceptar");
    if (!overlay || !boton) return;

    boton.addEventListener("click", cerrarPopup);
    overlay.addEventListener("click", function(event) {
        if (event.target === overlay) cerrarPopup();
    });
    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape" && overlay.classList.contains("activo")) {
            cerrarPopup();
        }
    });
})();

function confirmarEliminacion({ titulo, nombre, detalle = "", textoAceptar = "Sí, eliminar" }) {
    return new Promise(resolve => {
        const overlay = document.getElementById("confirmacionEliminarOverlay");
        const tituloEl = document.getElementById("confirmacionEliminarTitulo");
        const nombreEl = document.getElementById("confirmacionEliminarNombre");
        const detalleEl = document.getElementById("confirmacionEliminarDetalle");
        const aceptar = document.getElementById("confirmacionEliminarAceptar");
        const cancelar = document.getElementById("confirmacionEliminarCancelar");
        if (!overlay || !tituloEl || !nombreEl || !detalleEl || !aceptar || !cancelar) {
            resolve(false);
            return;
        }

        tituloEl.textContent = titulo;
        nombreEl.textContent = nombre;
        nombreEl.classList.toggle("hidden", !nombre);
        aceptar.textContent = textoAceptar;
        detalleEl.textContent = detalle;
        detalleEl.classList.toggle("hidden", !detalle);
        overlay.classList.add("activo");
        overlay.setAttribute("aria-hidden", "false");

        const finalizar = resultado => {
            overlay.classList.remove("activo");
            overlay.setAttribute("aria-hidden", "true");
            aceptar.removeEventListener("click", confirmar);
            cancelar.removeEventListener("click", cancelarAccion);
            overlay.removeEventListener("click", clicExterior);
            document.removeEventListener("keydown", pulsarEscape);
            resolve(resultado);
        };
        const confirmar = () => finalizar(true);
        const cancelarAccion = () => finalizar(false);
        const clicExterior = event => {
            if (event.target === overlay) finalizar(false);
        };
        const pulsarEscape = event => {
            if (event.key === "Escape") finalizar(false);
        };

        aceptar.addEventListener("click", confirmar);
        cancelar.addEventListener("click", cancelarAccion);
        overlay.addEventListener("click", clicExterior);
        document.addEventListener("keydown", pulsarEscape);
        setTimeout(() => cancelar.focus(), 30);
    });
}

function confirmarEntregaProveedor(cantidad) {
    return new Promise(resolve => {
        const overlay = document.getElementById("confirmacionProveedorOverlay");
        const mensaje = document.getElementById("confirmacionProveedorMensaje");
        const cantidadEl = document.getElementById("confirmacionProveedorCantidad");
        const aceptar = document.getElementById("confirmacionProveedorAceptar");
        const cancelar = document.getElementById("confirmacionProveedorCancelar");
        if (!overlay || !mensaje || !cantidadEl || !aceptar || !cancelar) {
            resolve(false);
            return;
        }

        mensaje.textContent = "Revise la cantidad antes de registrar la salida definitiva del inventario operativo.";
        cantidadEl.textContent = `${cantidad} cilindro${cantidad === 1 ? "" : "s"} seleccionado${cantidad === 1 ? "" : "s"}`;
        overlay.classList.add("activo");
        overlay.setAttribute("aria-hidden", "false");

        const finalizar = resultado => {
            overlay.classList.remove("activo");
            overlay.setAttribute("aria-hidden", "true");
            aceptar.removeEventListener("click", confirmar);
            cancelar.removeEventListener("click", cancelarAccion);
            overlay.removeEventListener("click", clicExterior);
            document.removeEventListener("keydown", pulsarEscape);
            resolve(resultado);
        };
        const confirmar = () => finalizar(true);
        const cancelarAccion = () => finalizar(false);
        const clicExterior = event => { if (event.target === overlay) finalizar(false); };
        const pulsarEscape = event => { if (event.key === "Escape") finalizar(false); };
        aceptar.addEventListener("click", confirmar);
        cancelar.addEventListener("click", cancelarAccion);
        overlay.addEventListener("click", clicExterior);
        document.addEventListener("keydown", pulsarEscape);
        setTimeout(() => cancelar.focus(), 30);
    });
}


let pacientes = [];
let cilindros = [];

let pacienteSeleccionado = null;
let bodegaActiva = null;
let historialDevolucionesProveedor = [];
let cilindrosSeleccionadosDevolucion = [];
let scrollPacientesGuardado = 0;
let vistaActual = "intercambio";
let pacienteEnEdicionId = null;
let cilindroEnEdicionNumero = null;
let contadorCilindrosAdicionalesEbais = 0;
let seccionInstitucionalActiva = "resumen";
let ubicacionInstitucionalSeleccionada = null;
let tipoMovimientoInstitucionalActivo = "ambulancias";
let tipoCambioInstitucionalActivo = "ebais";
let ubicacionInstitucionalEnEdicion = null;
let notificacionesSistema = [];
let notificacionesLeidas = [];

// Estructura inicial. Los nombres y responsables pueden personalizarse después.
const ubicacionesInstitucionales = {
    ebais: [
        "EBAIS SAN JERÓNIMO", "EBAIS CIRRÍ", "EBAIS SAN JUAN", "EBAIS SAN JUANILLO",
        "EBAIS SAN ROQUE", "EBAIS SAN ANTONIO", "EBAIS CANDELARIA",
        "EBAIS CONCEPCIÓN", "EBAIS ROSARIO", "EBAIS PALMITOS"
    ].map((nombre, i) => ({
        id: `ebais-${i + 1}`,
        nombre,
        subtitulo: "Área de Salud Naranjo",
        responsable: "Pendiente de asignar",
        telefono: "No registrado",
        ubicacion: "Área de Salud Naranjo",
        minimo: 1,
        frecuencia: "Semanal",
        cilindros: [],
        cilindroActual: null,
        responsableCilindro: null,
        reguladorPrestado: false,
        reguladorTipo: null,
        reguladorSerie: null,
        historial: [],
        ultimaInspeccion: null,
        estado: "Sin cilindro asignado"
    })),
    ambulancias: Array.from({ length: 4 }, (_, i) => ({
        id: `ambulancia-${i + 1}`,
        nombre: `Ambulancia ${String(i + 1).padStart(2, "0")}`,
        subtitulo: "Placa pendiente de registrar",
        responsable: "Pendiente de asignar",
        telefono: "No aplica",
        ubicacion: "Base de ambulancias",
        minimo: 2,
        frecuencia: "Diaria",
        cilindros: [],
        detallesCilindros: [],
        responsableCilindro: null,
        historial: [],
        choferResponsable: null,
        ultimaInspeccion: null,
        estado: "Pendiente de configurar"
    })),
    emergencias: [{
        id: "emergencias-1",
        nombre: "Servicio de Emergencias",
        subtitulo: "Área de Salud Naranjo",
        responsable: "Pendiente de asignar",
        telefono: "No registrado",
        ubicacion: "Servicio de Emergencias",
        minimo: 4,
        frecuencia: "Diaria",
        cilindros: [],
        detallesCilindros: [],
        responsableCilindro: null,
        historial: [],
        ultimaInspeccion: null,
        estado: "Pendiente de configurar"
    }],
    manifold: [
        { nombre: "Oxígeno - Sede Central", subtitulo: "Sistema de oxígeno medicinal" },
        { nombre: "Aire instrumental - Sede Central", subtitulo: "Sistema de aire instrumental" },
        { nombre: "Oxígeno - EBAIS San Miguel", subtitulo: "Sistema de oxígeno medicinal" },
        { nombre: "Aire Médico - EBAIS San Miguel", subtitulo: "Sistema de aire médico" }
    ].map((sistema, i) => ({
        id: `manifold-${i + 1}`,
        nombre: sistema.nombre,
        subtitulo: sistema.subtitulo,
        responsable: "Ingeniería y Mantenimiento",
        telefono: "No aplica",
        ubicacion: "Banco de gases medicinales",
        minimo: 8,
        frecuencia: "Diaria",
        cilindros: [],
        detallesCilindros: [],
        responsableCilindro: null,
        historial: [],
        ultimaInspeccion: null,
        estado: "Pendiente de configurar",
        bancoActivo: "Sin definir",
        bancoIzquierdo: [],
        bancoDerecho: []
    }))
};
