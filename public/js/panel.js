/* =========================================================
   PANEL DEL DÍA
   Reúne lo que necesita atención hoy: pacientes que deben recibir
   un cilindro nuevo, existencias de llenos y servicios bajo el mínimo.
========================================================= */

const DIAS_ATENCION = 14;      // Ventana para listar cambios próximos.
const DIAS_PRONTO = 7;         // A partir de aquí el cambio se marca como "pronto".
const ORDEN_URGENCIA = { critico: 0, pronto: 1, "al-dia": 2, "sin-fecha": 3 };

function diasHastaFecha(fecha) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((fecha - hoy) / 86400000);
}

function plural(cantidad, singular, pluralTexto = singular + "s") {
    return `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`;
}

// Urgencia de un cilindro en uso, con texto para mostrar junto al color.
function urgenciaCilindro(cilindro) {
    const vigencia = calcularVigencia(cilindro);
    if (!vigencia) return { nivel: "sin-fecha", texto: "Sin fecha de cambio", dias: null };

    const dias = diasHastaFecha(vigencia.cambio);
    if (vigencia.estado === "vencido_fisico") return { nivel: "critico", texto: "Cilindro vencido", dias: Math.min(dias, -1) };
    if (dias < 0) return { nivel: "critico", texto: `Atrasado ${plural(-dias, "día")}`, dias };
    if (dias === 0) return { nivel: "critico", texto: "Cambiar hoy", dias };
    if (dias === 1) return { nivel: "pronto", texto: "Mañana", dias };
    if (dias <= DIAS_PRONTO) return { nivel: "pronto", texto: `En ${dias} días`, dias };
    return { nivel: "al-dia", texto: `En ${dias} días`, dias };
}

function etiquetaUrgencia(urgencia) {
    return `<span class="estado estado-${urgencia.nivel}">${urgencia.texto}</span>`;
}

function compararUrgencia(a, b) {
    return (ORDEN_URGENCIA[a.nivel] - ORDEN_URGENCIA[b.nivel]) || ((a.dias ?? 0) - (b.dias ?? 0));
}

// Cilindro más urgente de un paciente (para el listado de pacientes).
function urgenciaPaciente(paciente) {
    return (paciente.cilindros || [])
        .map(numero => cilindros.find(c => c.numero === numero))
        .filter(Boolean)
        .map(urgenciaCilindro)
        .sort(compararUrgencia)[0] || null;
}

function cambiosPendientesPacientes() {
    const pendientes = [];
    pacientes.forEach(paciente => (paciente.cilindros || []).forEach(numero => {
        const cilindro = cilindros.find(c => c.numero === numero);
        if (!cilindro) return;
        const urgencia = urgenciaCilindro(cilindro);
        if (urgencia.nivel !== "al-dia" || urgencia.dias <= DIAS_ATENCION) pendientes.push({ paciente, cilindro, urgencia });
    }));
    return pendientes.sort((a, b) => compararUrgencia(a.urgencia, b.urgencia));
}

function tareaProveedorDeHoy() {
    const ahora = new Date();
    const dia = ahora.getDay();
    const vacios = cilindros.filter(c => c.estado === "Recibido").length;
    if (dia === 2 || dia === 5) return `Día de entrega al proveedor: ${plural(vacios, "cilindro vacío", "cilindros vacíos")} en bodega.`;
    if (dia === 1 || dia === 4) return "Hoy se prepara el pedido al proveedor (después de las 2:00 p. m.).";
    return "";
}

/* ---------------------------------------------------------
   Secciones
--------------------------------------------------------- */

function indicadorPanel({ etiqueta, valor, detalle, tono = "" }) {
    return `<div class="indicador ${tono ? "indicador-" + tono : ""}">
        <p class="indicador-etiqueta">${etiqueta}</p>
        <p class="indicador-valor">${valor}</p>
        <p class="indicador-detalle">${detalle}</p>
    </div>`;
}

