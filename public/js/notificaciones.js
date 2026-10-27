/* =========================================================
   CENTRO DE NOTIFICACIONES Y AVISOS
   Usa las mismas reglas de urgencia que el Panel del día
   (urgenciaCilindro en panel.js). Los avisos urgentes no se
   pueden marcar como leídos: siguen visibles hasta resolverse.
========================================================= */

const NOMBRES_SERVICIO = { ebais: "EBAIS", ambulancias: "Ambulancia", emergencias: "Emergencias", manifold: "Manifold" };
const DIAS_AVISO_VENCIMIENTO_BODEGA = 30;
const MAXIMO_AVISOS_NAVEGADOR = 3;
const NIVELES_AVISO = {
    urgente: { titulo: "Urgente", estado: "critico", icono: "siren" },
    advertencia: { titulo: "Atención", estado: "pronto", icono: "triangle-alert" },
    informacion: { titulo: "Información", estado: "sin-fecha", icono: "info" }
};
let temporizadorAvisos = null;

// Dónde está un cilindro: con un paciente, en un servicio o en bodega.
function ubicarCilindro(cilindro) {
    const paciente = pacientes.find(p => (p.cilindros || []).includes(cilindro.numero));
    if (paciente) return { tipo: "paciente", paciente };
    for (const tipo of Object.keys(NOMBRES_SERVICIO)) {
        const ubicacion = (ubicacionesInstitucionales[tipo] || []).find(u => (u.cilindros || []).includes(cilindro.numero));
        if (ubicacion) return { tipo: "servicio", servicio: tipo, ubicacion };
    }
    if (cilindro.estado === "Disponible") return { tipo: "bodega" };
    return { tipo: "otro" };
}

function avisoDeCilindro(cilindro) {
    const lugar = ubicarCilindro(cilindro);
    const numero = cilindro.numero;

    if (lugar.tipo === "paciente" || lugar.tipo === "servicio") {
        const urgencia = urgenciaCilindro(cilindro);
        if (urgencia.nivel !== "critico" && urgencia.nivel !== "pronto") return null;
        const quien = lugar.tipo === "paciente"
            ? lugar.paciente.nombre
            : `${NOMBRES_SERVICIO[lugar.servicio]} · ${lugar.ubicacion.nombre}`;
        return {
            id: `cambio-${cilindro.numero}-${cilindro.fechaCambio}-${urgencia.nivel}`,
            nivel: urgencia.nivel === "critico" ? "urgente" : "advertencia",
            etiqueta: urgencia.texto,
            titulo: quien,
            detalle: `Cilindro ${numero} · cambio programado ${cilindro.fechaCambio ? formatearFecha(cilindro.fechaCambio) : "sin fecha"}.`,
            destino: lugar.tipo === "paciente"
                ? { vista: "paciente", id: lugar.paciente.id }
                : { vista: "servicio", servicio: lugar.servicio, id: lugar.ubicacion.id }
        };
    }

    if (lugar.tipo === "bodega") {
        const vigencia = calcularVigencia(cilindro);
        if (!vigencia?.vencimientoFisico) return null;
        const dias = diasHastaFecha(vigencia.vencimientoFisico);
        if (vigencia.estado === "vencido_fisico") {
            return { id: `bodega-vencido-${cilindro.numero}-${cilindro.vencimiento}`, nivel: "urgente", etiqueta: "No entregar",
                titulo: `Cilindro ${numero} vencido en bodega`, detalle: `La etiqueta venció el ${formatearFecha(cilindro.vencimiento)}. Sepárelo para devolverlo al proveedor.`,
                destino: { vista: "bodega", bodega: "llenos" } };
        }
        if (dias <= DIAS_AVISO_VENCIMIENTO_BODEGA) {
            return { id: `bodega-vence-${cilindro.numero}-${cilindro.vencimiento}`, nivel: "advertencia", etiqueta: dias === 0 ? "Vence hoy" : `Vence en ${plural(dias, "día")}`,
                titulo: `Cilindro ${numero} en bodega por vencer`, detalle: `Entréguelo primero. La etiqueta vence el ${formatearFecha(cilindro.vencimiento)}.`,
                destino: { vista: "bodega", bodega: "llenos" } };
        }
    }
    return null;
}

