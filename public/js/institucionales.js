function mostrarInstitucional(seccion = "resumen") {
    seccionInstitucionalActiva = seccion;
    ubicacionInstitucionalSeleccionada = null;
    const submenu = document.getElementById("submenuInstitucional");
    submenu?.classList.remove("hidden");
    document.getElementById("flechaMenuInstitucional")?.classList.add("rotate-180");
    mostrarVista("institucionales");
    renderInstitucionales();
}

function contarCilindrosInstitucionales(tipo = null) {
    const grupos = tipo ? [ubicacionesInstitucionales[tipo] || []] : Object.values(ubicacionesInstitucionales);
    return grupos.flat().reduce((total, ubicacion) => total + (ubicacion.cilindros?.length || 0), 0);
}

function abrirModalUbicacionInstitucional(tipo = null, id = null) {
    const tiposValidos = ["ebais", "ambulancias", "emergencias", "manifold"];
    const tipoInicial = tiposValidos.includes(tipo)
        ? tipo
        : (tiposValidos.includes(seccionInstitucionalActiva) ? seccionInstitucionalActiva : "ebais");
    const ubicacion = id ? (ubicacionesInstitucionales[tipoInicial] || []).find(item => item.id === id) : null;
    ubicacionInstitucionalEnEdicion = ubicacion ? { tipo: tipoInicial, id } : null;

    document.getElementById("tituloModalUbicacionInstitucional").textContent = ubicacion ? "Editar ubicación" : "Nueva ubicación";
    document.getElementById("botonGuardarUbicacionInstitucional").textContent = ubicacion ? "Guardar cambios" : "Guardar ubicación";
    const selectorTipo = document.getElementById("ubicacionInstitucionalTipo");
    selectorTipo.value = tipoInicial;
    selectorTipo.disabled = Boolean(ubicacion);
    document.getElementById("ubicacionInstitucionalNombre").value = ubicacion?.nombre || "";
    document.getElementById("ubicacionInstitucionalSubtitulo").value = ubicacion?.subtitulo || "Área de Salud Naranjo";
    document.getElementById("ubicacionInstitucionalResponsable").value = ubicacion
        ? (tipoInicial === "ambulancias" ? (ubicacion.choferResponsable || ubicacion.responsable || "") : (ubicacion.responsable || ""))
        : "";
    document.getElementById("ubicacionInstitucionalTelefono").value = ubicacion?.telefono || "";
    document.getElementById("ubicacionInstitucionalMinimo").value = Number.isFinite(Number(ubicacion?.minimo)) ? Number(ubicacion.minimo) : 1;

    const modal = document.getElementById("modalUbicacionInstitucional");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function cerrarModalUbicacionInstitucional() {
    const modal = document.getElementById("modalUbicacionInstitucional");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    ubicacionInstitucionalEnEdicion = null;
    document.getElementById("ubicacionInstitucionalTipo").disabled = false;
}

function crearEstructuraUbicacionInstitucional(tipo, datos) {
    const base = {
        id: `${tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nombre: datos.nombre,
        subtitulo: datos.subtitulo,
        responsable: datos.responsable || "Pendiente de asignar",
        telefono: datos.telefono || "No registrado",
        ubicacion: datos.ubicacion || "Área de Salud Naranjo",
        minimo: datos.minimo,
        frecuencia: datos.frecuencia,
        cilindros: [],
        detallesCilindros: [],
        responsableCilindro: null,
        historial: [],
        ultimaInspeccion: null,
        estado: "Sin cilindros asignados"
    };
    if (tipo === "ebais") Object.assign(base, { cilindroActual: null, reguladorPrestado: false, reguladorTipo: null, reguladorSerie: null });
    if (tipo === "ambulancias") Object.assign(base, { choferResponsable: datos.responsable || null });
    if (tipo === "manifold") Object.assign(base, { bancoActivo: "Sin definir", bancoIzquierdo: [], bancoDerecho: [] });
    return base;
}

function guardarUbicacionInstitucional() {
    const esEdicion = Boolean(ubicacionInstitucionalEnEdicion);
    const tipo = ubicacionInstitucionalEnEdicion?.tipo || document.getElementById("ubicacionInstitucionalTipo").value;
    const ubicacionActual = ubicacionInstitucionalEnEdicion
        ? ubicacionesInstitucionales[tipo].find(item => item.id === ubicacionInstitucionalEnEdicion.id)
        : null;
    const datos = {
        nombre: document.getElementById("ubicacionInstitucionalNombre").value.trim(),
        subtitulo: document.getElementById("ubicacionInstitucionalSubtitulo").value.trim(),
        responsable: document.getElementById("ubicacionInstitucionalResponsable").value.trim(),
        telefono: document.getElementById("ubicacionInstitucionalTelefono").value.trim(),
        ubicacion: ubicacionActual?.ubicacion || "Área de Salud Naranjo",
        minimo: Math.max(0, Number(document.getElementById("ubicacionInstitucionalMinimo").value) || 0),
        frecuencia: ubicacionActual?.frecuencia || (tipo === "ebais" ? "Semanal" : "Diaria")
    };
    if (!datos.nombre) {
        alert("Debe ingresar el nombre de la ubicación.");
        return;
    }
    const duplicado = (ubicacionesInstitucionales[tipo] || []).some(item =>
        item.nombre.trim().toLowerCase() === datos.nombre.toLowerCase() && item.id !== ubicacionInstitucionalEnEdicion?.id
    );
    if (duplicado) {
        alert("Ya existe una ubicación con ese nombre dentro de la categoría seleccionada.");
        return;
    }

    if (ubicacionInstitucionalEnEdicion) {
        const ubicacion = ubicacionesInstitucionales[tipo].find(item => item.id === ubicacionInstitucionalEnEdicion.id);
        if (!ubicacion) return;
        Object.assign(ubicacion, datos);
        if (tipo === "ambulancias") ubicacion.choferResponsable = datos.responsable || ubicacion.choferResponsable || null;
    } else {
        ubicacionesInstitucionales[tipo].push(crearEstructuraUbicacionInstitucional(tipo, datos));
    }

    seccionInstitucionalActiva = tipo;
    ubicacionInstitucionalSeleccionada = null;
    guardarDatos();
    cerrarModalUbicacionInstitucional();
    renderInstitucionales();
    alert(esEdicion ? "Ubicación actualizada correctamente." : "Ubicación registrada correctamente.");
}

async function eliminarUbicacionInstitucional(tipo, id) {
    const ubicacion = (ubicacionesInstitucionales[tipo] || []).find(item => item.id === id);
    if (!ubicacion) return;
    const cilindrosAsociados = new Set([...(ubicacion.cilindros || []), ...(ubicacion.bancoIzquierdo || []), ...(ubicacion.bancoDerecho || [])]);
    if (ubicacion.cilindroActual) cilindrosAsociados.add(ubicacion.cilindroActual);
    if (cilindrosAsociados.size) {
        alert(`No se puede eliminar ${ubicacion.nombre} porque tiene cilindros asignados. Registre primero su retiro o cambio.`);
        return;
    }
    const movimientos = ubicacion.historial?.length || 0;
    const confirmado = await confirmarEliminacion({
        titulo: "¿Eliminar ubicación?",
        nombre: ubicacion.nombre,
        detalle: movimientos ? `También se eliminará su historial de ${movimientos} movimiento(s).` : "La ubicación no tiene movimientos registrados."
    });
    if (!confirmado) return;
    ubicacionesInstitucionales[tipo] = ubicacionesInstitucionales[tipo].filter(item => item.id !== id);
    if (ubicacionInstitucionalSeleccionada === id) ubicacionInstitucionalSeleccionada = null;
    guardarDatos();
    renderInstitucionales();
    alert("Ubicación eliminada correctamente.");
}

function renderInstitucionales() {
    const contenedor = document.getElementById("contenidoInstitucional");
    if (!contenedor) return;

    document.querySelectorAll(".tabinstitucional").forEach(boton => {
        const activo = boton.dataset.tabinstitucional === seccionInstitucionalActiva;
        boton.classList.toggle("activo", activo);
    });
    document.querySelectorAll(".subinstitucional").forEach(boton => {
        const activo = boton.dataset.subinstitucional === seccionInstitucionalActiva;
        boton.classList.toggle("activo", activo);
    });

    if (seccionInstitucionalActiva === "resumen") {
        renderResumenInstitucional(contenedor);
        return;
    }
    if (ubicacionInstitucionalSeleccionada) {
        renderDetalleInstitucional(contenedor);
        return;
    }
    renderListadoInstitucional(contenedor, seccionInstitucionalActiva);
}

function renderResumenInstitucional(contenedor) {
    const categorias = [
        { tipo: "ebais", icono: iconoSVG("hospital"), titulo: "EBAIS", fondo: "bg-blue-100", descripcion: `${ubicacionesInstitucionales.ebais.length} establecimientos` },
        { tipo: "ambulancias", icono: iconoSVG("ambulance"), titulo: "Ambulancias", fondo: "bg-emerald-100", descripcion: `${ubicacionesInstitucionales.ambulancias.length} unidades móviles` },
        { tipo: "emergencias", icono: iconoSVG("siren"), titulo: "Emergencias", fondo: "bg-rose-100", descripcion: `${ubicacionesInstitucionales.emergencias.length} ubicaciones` },
        { tipo: "manifold", icono: iconoSVG("gauge"), titulo: "Manifold", fondo: "bg-violet-100", descripcion: `${ubicacionesInstitucionales.manifold.length} sistemas` }
    ];
    const totalUbicaciones = Object.values(ubicacionesInstitucionales).flat().length;
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="card p-5 border-2 border-slate-200"><p class="text-xs font-black uppercase text-slate-500">Ubicaciones registradas</p><p class="text-3xl font-black text-slate-900 mt-2">${totalUbicaciones}</p></div>
            <div class="card p-5 border-2 border-slate-200"><p class="text-xs font-black uppercase text-slate-500">Cilindros asignados</p><p class="text-3xl font-black text-blue-700 mt-2">${contarCilindrosInstitucionales()}</p></div>
            <div class="card p-5 border-2 border-amber-200 bg-amber-50"><p class="text-xs font-black uppercase text-amber-700">Pendientes de configurar</p><p class="text-3xl font-black text-amber-800 mt-2">${totalUbicaciones}</p></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            ${categorias.map(item => `
                <button onclick="mostrarInstitucional('${item.tipo}')" class="card p-6 text-left border-2 border-slate-200 hover:border-blue-400 hover:-translate-y-1 transition-all group">
                    <div class="w-12 h-12 rounded-2xl ${item.fondo} flex items-center justify-center text-2xl mb-4">${item.icono}</div>
                    <h4 class="text-xl font-black text-slate-900">${item.titulo}</h4>
                    <p class="text-sm font-bold text-slate-500 mt-1">${item.descripcion}</p>
                    <div class="mt-5 pt-4 border-t border-slate-200 flex justify-between text-sm"><span class="text-slate-500">Cilindros</span><strong class="text-slate-900">${contarCilindrosInstitucionales(item.tipo)}</strong></div>
                    <p class="mt-3 text-sm font-extrabold text-blue-600 group-hover:text-blue-800">Ver ubicaciones <svg class="icono" aria-hidden="true"><use href="img/iconos.svg#arrow-right"></use></svg></p>
                </button>
            `).join("")}
        </div>
        `;
}

function renderListadoInstitucional(contenedor, tipo) {
    const configuracion = {
        ebais: { titulo: "EBAIS", icono: iconoSVG("hospital"), descripcion: "Establecimientos y cilindros de respaldo" },
        ambulancias: { titulo: "Ambulancias", icono: iconoSVG("ambulance"), descripcion: "Cilindro principal y respaldo por unidad" },
        emergencias: { titulo: "Emergencias", icono: iconoSVG("siren"), descripcion: "Cilindros por área, carro de paro o estación" },
        manifold: { titulo: "Manifold", icono: iconoSVG("gauge"), descripcion: "Bancos activos, reservas y controles de presión" }
    }[tipo];
    const ubicaciones = ubicacionesInstitucionales[tipo] || [];
    contenedor.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
            <div><p class="text-xs font-black uppercase tracking-wider text-blue-600">${configuracion.descripcion}</p><h4 class="text-2xl font-black text-slate-900 mt-1">${configuracion.icono} ${configuracion.titulo}</h4><p class="text-sm text-slate-500 mt-1">${ubicaciones.length} ubicación(es) registrada(s)</p></div>
            <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto"><input id="buscarInstitucional" oninput="filtrarTarjetasInstitucionales(this.value)" placeholder="Buscar ubicación..." class="w-full md:w-72 border-2 border-slate-300 rounded-xl px-4 py-3 bg-white font-semibold"><button onclick="abrirModalUbicacionInstitucional('${tipo}')" class="px-5 py-3 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl font-extrabold whitespace-nowrap">+ Nueva ubicación</button></div>
        </div>
        <div id="rejillaInstitucional" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            ${ubicaciones.map(ubicacion => tarjetaUbicacionInstitucional(tipo, ubicacion, configuracion.icono)).join("")}
        </div>`;
}

function tarjetaUbicacionInstitucional(tipo, ubicacion, icono) {
    const cantidad = ubicacion.cilindros?.length || 0;
    const cilindroActual = tipo === "ebais" && ubicacion.cilindroActual
        ? cilindros.find(c => c.numero === ubicacion.cilindroActual)
        : null;
    const estado = tipo === "ebais"
        ? (cilindroActual ? badgeVigenciaEbais(cilindroActual, true) : '<span class="badge badge-gray">Sin cilindro</span>')
        : ["ambulancias", "emergencias", "manifold"].includes(tipo)
            ? badgeEstadoAmbulancia(ubicacion)
            : '<span class="badge badge-yellow">Por configurar</span>';
    return `<article class="tarjeta-institucional card p-5 border-2 border-slate-200 hover:border-blue-400 transition-colors" data-busqueda="${textoSeguro((ubicacion.nombre + " " + ubicacion.subtitulo).toLowerCase())}">
        <div class="flex items-start justify-between gap-3"><div class="flex gap-3"><div class="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-xl">${icono}</div><div><h5 class="font-black text-slate-900">${textoSeguro(ubicacion.nombre)}</h5><p class="text-xs font-semibold text-slate-500 mt-0.5">${textoSeguro(ubicacion.subtitulo)}</p></div></div>${estado}</div>
        <div class="grid grid-cols-2 gap-3 my-5"><div class="bg-slate-50 rounded-xl p-3"><p class="text-[10px] font-black uppercase text-slate-400">${tipo === "ambulancias" ? "Cilindros" : "Cilindro actual"}</p><p class="text-xl font-black text-slate-900">${tipo === "ebais" ? (ubicacion.cilindroActual || "—") : cantidad}</p></div><div class="bg-slate-50 rounded-xl p-3"><p class="text-[10px] font-black uppercase text-slate-400">Cambios</p><p class="text-xl font-black text-slate-900">${(tipo === "ebais" || tipo === "ambulancias") ? (ubicacion.historial?.length || 0) : ubicacion.minimo}</p></div></div>
        <div class="space-y-2 text-sm"><p class="flex justify-between gap-3"><span class="text-slate-500">Responsable</span><strong class="text-slate-700 text-right">${textoSeguro(tipo === "ebais" ? (ubicacion.responsableCilindro || "Sin asignar") : tipo === "ambulancias" ? (ubicacion.choferResponsable || "Sin asignar") : ubicacion.responsable)}</strong></p></div>
        <div class="grid grid-cols-3 gap-2 mt-5"><button onclick="abrirDetalleInstitucional('${tipo}', '${ubicacion.id}')" class="col-span-3 py-2.5 rounded-xl bg-slate-900 hover:bg-blue-700 text-white font-extrabold text-sm transition-colors">Ver información completa</button><button onclick="abrirModalUbicacionInstitucional('${tipo}', '${ubicacion.id}')" class="col-span-2 py-2.5 rounded-xl bg-amber-50 border-2 border-amber-200 text-amber-800 font-extrabold text-sm">Editar</button><button onclick="eliminarUbicacionInstitucional('${tipo}', '${ubicacion.id}')" class="py-2.5 rounded-xl bg-red-50 border-2 border-red-200 text-red-700 font-extrabold text-sm">Eliminar</button></div>
    </article>`;
}

function badgeEstadoAmbulancia(ambulancia) {
    const asignados = (ambulancia.cilindros || []).map(numero => cilindros.find(c => c.numero === numero)).filter(Boolean);
    if (!asignados.length) return '<span class="badge badge-gray">Sin cilindros</span>';
    const estados = asignados.map(calcularVigencia).filter(Boolean);
    if (estados.some(v => v.estado === "vencido_fisico" || v.estado === "cambio")) return '<span class="badge badge-red">Cambio requerido</span>';
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    if (estados.some(v => Math.ceil((v.cambio - hoy) / 86400000) <= 30)) return '<span class="badge badge-yellow">Cambio próximo</span>';
    return '<span class="badge badge-green">Vigente</span>';
}

function filtrarTarjetasInstitucionales(valor) {
    const filtro = String(valor || "").toLowerCase();
    document.querySelectorAll(".tarjeta-institucional").forEach(tarjeta => tarjeta.classList.toggle("hidden", !tarjeta.dataset.busqueda.includes(filtro)));
}

function abrirDetalleInstitucional(tipo, id) {
    seccionInstitucionalActiva = tipo;
    ubicacionInstitucionalSeleccionada = id;
    renderInstitucionales();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function volverAListadoInstitucional() {
    ubicacionInstitucionalSeleccionada = null;
    renderInstitucionales();
}

function renderDetalleInstitucional(contenedor) {
    const tipo = seccionInstitucionalActiva;
    const ubicacion = (ubicacionesInstitucionales[tipo] || []).find(item => item.id === ubicacionInstitucionalSeleccionada);
    if (!ubicacion) return volverAListadoInstitucional();
    if (["ebais", "ambulancias", "emergencias", "manifold"].includes(tipo)) {
        renderDetalleEbais(contenedor, ubicacion, tipo);
        return;
    }
    const esManifold = tipo === "manifold";
    contenedor.innerHTML = `
        <button onclick="volverAListadoInstitucional()" class="mb-4 text-blue-700 hover:text-blue-900 font-extrabold text-sm"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#arrow-left"></use></svg> Volver al listado</button>
        <div class="card border-2 border-slate-200 overflow-hidden">
            <div class="bg-slate-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"><div><span class="text-xs font-black uppercase tracking-wider text-blue-300">Expediente institucional</span><h4 class="text-2xl font-black mt-1">${ubicacion.nombre}</h4><p class="text-slate-300 text-sm mt-1">${ubicacion.subtitulo}</p></div><div class="flex gap-2"><button onclick="mostrarPopup('La edición de ubicaciones se habilitará en la siguiente etapa.')" class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-sm">Editar ubicación</button><button onclick="mostrarPopup('El flujo de asignación se conectará con la bodega de cilindros llenos en la siguiente etapa.')" class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm">+ Asignar cilindro</button></div></div>
            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                    ${datoDetalle("Responsable", ubicacion.responsable)}${datoDetalle("Cantidad mínima", `${ubicacion.minimo} cilindros`)}
                </div>
                ${esManifold ? renderBancosManifold(ubicacion) : ""}
                <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    <div class="xl:col-span-2 border-2 border-slate-200 rounded-2xl overflow-hidden"><div class="p-4 bg-slate-50 border-b border-slate-200 flex justify-between"><div><h5 class="font-black text-slate-900">Cilindros actuales</h5><p class="text-xs text-slate-500">Equipos instalados o de reserva</p></div><span class="badge badge-blue">${ubicacion.cilindros.length} asignados</span></div><div class="p-10 text-center text-slate-400"><div class="text-3xl mb-2"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#cylinder"></use></svg></div><p class="font-bold">Aún no hay cilindros asignados</p><p class="text-sm mt-1">Aquí aparecerán el número, función, presión, estado y próxima fecha de cambio.</p></div></div>
                    <div class="border-2 border-slate-200 rounded-2xl overflow-hidden"><div class="p-4 bg-slate-50 border-b border-slate-200"><h5 class="font-black text-slate-900">Última inspección</h5></div><div class="p-6"><p class="text-sm text-slate-500">No se han registrado inspecciones.</p><button onclick="mostrarPopup('El formulario de inspección se habilitará en la siguiente etapa.')" class="w-full mt-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-sm">Registrar inspección</button></div></div>
                </div>
                <div class="mt-5 border-2 border-slate-200 rounded-2xl p-5"><h5 class="font-black text-slate-900">Historial de movimientos</h5><p class="text-sm text-slate-500 mt-2">Aquí se registrarán asignaciones, reemplazos, retiros, inspecciones y anomalías de esta ubicación.</p></div>
            </div>
        </div>`;
}

function datoDetalle(etiqueta, valor) {
    return `<div class="bg-slate-50 border border-slate-200 rounded-xl p-4"><p class="text-[10px] font-black uppercase tracking-wider text-slate-400">${etiqueta}</p><p class="font-extrabold text-slate-800 mt-1">${valor}</p></div>`;
}

function renderBancosManifold(ubicacion) {
    return `<div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-5"><div class="border-2 border-blue-200 bg-blue-50 rounded-2xl p-5"><div class="flex justify-between"><h5 class="font-black text-blue-950">Banco izquierdo</h5><span class="badge badge-gray">Sin definir</span></div><p class="text-sm text-blue-800 mt-3">Cilindros conectados: <strong>${ubicacion.bancoIzquierdo.length}</strong></p><p class="text-sm text-blue-800 mt-1">Presión: <strong>No registrada</strong></p></div><div class="border-2 border-violet-200 bg-violet-50 rounded-2xl p-5"><div class="flex justify-between"><h5 class="font-black text-violet-950">Banco derecho</h5><span class="badge badge-gray">Sin definir</span></div><p class="text-sm text-violet-800 mt-3">Cilindros conectados: <strong>${ubicacion.bancoDerecho.length}</strong></p><p class="text-sm text-violet-800 mt-1">Presión: <strong>No registrada</strong></p></div></div>`;
}

function badgeVigenciaEbais(cilindro, compacto = false) {
    if (!cilindro) return '<span class="badge badge-gray">Sin cilindro</span>';
    const vigencia = calcularVigencia(cilindro);
    if (!vigencia) return '<span class="badge badge-gray">Sin fecha</span>';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dias = Math.ceil((vigencia.cambio - hoy) / 86400000);
    if (vigencia.estado === "vencido_fisico") return `<span class="badge badge-red">${compacto ? "Vencido" : `Vencimiento físico: ${formatearFecha(cilindro.vencimiento)}`}</span>`;
    if (vigencia.estado === "cambio") return `<span class="badge badge-red">${compacto ? "Cambio requerido" : `Cambio requerido desde ${formatearFecha(cilindro.fechaCambio)}`}</span>`;
    if (dias <= 30) return `<span class="badge badge-yellow">${compacto ? `Cambiar en ${dias} días` : `Próximo a cambio: ${formatearFecha(cilindro.fechaCambio)} (${dias} días)`}</span>`;
    return `<span class="badge badge-green">${compacto ? "Vigente" : `Cambiar el ${formatearFecha(cilindro.fechaCambio)}`}</span>`;
}

function textoSeguro(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[caracter]);
}

function tamanoCilindro(cilindro) {
    if (!cilindro) return "No indicado";
    if (cilindro.tamano === "Grande" || cilindro.tamano === "Pequeño") return cilindro.tamano;
    const tipo = String(cilindro.tipo || "").toLowerCase();
    if (tipo.includes("220")) return "Grande";
    if (tipo.includes("30")) return "Pequeño";
    return "No indicado";
}

function renderDetalleEbais(contenedor, ebais, tipo = "ebais") {
    const nombresSeccion = { ebais: "los EBAIS", ambulancias: "las ambulancias", emergencias: "Emergencias", manifold: "Manifold" };
    const numeroPrincipal = ebais.cilindroActual || (ebais.cilindros || [])[0] || null;
    const cilindro = numeroPrincipal ? cilindros.find(c => c.numero === numeroPrincipal) : null;
    const regulador = ebais.reguladorPrestado
        ? `${textoSeguro(ebais.reguladorTipo || "Tipo no indicado")} · Serie: ${textoSeguro(ebais.reguladorSerie || "No registrada")}`
        : "Sin regulador registrado";
    const historial = [...(ebais.historial || [])].sort((a, b) => {
        const fechaB = new Date(b.fecha || `${b.fechaCambio}T00:00:00`).getTime() || 0;
        const fechaA = new Date(a.fecha || `${a.fechaCambio}T00:00:00`).getTime() || 0;
        return fechaB - fechaA;
    });
    contenedor.innerHTML = `
        <button onclick="volverAListadoInstitucional()" class="mb-4 text-blue-700 hover:text-blue-900 font-extrabold text-sm"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#arrow-left"></use></svg> Volver a ${nombresSeccion[tipo] || "Cilindros institucionales"}</button>
        <div class="card p-5 sm:p-6 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div><p class="encabezado-vista-seccion">Expediente institucional</p><h4 class="text-2xl font-black text-slate-900 mt-0.5">${textoSeguro(ebais.nombre)}</h4><p class="text-slate-500 text-sm mt-1">Control de cilindro, regulador e historial de cambios</p></div>
            <div class="flex flex-wrap gap-2"><button onclick="abrirModalUbicacionInstitucional('${tipo}', '${ebais.id}')" class="boton boton-secundario"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#pencil"></use></svg> Editar ubicación</button><button onclick="abrirCambioEbais('${ebais.id}', '${tipo}')" class="boton boton-primario"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#refresh-cw"></use></svg> ${cilindro ? "Registrar nuevo cambio" : "Registrar instalación"}</button></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
            <div class="md:col-span-2 card p-6 border-2 ${cilindro ? "border-emerald-300" : "border-slate-200"}">
                <div class="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-5"><div><p class="text-xs font-black uppercase tracking-wider text-slate-500">Cilindro instalado actualmente</p><h5 class="text-3xl font-black text-slate-900 mt-1">${cilindro ? textoSeguro(cilindro.numero) : "Sin cilindro"}</h5></div>${badgeVigenciaEbais(cilindro)}</div>
                ${cilindro ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${datoDetalle("Tipo", textoSeguro(cilindro.tipo))}${datoDetalle("Fecha de recepción del proveedor", formatearFecha(cilindro.fechaRecepcion))}${datoDetalle("Vencimiento de etiqueta", formatearFecha(cilindro.vencimiento))}${datoDetalle("Fecha programada de cambio", formatearFecha(cilindro.fechaCambio))}</div>` : `<div class="py-7 text-center text-slate-400"><p class="font-bold">No se ha registrado una instalación.</p><p class="text-sm mt-1">Seleccione “Registrar instalación” para asignar un cilindro lleno.</p></div>`}
                ${(ebais.cilindros || []).length > 1 ? `<div class="mt-4 pt-4 border-t border-slate-200"><p class="text-xs font-black uppercase text-slate-500 mb-2">Otros cilindros instalados</p><div class="flex flex-wrap gap-2">${ebais.cilindros.filter(numero => numero !== numeroPrincipal).map(numero => { const otro = cilindros.find(c => c.numero === numero); return `<span class="badge badge-blue">${textoSeguro(numero)} · ${otro ? textoSeguro(otro.tipo) : "Tipo no disponible"}</span>`; }).join("")}</div></div>` : ""}
            </div>
            <div class="card p-6 border-2 border-blue-200 bg-blue-50"><p class="text-xs font-black uppercase tracking-wider text-blue-700">Responsable del cilindro</p><div class="text-3xl mt-3"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#user"></use></svg></div><p class="font-black text-slate-900 mt-3">${textoSeguro(ebais.responsableCilindro || "Sin responsable asignado")}</p><p class="text-xs text-slate-500 mt-3">Responsable actual registrado en el último movimiento.</p></div>
            <div class="card p-6 border-2 border-amber-200 bg-amber-50"><p class="text-xs font-black uppercase tracking-wider text-amber-700">Regulador instalado</p><div class="text-3xl mt-3"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#gauge"></use></svg></div><p class="font-black text-slate-900 mt-3">${regulador}</p><button onclick="abrirReguladorEbais('${ebais.id}', '${tipo}')" class="w-full mt-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm">Editar información</button></div>
        </div>
        <div class="card border-2 border-slate-200 overflow-hidden">
            <div class="p-5 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between"><div><h5 class="text-xl font-black text-slate-900">Historial de cilindros</h5><p class="text-sm text-slate-500 mt-1">Registro cronológico de instalaciones y cambios</p></div><span class="badge badge-blue">${historial.length} movimientos</span></div>
            <div class="p-5 space-y-4">${historial.length ? historial.map((registro, indice) => tarjetaHistorialEbais(registro, historial.length - indice)).join("") : `<div class="py-10 text-center text-slate-400"><div class="text-3xl mb-2"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#clipboard-list"></use></svg></div><p class="font-bold">No hay movimientos registrados.</p></div>`}</div>
        </div>`;
}

function tarjetaHistorialEbais(registro, numero) {
    if (Array.isArray(registro.detalles) && registro.detalles.length > 1) {
        return `<article class="border-2 border-slate-200 rounded-2xl overflow-hidden"><div class="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2"><div><span class="text-xs font-black text-blue-300">MOVIMIENTO #${numero}</span><p class="font-extrabold">${textoSeguro(registro.tipoMovimiento)} · ${registro.detalles.length} cilindros</p></div><span class="text-sm font-bold">${formatearFecha(registro.fechaCambio || registro.fecha)}</span></div><div class="p-5 space-y-3">${registro.detalles.map((detalle, i) => `<div class="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4"><div><p class="text-xs font-black uppercase text-slate-400">Cilindro ${i + 1}</p><p class="font-extrabold text-blue-700">${textoSeguro(detalle.cilindroInstalado)}</p></div><div><p class="text-xs font-black uppercase text-slate-400">Retirado</p><p class="font-bold text-slate-700">${textoSeguro(detalle.cilindroRetirado || "Ninguno")}</p></div><div><p class="text-xs font-black uppercase text-slate-400">Responsable</p><p class="font-bold text-slate-700">${textoSeguro(detalle.responsableCilindro)}</p></div><div><p class="text-xs font-black uppercase text-slate-400">Regulador</p><p class="font-bold text-slate-700">${detalle.reguladorPrestado ? `${textoSeguro(detalle.reguladorTipo)} · ${textoSeguro(detalle.reguladorSerie || "Sin serie")}` : "Sin regulador"}</p></div></div>`).join("")}<div class="pt-3 text-sm text-slate-600"><strong>Instalación:</strong> ${textoSeguro(registro.funcionarioInstalacion)} · <strong>Administrativo:</strong> ${textoSeguro(registro.funcionarioAdministrativo || "No indicado")}<p class="mt-1"><strong>Observaciones:</strong> ${textoSeguro(registro.observaciones || "Sin observaciones")}</p></div></div></article>`;
    }
    const tieneRegulador = registro.reguladorPrestado ? `${textoSeguro(registro.reguladorTipo || "Tipo no indicado")} · Serie: ${textoSeguro(registro.reguladorSerie || "No registrada")}` : "Sin regulador";
    return `<article class="border-2 border-slate-200 rounded-2xl overflow-hidden"><div class="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2"><div><span class="text-xs font-black text-blue-300">MOVIMIENTO #${numero}</span><p class="font-extrabold">${textoSeguro(registro.tipoMovimiento)}</p></div><span class="text-sm font-bold">${formatearFecha(registro.fechaCambio || registro.fecha)}</span></div><div class="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"><div><p class="text-xs font-black uppercase text-slate-400">Cilindro retirado</p><p class="font-extrabold text-slate-800 mt-1">${textoSeguro(registro.cilindroRetirado || "Ninguno")}</p></div><div><p class="text-xs font-black uppercase text-slate-400">Cilindro instalado</p><p class="font-extrabold text-blue-700 mt-1">${textoSeguro(registro.cilindroInstalado)}</p><p class="text-xs text-slate-500">${textoSeguro(registro.tipoCilindro || "")}</p></div><div><p class="text-xs font-black uppercase text-slate-400">Regulador</p><p class="font-bold text-slate-700 mt-1">${tieneRegulador}</p></div><div><p class="text-xs font-black uppercase text-slate-400">Próximo cambio</p><p class="font-extrabold text-slate-800 mt-1">${formatearFecha(registro.fechaProgramadaCambio)}</p></div></div><div class="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><div class="bg-slate-50 rounded-xl p-3"><p class="font-black text-slate-500 text-xs uppercase">Responsables</p><p class="mt-1 text-slate-700"><strong>A cargo del cilindro:</strong> ${textoSeguro(registro.responsableCilindro || "No indicado")}</p><p class="text-slate-700"><strong>Instalación:</strong> ${textoSeguro(registro.funcionarioInstalacion)}</p><p class="text-slate-700"><strong>Administrativo:</strong> ${textoSeguro(registro.funcionarioAdministrativo || "No indicado")}</p></div><div class="bg-slate-50 rounded-xl p-3"><p class="font-black text-slate-500 text-xs uppercase">Observaciones</p><p class="mt-1 text-slate-700">${textoSeguro(registro.observaciones || "Sin observaciones")}</p></div></div></article>`;
}