function filaPendiente({ paciente, cilindro, urgencia }) {
    return `<li class="pendiente pendiente-${urgencia.nivel}">
        <button type="button" class="pendiente-paciente" onclick="abrirPaciente(${paciente.id})">
            <span class="pendiente-nombre">${textoSeguro(paciente.nombre)}</span>
            <span class="pendiente-datos"><span class="font-mono">${textoSeguro(paciente.cedula)}</span> · Cilindro <span class="font-mono">${textoSeguro(cilindro.numero)}</span> · ${textoSeguro(cilindro.tipo || "Tipo no indicado")}</span>
        </button>
        <div class="pendiente-estado">
            ${etiquetaUrgencia(urgencia)}
            <span class="pendiente-fecha">${cilindro.fechaCambio ? formatearFecha(cilindro.fechaCambio) : "—"}</span>
        </div>
        <button type="button" class="boton boton-secundario boton-chico" onclick="intercambioDesdePanel(${paciente.id})">${iconoSVG("refresh-cw")} Registrar intercambio</button>
    </li>`;
}

// Compara, por tipo de cilindro, los llenos disponibles con los cambios que vienen.
function coberturaPorTipo(pendientes) {
    const disponibles = cilindros.filter(c => c.estado === "Disponible" && calcularVigencia(c)?.estado !== "vencido_fisico");
    const tipos = new Set([...pendientes.map(p => p.cilindro.tipo), ...disponibles.map(c => c.tipo)].filter(Boolean));
    return [...tipos].sort().map(tipo => {
        const necesarios = pendientes.filter(p => p.cilindro.tipo === tipo).length;
        const enBodega = disponibles.filter(c => c.tipo === tipo).length;
        return { tipo, necesarios, enBodega, faltan: Math.max(0, necesarios - enBodega) };
    });
}

function serviciosBajoMinimo() {
    const nombres = { ebais: "EBAIS", ambulancias: "Ambulancia", emergencias: "Emergencias", manifold: "Manifold" };
    return Object.entries(ubicacionesInstitucionales).flatMap(([tipo, lista]) => (lista || [])
        .map(u => ({ tipo, nombreTipo: nombres[tipo], ubicacion: u, actuales: (u.cilindros || []).length, minimo: Number(u.minimo) || 0 }))
        .filter(item => item.actuales < item.minimo))
        .sort((a, b) => (a.actuales - a.minimo) - (b.actuales - b.minimo));
}

function ultimosIntercambios(cantidad = 5) {
    return pacientes
        .flatMap(paciente => (paciente.historial || []).map(registro => ({ paciente, registro })))
        .filter(item => item.registro.fecha)
        .sort((a, b) => new Date(b.registro.fecha) - new Date(a.registro.fecha))
        .slice(0, cantidad);
}

/* ---------------------------------------------------------
   Render
--------------------------------------------------------- */