function avisosLogistica(ahora) {
    const avisos = [];
    const dia = ahora.getDay();
    const fechaClave = fechaHoyLocal();
    const vacios = cilindros.filter(c => c.estado === "Recibido");

    if ((dia === 1 || dia === 4) && ahora.getHours() >= 14) {
        const conteo = vacios.reduce((acc, c) => { acc[c.tipo] = (acc[c.tipo] || 0) + 1; return acc; }, {});
        avisos.push({ id: `pedido-${fechaClave}`, nivel: "informacion", etiqueta: "Hoy", titulo: "Preparar pedido al proveedor",
            detalle: vacios.length ? `${plural(vacios.length, "cilindro vacío", "cilindros vacíos")}: ${Object.entries(conteo).map(([tipo, n]) => `${n} ${tipo}`).join(" · ")}.` : "No hay cilindros en la bodega de vacíos.",
            destino: { vista: "bodega", bodega: "vacios" } });
    }
    if (dia === 2 || dia === 5) {
        avisos.push({ id: `proveedor-${fechaClave}`, nivel: "informacion", etiqueta: "Hoy", titulo: "Día de entrega y recepción",
            detalle: `Entregue los vacíos al proveedor y registre los llenos recibidos. Vacíos en bodega: ${vacios.length}.`,
            destino: { vista: "bodega", bodega: "vacios" } });
    }

    // Solo servicios que ya operan (con historial); los no configurados no generan ruido.
    const bajoMinimo = serviciosBajoMinimo().filter(item => (item.ubicacion.historial || []).length);
    if (bajoMinimo.length) {
        avisos.push({ id: `servicios-minimo-${fechaClave}-${bajoMinimo.length}`, nivel: "informacion", etiqueta: plural(bajoMinimo.length, "servicio", "servicios"),
            titulo: "Servicios bajo el mínimo de cilindros",
            detalle: bajoMinimo.slice(0, 3).map(item => `${item.ubicacion.nombre} (${item.actuales}/${item.minimo})`).join(" · ") + (bajoMinimo.length > 3 ? "…" : "."),
            destino: { vista: "servicios" } });
    }
    return avisos;
}

function calcularNotificacionesSistema() {
    const orden = { urgente: 0, advertencia: 1, informacion: 2 };
    notificacionesSistema = [
        ...cilindros.map(avisoDeCilindro).filter(Boolean),
        ...avisosLogistica(new Date())
    ].sort((a, b) => orden[a.nivel] - orden[b.nivel]);
    renderNotificacionesSistema();
    emitirNotificacionesNavegador();
}

// Recalcula poco después de un cambio, agrupando varios guardados seguidos.
function programarRecalculoAvisos() {
    clearTimeout(temporizadorAvisos);
    temporizadorAvisos = setTimeout(() => {
        if (!usuarioEnSesion) return;
        calcularNotificacionesSistema();
        if (vistaActual === "panel") renderPanel();
    }, 150);
}

function avisoPendiente(aviso) {
    return aviso.nivel === "urgente" || !notificacionesLeidas.includes(aviso.id);
}

/* ---------------------------------------------------------
   Render del panel de la campana
--------------------------------------------------------- */

function renderNotificacionesSistema() {
    const lista = document.getElementById("listaNotificaciones");
    const contador = document.getElementById("contadorNotificaciones");
    const resumen = document.getElementById("resumenNotificaciones");
    if (!lista || !contador || !resumen) return;

    const pendientes = notificacionesSistema.filter(avisoPendiente);
    const urgentes = notificacionesSistema.filter(aviso => aviso.nivel === "urgente").length;
    contador.textContent = pendientes.length > 99 ? "99+" : pendientes.length;
    contador.classList.toggle("hidden", !pendientes.length);
    contador.classList.toggle("flex", Boolean(pendientes.length));
    contador.classList.toggle("contador-informativo", !urgentes);
    resumen.textContent = urgentes
        ? `${plural(urgentes, "aviso urgente", "avisos urgentes")} · ${plural(pendientes.length, "pendiente")} en total`
        : pendientes.length ? `${plural(pendientes.length, "aviso pendiente", "avisos pendientes")}` : "Sin avisos pendientes";
    document.getElementById("botonMarcarLeidas").disabled = !notificacionesSistema.some(a => a.nivel !== "urgente" && !notificacionesLeidas.includes(a.id));
    actualizarBotonNavegador();

    if (!notificacionesSistema.length) {
        lista.innerHTML = `<div class="avisos-vacio">${iconoSVG("circle-check-big")}<p class="font-medium">Todo está al día</p><p class="text-xs text-slate-500">No hay cambios atrasados ni próximos.</p></div>`;
        return;
    }

    lista.innerHTML = Object.entries(NIVELES_AVISO).map(([nivel, config]) => {
        const grupo = notificacionesSistema.filter(aviso => aviso.nivel === nivel);
        if (!grupo.length) return "";
        return `<section class="avisos-grupo">
            <h4 class="avisos-grupo-titulo">${config.titulo} <span class="font-mono">${grupo.length}</span></h4>
            ${grupo.map(aviso => {
                const leida = aviso.nivel !== "urgente" && notificacionesLeidas.includes(aviso.id);
                return `<button type="button" class="aviso aviso-${nivel}${leida ? " aviso-leido" : ""}" onclick="abrirAviso('${encodeURIComponent(aviso.id)}')">
                    <span class="aviso-cuerpo">
                        <span class="aviso-cabecera"><span class="estado estado-${config.estado}">${textoSeguro(aviso.etiqueta)}</span>${leida || nivel === "urgente" ? "" : '<span class="aviso-punto" aria-label="Sin leer"></span>'}</span>
                        <span class="aviso-titulo">${textoSeguro(aviso.titulo)}</span>
                        <span class="aviso-detalle">${textoSeguro(aviso.detalle)}</span>
                    </span>
                    <span class="aviso-ver">Ver ${iconoSVG("arrow-right")}</span>
                </button>`;
            }).join("")}
        </section>`;
    }).join("");
}