function agregarCilindroAdicionalEbais() {
    const ebais = (ubicacionesInstitucionales[tipoCambioInstitucionalActivo] || []).find(item => item.id === ubicacionInstitucionalSeleccionada);
    if (!ebais) return;
    const indice = ++contadorCilindrosAdicionalesEbais;
    const actuales = ebais.cilindros || [];
    const disponibles = cilindros.filter(c => c.estado === "Disponible");
    const contenedor = document.getElementById("cilindrosAdicionalesEbais");
    contenedor.insertAdjacentHTML("beforeend", `
        <div class="cilindro-adicional-ebais border-2 border-blue-200 bg-slate-50 rounded-2xl p-5" data-indice="${indice}">
            <div class="flex justify-between items-center mb-4"><h4 class="font-black text-slate-900">Cilindro adicional</h4><button type="button" onclick="this.closest('.cilindro-adicional-ebais').remove()" class="text-red-600 hover:text-red-800 font-bold text-sm">Quitar</button></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="block text-sm font-bold text-slate-700 mb-2">Cilindro que se retira <span class="font-normal text-slate-400">(opcional)</span></label><select data-campo="retirado" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 bg-white"><option value="">Ninguno · instalación adicional</option>${actuales.map(n => `<option value="${textoSeguro(n)}">${textoSeguro(n)}</option>`).join("")}</select></div>
                <div><label class="block text-sm font-bold text-slate-700 mb-2">Cilindro lleno que se instala *</label><select data-campo="nuevo" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 bg-white"><option value="">Seleccione...</option>${disponibles.map(c => `<option value="${textoSeguro(c.numero)}">${textoSeguro(c.numero)} · ${textoSeguro(c.tipo)}</option>`).join("")}</select></div>
                <div><label class="block text-sm font-bold text-slate-700 mb-2">Responsable del cilindro *</label><input data-campo="responsable" class="w-full border-2 border-blue-300 rounded-xl px-4 py-3 bg-white" placeholder="Nombre completo"></div>
                <div><label class="block text-sm font-bold text-slate-700 mb-2">Regulador</label><select data-campo="regulador" onchange="toggleReguladorAdicionalEbais(this)" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 bg-white"><option value="no">Sin regulador</option><option value="si">Con regulador</option></select></div>
                <div data-regulador-detalle class="hidden"><label class="block text-sm font-bold text-slate-700 mb-2">Tipo de regulador *</label><select data-campo="reguladorTipo" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 bg-white"><option value="">Seleccione...</option><option value="Rosca">Rosca</option><option value="Pin">Pin</option></select></div>
                <div data-regulador-detalle class="hidden"><label class="block text-sm font-bold text-slate-700 mb-2">Serie del regulador</label><input data-campo="reguladorSerie" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3" placeholder="Ej. REG-00125"></div>
            </div>
        </div>`);
}