function renderPanel() {
    const contenedor = document.getElementById("contenidoPanel");
    if (!contenedor) return;

    const pendientes = cambiosPendientesPacientes();
    const criticos = pendientes.filter(p => p.urgencia.nivel === "critico").length;
    const pronto = pendientes.filter(p => p.urgencia.nivel === "pronto").length;
    const pacientesConOxigeno = pacientes.filter(p => (p.cilindros || []).length).length;
    const cobertura = coberturaPorTipo(pendientes);
    const llenos = cobertura.reduce((total, fila) => total + fila.enBodega, 0);
    const faltantes = cobertura.reduce((total, fila) => total + fila.faltan, 0);
    const servicios = serviciosBajoMinimo();
    const recientes = ultimosIntercambios();

    const fecha = new Date().toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" });
    const tarea = tareaProveedorDeHoy();
    document.getElementById("textoPanel").textContent = `${fecha.charAt(0).toUpperCase()}${fecha.slice(1)}.${tarea ? " " + tarea : ""}`;

    contenedor.innerHTML = `
        <div class="indicadores">
            ${indicadorPanel({ etiqueta: "Cambios atrasados o de hoy", valor: criticos, detalle: criticos ? "Atender primero: el paciente puede quedarse sin oxígeno." : "Ningún paciente con cambio atrasado.", tono: criticos ? "critico" : "ok" })}
            ${indicadorPanel({ etiqueta: `Cambios en ${DIAS_PRONTO} días`, valor: pronto, detalle: pronto ? "Coordine la entrega con el paciente." : "Sin cambios cercanos.", tono: pronto ? "pronto" : "" })}
            ${indicadorPanel({ etiqueta: "Llenos disponibles", valor: llenos, detalle: faltantes ? `Faltan ${faltantes} para los cambios de los próximos ${DIAS_ATENCION} días.` : `Alcanzan para los cambios de los próximos ${DIAS_ATENCION} días.`, tono: faltantes ? "critico" : "" })}
            ${indicadorPanel({ etiqueta: "Pacientes con oxígeno en casa", valor: pacientesConOxigeno, detalle: `${plural(pacientes.length, "paciente registrado", "pacientes registrados")}.` })}
        </div>

        <div class="panel-columnas">
            <section class="card panel-seccion panel-principal">
                <header class="panel-seccion-encabezado">
                    <div>
                        <h3 class="panel-seccion-titulo">Pacientes que requieren cambio</h3>
                        <p class="panel-seccion-texto">Atrasados y próximos ${DIAS_ATENCION} días, del más urgente al menos urgente.</p>
                    </div>
                    <button type="button" class="boton boton-secundario boton-chico" onclick="mostrarVista('pacientes')">Ver todos los pacientes</button>
                </header>
                ${pendientes.length
                    ? `<ul class="lista-pendientes">${pendientes.map(filaPendiente).join("")}</ul>`
                    : `<div class="panel-vacio">${iconoSVG("circle-check-big")}<p>Ningún paciente requiere cambio en los próximos ${DIAS_ATENCION} días.</p></div>`}
            </section>

            <div class="panel-lateral">
                <section class="card panel-seccion">
                    <h3 class="panel-seccion-titulo">Llenos para los próximos cambios</h3>
                    <p class="panel-seccion-texto">Por tipo de cilindro, sin contar los vencidos.</p>
                    ${cobertura.length ? `<table class="tabla-cobertura">
                        <thead><tr><th>Tipo</th><th>En bodega</th><th>Se necesitan</th></tr></thead>
                        <tbody>${cobertura.map(fila => `<tr class="${fila.faltan ? "cobertura-falta" : ""}">
                            <td>${textoSeguro(fila.tipo)}</td><td class="font-mono">${fila.enBodega}</td>
                            <td class="font-mono">${fila.necesarios}${fila.faltan ? ` <span class="estado estado-critico">Faltan ${fila.faltan}</span>` : ""}</td>
                        </tr>`).join("")}</tbody>
                    </table>` : `<p class="panel-vacio-texto">No hay cilindros registrados.</p>`}
                    <button type="button" class="enlace-panel" onclick="mostrarVista('cilindros')">Ir al inventario ${iconoSVG("arrow-right")}</button>
                </section>

                <section class="card panel-seccion">
                    <h3 class="panel-seccion-titulo">Servicios bajo el mínimo</h3>
                    <p class="panel-seccion-texto">${servicios.length ? `${plural(servicios.length, "ubicación", "ubicaciones")} con menos cilindros de los requeridos.` : "Todos los servicios tienen su mínimo de cilindros."}</p>
                    ${servicios.length ? `<ul class="lista-simple">${servicios.slice(0, 5).map(item => `<li>
                        <button type="button" onclick="mostrarInstitucional('${item.tipo}'); abrirDetalleInstitucional('${item.tipo}', '${item.ubicacion.id}')">
                            <span>${textoSeguro(item.ubicacion.nombre)}<small>${item.nombreTipo}</small></span>
                            <span class="font-mono">${item.actuales}/${item.minimo}</span>
                        </button></li>`).join("")}</ul>
                        ${servicios.length > 5 ? `<button type="button" class="enlace-panel" onclick="mostrarInstitucional('resumen')">Ver las ${servicios.length} ubicaciones ${iconoSVG("arrow-right")}</button>` : ""}` : ""}
                </section>

                <section class="card panel-seccion">
                    <h3 class="panel-seccion-titulo">Últimos intercambios</h3>
                    ${recientes.length ? `<ul class="lista-simple">${recientes.map(({ paciente, registro }) => `<li>
                        <button type="button" onclick="abrirPaciente(${paciente.id})">
                            <span>${textoSeguro(paciente.nombre)}<small>${new Date(registro.fecha).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" })}</small></span>
                            <span class="font-mono">${textoSeguro(registro.cilindroEntregado || "—")}</span>
                        </button></li>`).join("")}</ul>` : `<p class="panel-vacio-texto">Aún no se registran intercambios.</p>`}
                </section>
            </div>
        </div>`;
}

function intercambioDesdePanel(id) {
    pacienteSeleccionado = pacientes.find(p => p.id === id) || null;
    irAIntercambioPaciente();
}