function togglePanelNotificaciones(event, forzar = null) {
    event?.stopPropagation();
    const panel = document.getElementById("panelNotificaciones");
    if (!panel) return;
    const abrir = forzar === null ? panel.classList.contains("hidden") : forzar;
    panel.classList.toggle("hidden", !abrir);
    if (abrir) calcularNotificacionesSistema();
}

/* ---------------------------------------------------------
   Acciones
--------------------------------------------------------- */

function irADestinoAviso(destino) {
    if (!destino) return;
    if (destino.vista === "paciente" && pacientes.some(p => p.id === destino.id)) return abrirPaciente(destino.id);
    if (destino.vista === "bodega") { mostrarVista("cilindros"); return seleccionarBodega(destino.bodega); }
    if (destino.vista === "servicio") { mostrarInstitucional(destino.servicio); return abrirDetalleInstitucional(destino.servicio, destino.id); }
    if (destino.vista === "servicios") return mostrarInstitucional("resumen");
}

function marcarAvisoLeido(aviso) {
    if (aviso.nivel === "urgente" || notificacionesLeidas.includes(aviso.id)) return;
    notificacionesLeidas = [...notificacionesLeidas, aviso.id].slice(-500);
    guardarDatos();
}

function abrirAviso(idCodificado) {
    const aviso = notificacionesSistema.find(item => item.id === decodeURIComponent(idCodificado));
    if (!aviso) return;
    marcarAvisoLeido(aviso);
    togglePanelNotificaciones(null, false);
    irADestinoAviso(aviso.destino);
    renderNotificacionesSistema();
}

// Los urgentes no se marcan: deben resolverse.
function marcarTodasNotificacionesLeidas() {
    const leibles = notificacionesSistema.filter(aviso => aviso.nivel !== "urgente").map(aviso => aviso.id);
    notificacionesLeidas = [...new Set([...notificacionesLeidas, ...leibles])].slice(-500);
    guardarDatos();
    renderNotificacionesSistema();
}

/* ---------------------------------------------------------
   Avisos del navegador (escritorio)
--------------------------------------------------------- */

function actualizarBotonNavegador() {
    const boton = document.getElementById("botonActivarNotificaciones");
    if (!boton) return;
    if (!("Notification" in window)) {
        boton.textContent = "El navegador no admite avisos";
        boton.disabled = true;
        return;
    }
    const textos = { granted: "Avisos del navegador activos", denied: "Avisos bloqueados en el navegador", default: "Activar avisos del navegador" };
    boton.textContent = textos[Notification.permission];
    boton.disabled = Notification.permission === "granted";
    boton.title = Notification.permission === "denied" ? "Habilítelos en la configuración del sitio (ícono a la izquierda de la dirección)." : "";
}

async function activarNotificacionesNavegador() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") {
        mostrarPopup("Los avisos están bloqueados para este sitio. Habilítelos desde el ícono a la izquierda de la dirección web y recargue la página.", "advertencia");
        return;
    }
    const permiso = await Notification.requestPermission();
    actualizarBotonNavegador();
    if (permiso === "granted") {
        emitirNotificacionesNavegador();
        mostrarPopup("Recibirá avisos urgentes y de atención mientras el sistema esté abierto.", "exito");
    }
}

function emitirNotificacionesNavegador() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    let emitidas = [];
    try { emitidas = JSON.parse(sessionStorage.getItem("ccss_notificaciones_emitidas") || "[]"); } catch (error) { emitidas = []; }

    const nuevas = notificacionesSistema.filter(aviso => aviso.nivel !== "informacion" && avisoPendiente(aviso) && !emitidas.includes(aviso.id));
    if (!nuevas.length) return;

    const enfocar = destino => () => { window.focus(); if (destino) irADestinoAviso(destino); else togglePanelNotificaciones(null, true); };
    if (nuevas.length > MAXIMO_AVISOS_NAVEGADOR) {
        const urgentes = nuevas.filter(aviso => aviso.nivel === "urgente").length;
        const resumen = new Notification(`${plural(nuevas.length, "aviso nuevo", "avisos nuevos")} en Control de oxígeno`, {
            body: urgentes ? `${plural(urgentes, "urgente")}. Abra el sistema para revisarlos.` : "Abra el sistema para revisarlos.",
            tag: "ccss-resumen"
        });
        resumen.onclick = enfocar(null);
    } else {
        nuevas.forEach(aviso => {
            const notificacion = new Notification(`${aviso.etiqueta} · ${aviso.titulo}`, { body: aviso.detalle, tag: aviso.id });
            notificacion.onclick = enfocar(aviso.destino);
        });
    }
    sessionStorage.setItem("ccss_notificaciones_emitidas", JSON.stringify([...new Set([...emitidas, ...nuevas.map(a => a.id)])].slice(-300)));
}