function toggleReguladorAdicionalEbais(select) {
    const bloque = select.closest(".cilindro-adicional-ebais");
    bloque?.querySelectorAll("[data-regulador-detalle]").forEach(campo => campo.classList.toggle("hidden", select.value !== "si"));
}

function leerCilindrosAdicionalesEbais() {
    return [...document.querySelectorAll(".cilindro-adicional-ebais")].map(bloque => ({
        cilindroRetirado: bloque.querySelector('[data-campo="retirado"]').value || null,
        cilindroNuevo: bloque.querySelector('[data-campo="nuevo"]').value,
        responsableCilindro: bloque.querySelector('[data-campo="responsable"]').value.trim(),
        reguladorPrestado: bloque.querySelector('[data-campo="regulador"]').value === "si",
        reguladorTipo: bloque.querySelector('[data-campo="reguladorTipo"]').value,
        reguladorSerie: bloque.querySelector('[data-campo="reguladorSerie"]').value.trim()
    }));
}

function abrirCambioEbais(id, tipo = "ebais") {
    tipoCambioInstitucionalActivo = tipo;
    const ebais = (ubicacionesInstitucionales[tipo] || []).find(item => item.id === id);
    if (!ebais) return;
    ubicacionInstitucionalSeleccionada = id;
    ebais.cilindroActual = ebais.cilindroActual || (ebais.cilindros || [])[0] || null;
    contadorCilindrosAdicionalesEbais = 0;
    document.getElementById("cilindrosAdicionalesEbais").innerHTML = "";
    const cilindroActual = ebais.cilindroActual ? cilindros.find(c => c.numero === ebais.cilindroActual) : null;
    document.getElementById("tituloCambioEbais").textContent = cilindroActual ? "Registrar nuevo cambio" : "Registrar instalación inicial";
    document.getElementById("subtituloCambioEbais").textContent = ebais.nombre;
    document.getElementById("cambioEbaisTipoMovimiento").value = cilindroActual ? "Cambio de cilindro" : "Instalación inicial";
    document.getElementById("cambioEbaisFecha").value = fechaHoyLocal();
    document.getElementById("cambioEbaisCilindroAnterior").textContent = cilindroActual ? `${cilindroActual.numero} · ${cilindroActual.tipo}` : "Ninguno · instalación inicial";
    const disponibles = cilindros.filter(c => c.estado === "Disponible" && c.numero !== ebais.cilindroActual);
    document.getElementById("cambioEbaisCilindroNuevo").innerHTML = `<option value="">Seleccione...</option>${disponibles.map(c => `<option value="${textoSeguro(c.numero)}">${textoSeguro(c.numero)} · ${textoSeguro(c.tipo)}</option>`).join("")}`;
    document.getElementById("infoCilindroNuevoEbais").classList.add("hidden");
    document.getElementById("cambioEbaisRegulador").value = ebais.reguladorPrestado ? "si" : "no";
    document.getElementById("cambioEbaisReguladorTipo").value = ebais.reguladorTipo || "";
    document.getElementById("cambioEbaisReguladorSerie").value = ebais.reguladorSerie || "";
    // Los nombres se solicitan nuevamente en cada movimiento para asegurar
    // que el registro identifique a las personas que participaron ese día.
    document.getElementById("cambioEbaisResponsableCilindro").value = "";
    document.getElementById("cambioEbaisFuncionarioAdministrativo").value = "";
    document.getElementById("cambioEbaisFuncionarioInstalacion").value = "";
    document.getElementById("cambioEbaisObservaciones").value = "";
    actualizarReguladorEbais();
    const modal = document.getElementById("modalCambioEbais");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function cerrarCambioEbais() {
    const modal = document.getElementById("modalCambioEbais");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
}

function actualizarReguladorEbais() {
    const visible = document.getElementById("cambioEbaisRegulador")?.value === "si";
    document.getElementById("campoTipoReguladorEbais")?.classList.toggle("hidden", !visible);
    document.getElementById("campoSerieReguladorEbais")?.classList.toggle("hidden", !visible);
}

function abrirReguladorEbais(id, tipo = "ebais") {
    tipoCambioInstitucionalActivo = tipo;
    const ebais = (ubicacionesInstitucionales[tipo] || []).find(item => item.id === id);
    if (!ebais) return;
    ubicacionInstitucionalSeleccionada = id;
    document.getElementById("subtituloReguladorEbais").textContent = ebais.nombre;
    document.getElementById("editarEbaisRegulador").value = ebais.reguladorPrestado ? "si" : "no";
    document.getElementById("editarEbaisReguladorTipo").value = ebais.reguladorTipo || "";
    document.getElementById("editarEbaisReguladorSerie").value = ebais.reguladorSerie || "";
    document.getElementById("editarEbaisReguladorFuncionario").value = FUNCIONARIO_ACTUAL;
    actualizarCamposEditarReguladorEbais();
    const modal = document.getElementById("modalReguladorEbais");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function cerrarReguladorEbais() {
    const modal = document.getElementById("modalReguladorEbais");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
}

function actualizarCamposEditarReguladorEbais() {
    const visible = document.getElementById("editarEbaisRegulador")?.value === "si";
    document.getElementById("editarEbaisReguladorDetalles")?.classList.toggle("hidden", !visible);
}

function guardarReguladorEbais() {
    const ebais = (ubicacionesInstitucionales[tipoCambioInstitucionalActivo] || []).find(item => item.id === ubicacionInstitucionalSeleccionada);
    if (!ebais) return;
    const reguladorPrestado = document.getElementById("editarEbaisRegulador").value === "si";
    const reguladorTipo = document.getElementById("editarEbaisReguladorTipo").value;
    const reguladorSerie = document.getElementById("editarEbaisReguladorSerie").value.trim();
    const funcionario = document.getElementById("editarEbaisReguladorFuncionario").value.trim();
    if (!funcionario) {
        alert("Debe indicar el funcionario que actualiza la información del regulador.");
        return;
    }
    if (reguladorPrestado && !reguladorTipo) {
        alert("Debe seleccionar el tipo de regulador instalado.");
        return;
    }
    ebais.reguladorPrestado = reguladorPrestado;
    ebais.reguladorTipo = reguladorPrestado ? reguladorTipo : null;
    ebais.reguladorSerie = reguladorPrestado ? reguladorSerie : null;
    ebais.ultimaActualizacionRegulador = {
        fecha: new Date().toISOString(),
        funcionario
    };
    guardarDatos();
    cerrarReguladorEbais();
    renderInstitucionales();
    alert(`Información del regulador actualizada correctamente en ${ebais.nombre}.`);
}

function mostrarInfoCilindroEbais() {
    const numero = document.getElementById("cambioEbaisCilindroNuevo")?.value;
    const cilindro = cilindros.find(c => c.numero === numero);
    const panel = document.getElementById("infoCilindroNuevoEbais");
    if (!panel) return;
    if (!cilindro) {
        panel.classList.add("hidden");
        return;
    }
    panel.innerHTML = `<strong>${textoSeguro(cilindro.numero)} · ${textoSeguro(cilindro.tipo)}</strong><br>Recepción del proveedor: ${formatearFecha(cilindro.fechaRecepcion)} · Vencimiento de etiqueta: ${formatearFecha(cilindro.vencimiento)} · Cambio programado: ${formatearFecha(cilindro.fechaCambio)}`;
    panel.classList.remove("hidden");
}

function guardarCambioEbais() {
    const ebais = (ubicacionesInstitucionales[tipoCambioInstitucionalActivo] || []).find(item => item.id === ubicacionInstitucionalSeleccionada);
    if (!ebais) return;
    const tipoMovimiento = document.getElementById("cambioEbaisTipoMovimiento").value;
    const fecha = document.getElementById("cambioEbaisFecha").value;
    const numeroNuevo = document.getElementById("cambioEbaisCilindroNuevo").value;
    const responsableCilindro = document.getElementById("cambioEbaisResponsableCilindro").value.trim();
    const funcionarioAdministrativo = document.getElementById("cambioEbaisFuncionarioAdministrativo").value.trim();
    const funcionarioInstalacion = document.getElementById("cambioEbaisFuncionarioInstalacion").value.trim();
    const observaciones = document.getElementById("cambioEbaisObservaciones").value.trim();
    const reguladorPrestado = document.getElementById("cambioEbaisRegulador").value === "si";
    const reguladorTipo = document.getElementById("cambioEbaisReguladorTipo").value;
    const reguladorSerie = document.getElementById("cambioEbaisReguladorSerie").value.trim();
    const cilindroNuevo = cilindros.find(c => c.numero === numeroNuevo);
    const adicionales = leerCilindrosAdicionalesEbais();

    if (!fecha || !numeroNuevo || !responsableCilindro || !funcionarioInstalacion) {
        alert("Debe seleccionar la fecha, el cilindro lleno, el responsable que queda a cargo y el funcionario que realizó el cambio o instalación.");
        return;
    }
    if (!cilindroNuevo || cilindroNuevo.estado !== "Disponible") {
        alert("El cilindro seleccionado ya no está disponible en la bodega de llenos.");
        return;
    }
    if (reguladorPrestado && !reguladorTipo) {
        alert("Debe seleccionar el tipo de regulador instalado.");
        return;
    }
    if (adicionales.some(item => !item.cilindroNuevo || !item.responsableCilindro || (item.reguladorPrestado && !item.reguladorTipo))) {
        alert("Complete el cilindro nuevo, el responsable y, cuando corresponda, el tipo de regulador de cada cilindro adicional.");
        return;
    }
    const numerosNuevos = [numeroNuevo, ...adicionales.map(item => item.cilindroNuevo)];
    if (new Set(numerosNuevos).size !== numerosNuevos.length) {
        alert("No puede seleccionar el mismo cilindro lleno más de una vez en el movimiento.");
        return;
    }
    if (adicionales.some(item => !cilindros.some(c => c.numero === item.cilindroNuevo && c.estado === "Disponible"))) {
        alert("Uno de los cilindros adicionales ya no está disponible en la bodega de llenos.");
        return;
    }
    const retirados = [ebais.cilindroActual, ...adicionales.map(item => item.cilindroRetirado)].filter(Boolean);
    if (new Set(retirados).size !== retirados.length) {
        alert("No puede retirar el mismo cilindro más de una vez en el movimiento.");
        return;
    }

    const numeroAnterior = ebais.cilindroActual;
    let cilindrosActuales = [...(ebais.cilindros || [])];
    let detallesActuales = [...(ebais.detallesCilindros || [])];
    const cilindroAnterior = numeroAnterior ? cilindros.find(c => c.numero === numeroAnterior) : null;
    if (cilindroAnterior) {
        cilindroAnterior.estado = "Recibido";
        cilindroAnterior.pacienteId = null;
        cilindroAnterior.ubicacionInstitucionalId = null;
        cilindroAnterior.ubicacionInstitucionalTipo = null;
        cilindrosActuales = cilindrosActuales.filter(numero => numero !== numeroAnterior);
        detallesActuales = detallesActuales.filter(detalle => detalle.numero !== numeroAnterior);
    }

    if (!cilindroNuevo.fechaRecepcion) cilindroNuevo.fechaRecepcion = fecha;
    cilindroNuevo.fechaCambio = calcularFechaCambioPorRecepcion(cilindroNuevo.fechaRecepcion);
    cilindroNuevo.fechaAlertaCambio = cilindroNuevo.fechaCambio;
    cilindroNuevo.fechaEntrega = fecha;
    cilindroNuevo.estado = "Asignado";
    cilindroNuevo.pacienteId = null;
    cilindroNuevo.ubicacionInstitucionalId = ebais.id;
    cilindroNuevo.ubicacionInstitucionalTipo = tipoCambioInstitucionalActivo;

    const detallesMovimiento = [{
        cilindroRetirado: numeroAnterior || null,
        cilindroInstalado: cilindroNuevo.numero,
        tipoCilindro: cilindroNuevo.tipo,
        fechaRecepcionProveedor: cilindroNuevo.fechaRecepcion,
        fechaVencimientoEtiqueta: cilindroNuevo.vencimiento,
        fechaProgramadaCambio: cilindroNuevo.fechaCambio,
        responsableCilindro,
        reguladorPrestado,
        reguladorTipo: reguladorPrestado ? reguladorTipo : null,
        reguladorSerie: reguladorPrestado ? reguladorSerie : null
    }];
    cilindrosActuales.push(cilindroNuevo.numero);
    detallesActuales.push({ numero: cilindroNuevo.numero, responsableCilindro, reguladorPrestado, reguladorTipo: reguladorPrestado ? reguladorTipo : null, reguladorSerie: reguladorPrestado ? reguladorSerie : null });

    adicionales.forEach(item => {
        if (item.cilindroRetirado) {
            const retirado = cilindros.find(c => c.numero === item.cilindroRetirado);
            if (retirado) {
                retirado.estado = "Recibido";
                retirado.pacienteId = null;
                retirado.ubicacionInstitucionalId = null;
                retirado.ubicacionInstitucionalTipo = null;
            }
            cilindrosActuales = cilindrosActuales.filter(numero => numero !== item.cilindroRetirado);
            detallesActuales = detallesActuales.filter(detalle => detalle.numero !== item.cilindroRetirado);
        }
        const nuevo = cilindros.find(c => c.numero === item.cilindroNuevo);
        if (!nuevo.fechaRecepcion) nuevo.fechaRecepcion = fecha;
        nuevo.fechaCambio = calcularFechaCambioPorRecepcion(nuevo.fechaRecepcion);
        nuevo.fechaAlertaCambio = nuevo.fechaCambio;
        nuevo.fechaEntrega = fecha;
        nuevo.estado = "Asignado";
        nuevo.pacienteId = null;
        nuevo.ubicacionInstitucionalId = ebais.id;
        nuevo.ubicacionInstitucionalTipo = tipoCambioInstitucionalActivo;
        cilindrosActuales.push(nuevo.numero);
        detallesActuales.push({ numero: nuevo.numero, responsableCilindro: item.responsableCilindro, reguladorPrestado: item.reguladorPrestado, reguladorTipo: item.reguladorPrestado ? item.reguladorTipo : null, reguladorSerie: item.reguladorPrestado ? item.reguladorSerie : null });
        detallesMovimiento.push({
            cilindroRetirado: item.cilindroRetirado,
            cilindroInstalado: nuevo.numero,
            tipoCilindro: nuevo.tipo,
            fechaRecepcionProveedor: nuevo.fechaRecepcion,
            fechaVencimientoEtiqueta: nuevo.vencimiento,
            fechaProgramadaCambio: nuevo.fechaCambio,
            responsableCilindro: item.responsableCilindro,
            reguladorPrestado: item.reguladorPrestado,
            reguladorTipo: item.reguladorPrestado ? item.reguladorTipo : null,
            reguladorSerie: item.reguladorPrestado ? item.reguladorSerie : null
        });
    });

    ebais.cilindroActual = cilindroNuevo.numero;
    ebais.cilindros = [...new Set(cilindrosActuales)];
    ebais.detallesCilindros = detallesActuales;
    ebais.responsableCilindro = responsableCilindro;
    if (tipoCambioInstitucionalActivo === "ambulancias") ebais.choferResponsable = responsableCilindro;
    ebais.reguladorPrestado = reguladorPrestado;
    ebais.reguladorTipo = reguladorPrestado ? reguladorTipo : null;
    ebais.reguladorSerie = reguladorPrestado ? reguladorSerie : null;
    ebais.estado = "Cilindro asignado";
    ebais.historial.push({
        id: Date.now(),
        fecha: new Date(`${fecha}T12:00:00`).toISOString(),
        fechaCambio: fecha,
        tipoMovimiento,
        cilindroRetirado: numeroAnterior || null,
        cilindroInstalado: cilindroNuevo.numero,
        tipoCilindro: cilindroNuevo.tipo,
        fechaRecepcionProveedor: cilindroNuevo.fechaRecepcion,
        fechaVencimientoEtiqueta: cilindroNuevo.vencimiento,
        fechaProgramadaCambio: cilindroNuevo.fechaCambio,
        reguladorPrestado,
        reguladorTipo: reguladorPrestado ? reguladorTipo : null,
        reguladorSerie: reguladorPrestado ? reguladorSerie : null,
        responsableCilindro,
        funcionarioAdministrativo,
        funcionarioInstalacion,
        observaciones,
        detalles: detallesMovimiento
    });

    guardarDatos();
    cerrarCambioEbais();
    renderInstitucionales();
    alert(`${tipoMovimiento} registrada correctamente en ${ebais.nombre}.`);
}

function renderDetalleAmbulancia(contenedor, ambulancia, tipo = "ambulancias") {
    const actuales = (ambulancia.cilindros || []).map(numero => cilindros.find(c => c.numero === numero)).filter(Boolean);
    const historial = [...(ambulancia.historial || [])].sort((a,b) => new Date(b.fecha)-new Date(a.fecha));
    const esAmbulancia = tipo === "ambulancias";
    const etiquetaResponsable = esAmbulancia ? "Chofer responsable" : "Responsable de los cilindros";
    const responsableActual = esAmbulancia ? ambulancia.choferResponsable : ambulancia.responsableCilindro;
    contenedor.innerHTML = `<button onclick="volverAListadoInstitucional()" class="mb-4 text-blue-700 font-extrabold text-sm"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#arrow-left"></use></svg> Volver a ambulancias</button><div class="card p-5 sm:p-6 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4"><div><p class="encabezado-vista-seccion">Expediente de ambulancia</p><h4 class="text-2xl font-black text-slate-900 mt-0.5">${textoSeguro(ambulancia.nombre)}</h4><p class="text-slate-500 text-sm">${textoSeguro(ambulancia.subtitulo)}</p></div><button onclick="abrirMovimientoAmbulancia('${ambulancia.id}')" class="boton boton-primario"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#refresh-cw"></use></svg> Registrar instalación o cambio</button></div><div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">${datoDetalle("Chofer responsable", textoSeguro(ambulancia.choferResponsable || "Sin asignar"))}${datoDetalle("Cilindros instalados", actuales.length)}${datoDetalle("Movimientos registrados", historial.length)}</div><div class="card border-2 border-slate-200 overflow-hidden mb-5"><div class="p-5 bg-slate-50 border-b"><h5 class="text-xl font-black">Cilindros y reguladores actuales</h5></div><div class="p-5">${actuales.length ? `<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">${actuales.map(c => {const d=(ambulancia.detallesCilindros||[]).find(x=>x.numero===c.numero)||{};return `<div class="border-2 border-slate-200 rounded-xl p-4"><div class="flex justify-between gap-2"><div><p class="text-xs font-black uppercase text-slate-400">Cilindro</p><p class="text-xl font-black text-slate-900">${textoSeguro(c.numero)}</p></div>${badgeVigenciaEbais(c,true)}</div><p class="text-sm mt-3"><strong>Tipo:</strong> ${textoSeguro(c.tipo)}</p><p class="text-sm"><strong>Vencimiento:</strong> ${formatearFecha(c.vencimiento)}</p><p class="text-sm"><strong>Cambio programado:</strong> ${formatearFecha(c.fechaCambio)}</p><p class="text-sm"><strong>Regulador:</strong> ${d.reguladorPrestado ? `${textoSeguro(d.reguladorTipo)} · ${textoSeguro(d.reguladorSerie||"Sin serie")}` : "No"}</p></div>`}).join("")}</div>` : `<p class="py-8 text-center text-slate-400 font-bold">No hay cilindros instalados.</p>`}</div></div><div class="card border-2 border-slate-200 overflow-hidden"><div class="p-5 bg-slate-50 border-b"><h5 class="text-xl font-black">Historial de movimientos</h5></div><div class="p-5 space-y-4">${historial.length ? historial.map((m,i)=>`<article class="border-2 border-slate-200 rounded-xl overflow-hidden"><div class="bg-slate-900 text-white px-4 py-3 flex justify-between"><strong>Movimiento #${historial.length-i}</strong><span>${formatearFecha(m.fechaMovimiento)}</span></div><div class="p-4"><p class="text-sm"><strong>Chofer responsable:</strong> ${textoSeguro(m.choferResponsable)}</p><p class="text-sm"><strong>Funcionario de mantenimiento:</strong> ${textoSeguro(m.funcionarioMantenimiento)}</p><div class="mt-3 space-y-2">${m.detalles.map(d=>`<div class="bg-slate-50 rounded-lg p-3 text-sm"><strong>Instalado:</strong> ${textoSeguro(d.cilindroInstalado)} · <strong>Retirado:</strong> ${textoSeguro(d.cilindroRetirado||"Ninguno")} · <strong>Regulador:</strong> ${d.reguladorPrestado?`${textoSeguro(d.reguladorTipo)} / ${textoSeguro(d.reguladorSerie||"Sin serie")}`:"No"}</div>`).join("")}</div></div></article>`).join("") : `<p class="py-8 text-center text-slate-400">No hay movimientos registrados.</p>`}</div></div>`;
    if (!esAmbulancia) {
        contenedor.innerHTML = contenedor.innerHTML
            .replaceAll("ambulancia", tipo === "manifold" ? "manifold" : "servicio")
            .replace("Chofer responsable", etiquetaResponsable)
            .replace(`abrirMovimientoAmbulancia('${ambulancia.id}')`, `abrirMovimientoAmbulancia('${ambulancia.id}', '${tipo}')`);
    }
}

function abrirMovimientoAmbulancia(id, tipo = "ambulancias") {
    tipoMovimientoInstitucionalActivo = tipo;
    const ambulancia=ubicacionesInstitucionales[tipo].find(a=>a.id===id); if(!ambulancia)return;
    ubicacionInstitucionalSeleccionada=id;
    document.getElementById("subtituloMovimientoAmbulancia").textContent=ambulancia.nombre;
    document.getElementById("fechaMovimientoAmbulancia").value=fechaHoyLocal();
    document.getElementById("funcionarioMovimientoAmbulancia").value=FUNCIONARIO_ACTUAL;
    document.getElementById("choferMovimientoAmbulancia").value=(tipo === "ambulancias" ? ambulancia.choferResponsable : ambulancia.responsableCilindro)||"";
    const etiquetaResponsable = document.getElementById("choferMovimientoAmbulancia").previousElementSibling;
    if (etiquetaResponsable) etiquetaResponsable.textContent = tipo === "ambulancias" ? "Chofer responsable *" : "Responsable de los cilindros *";
    document.querySelector('label[for="choferMovimientoAmbulancia"]')?.removeAttribute("for");
    document.getElementById("observacionesMovimientoAmbulancia").value="";
    document.getElementById("filasMovimientoAmbulancia").innerHTML="";
    agregarFilaMovimientoAmbulancia(true);
    const modal=document.getElementById("modalMovimientoAmbulancia");modal.classList.remove("hidden");modal.classList.add("flex");
}
function cerrarMovimientoAmbulancia(){const m=document.getElementById("modalMovimientoAmbulancia");m?.classList.add("hidden");m?.classList.remove("flex")}
function ubicacionMovimientoActiva(){return ubicacionesInstitucionales[tipoMovimientoInstitucionalActivo].find(x=>x.id===ubicacionInstitucionalSeleccionada)}
function agregarFilaMovimientoAmbulancia(esPrincipal=false){const a=ubicacionMovimientoActiva();if(!a)return;const actuales=a.cilindros||[];const disponibles=cilindros.filter(c=>c.estado==="Disponible");const retiradoPrincipal=esPrincipal&&actuales.length?actuales[0]:"";document.getElementById("filasMovimientoAmbulancia").insertAdjacentHTML("beforeend",`<div class="fila-ambulancia border-2 border-blue-200 bg-slate-50 rounded-2xl p-5"><div class="flex justify-between mb-4"><div><p class="text-xs font-black uppercase text-blue-600">${esPrincipal?"Cilindro principal":"Cilindro adicional"}</p><h4 class="font-black text-slate-900">Instalación o cambio</h4></div>${esPrincipal?"":`<button type="button" onclick="this.closest('.fila-ambulancia').remove()" class="text-red-600 font-bold">Quitar</button>`}</div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-bold mb-2">Cilindro que se retira</label><select data-campo="retirado" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 bg-white"><option value="">Ninguno · instalación</option>${actuales.map(n=>`<option value="${textoSeguro(n)}" ${n===retiradoPrincipal?"selected":""}>${textoSeguro(n)}</option>`).join("")}</select></div><div><label class="block text-sm font-bold mb-2">Cilindro lleno que se instala *</label><select data-campo="nuevo" onchange="mostrarInfoCilindroAmbulancia(this)" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 bg-white"><option value="">Seleccione...</option>${disponibles.map(c=>`<option value="${textoSeguro(c.numero)}">${textoSeguro(c.numero)} · ${textoSeguro(c.tipo)}</option>`).join("")}</select></div><div data-info-cilindro class="hidden md:col-span-2 border-2 border-blue-200 bg-blue-50 rounded-xl p-3 text-sm text-blue-900"></div><div><label class="block text-sm font-bold mb-2">¿Cuenta con regulador?</label><select data-campo="regulador" onchange="toggleReguladorFilaAmbulancia(this)" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 bg-white"><option value="no">No</option><option value="si">Sí</option></select></div><div data-reg class="hidden"><label class="block text-sm font-bold mb-2">Tipo de regulador *</label><select data-campo="tipoReg" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 bg-white"><option value="">Seleccione...</option><option>Rosca</option><option>Pin</option></select></div><div data-reg class="hidden"><label class="block text-sm font-bold mb-2">Serie del regulador</label><input data-campo="serieReg" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3"></div></div></div>`)}
function toggleReguladorFilaAmbulancia(select){const fila=select.closest('.fila-ambulancia');fila?.querySelectorAll('[data-reg]').forEach(campo=>campo.classList.toggle('hidden',select.value!=="si"))}
function mostrarInfoCilindroAmbulancia(select){const fila=select.closest('.fila-ambulancia'),panel=fila?.querySelector('[data-info-cilindro]'),c=cilindros.find(item=>item.numero===select.value);if(!panel)return;if(!c){panel.classList.add('hidden');return}panel.innerHTML=`<strong>${textoSeguro(c.numero)} · ${textoSeguro(c.tipo)}</strong><br>Recepción: ${formatearFecha(c.fechaRecepcion)} · Vencimiento: ${formatearFecha(c.vencimiento)} · Cambio programado: ${formatearFecha(c.fechaCambio)}`;panel.classList.remove('hidden')}
function guardarMovimientoAmbulancia(){const tipo=tipoMovimientoInstitucionalActivo,a=ubicacionMovimientoActiva();if(!a)return;const fecha=document.getElementById("fechaMovimientoAmbulancia").value,funcionario=document.getElementById("funcionarioMovimientoAmbulancia").value.trim(),chofer=document.getElementById("choferMovimientoAmbulancia").value.trim(),obs=document.getElementById("observacionesMovimientoAmbulancia").value.trim();const filas=[...document.querySelectorAll(".fila-ambulancia")].map(f=>({cilindroRetirado:f.querySelector('[data-campo="retirado"]').value||null,cilindroInstalado:f.querySelector('[data-campo="nuevo"]').value,reguladorPrestado:f.querySelector('[data-campo="regulador"]').value==="si",reguladorTipo:f.querySelector('[data-campo="tipoReg"]').value,reguladorSerie:f.querySelector('[data-campo="serieReg"]').value.trim()}));if(!fecha||!funcionario||!chofer||!filas.length||filas.some(f=>!f.cilindroInstalado||(f.reguladorPrestado&&!f.reguladorTipo))){alert("Complete la fecha, el funcionario, el chofer y la información de cada cilindro.");return}const nuevos=filas.map(f=>f.cilindroInstalado),retirados=filas.map(f=>f.cilindroRetirado).filter(Boolean);if(new Set(nuevos).size!==nuevos.length||new Set(retirados).size!==retirados.length){alert("No puede seleccionar el mismo cilindro más de una vez.");return}if(filas.some(f=>!cilindros.some(c=>c.numero===f.cilindroInstalado&&c.estado==="Disponible"))){alert("Uno de los cilindros ya no está disponible.");return}let actuales=[...(a.cilindros||[])],detalles=[...(a.detallesCilindros||[])];filas.forEach(f=>{if(f.cilindroRetirado){const r=cilindros.find(c=>c.numero===f.cilindroRetirado);if(r){r.estado="Recibido";r.ubicacionInstitucionalId=null;r.ubicacionInstitucionalTipo=null}actuales=actuales.filter(n=>n!==f.cilindroRetirado);detalles=detalles.filter(d=>d.numero!==f.cilindroRetirado)}const n=cilindros.find(c=>c.numero===f.cilindroInstalado);if(!n.fechaRecepcion)n.fechaRecepcion=fecha;n.fechaCambio=calcularFechaCambioPorRecepcion(n.fechaRecepcion);n.fechaEntrega=fecha;n.estado="Asignado";n.pacienteId=null;n.ubicacionInstitucionalId=a.id;n.ubicacionInstitucionalTipo=tipo==="ambulancias"?"ambulancia":tipo;actuales.push(n.numero);detalles.push({numero:n.numero,reguladorPrestado:f.reguladorPrestado,reguladorTipo:f.reguladorPrestado?f.reguladorTipo:null,reguladorSerie:f.reguladorPrestado?f.reguladorSerie:null});f.tipoCilindro=n.tipo;f.fechaRecepcion=n.fechaRecepcion;f.vencimiento=n.vencimiento;f.fechaProgramadaCambio=n.fechaCambio});a.cilindros=[...new Set(actuales)];a.detallesCilindros=detalles;a.choferResponsable=chofer;if(tipo!=="ambulancias")a.responsableCilindro=chofer;a.historial.push({id:Date.now(),fecha:new Date().toISOString(),fechaMovimiento:fecha,funcionarioMantenimiento:funcionario,choferResponsable:chofer,observaciones:obs,detalles:filas});guardarDatos();cerrarMovimientoAmbulancia();renderInstitucionales();alert(`Movimiento registrado correctamente en ${a.nombre}.`)}
