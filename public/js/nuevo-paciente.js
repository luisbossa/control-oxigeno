/* =========================================================
   NUEVO PACIENTE
========================================================= */

function actualizarMensajesEquiposPaciente() {
    const tieneCilindros = document.querySelectorAll("#filasCilindrosPaciente .fila-cilindro-paciente").length > 0;
    const tieneReguladores = document.querySelectorAll("#filasReguladoresPaciente .fila-regulador-paciente").length > 0;
    document.getElementById("sinCilindrosPacienteFormulario")?.classList.toggle("hidden", tieneCilindros);
    document.getElementById("sinReguladoresPacienteFormulario")?.classList.toggle("hidden", tieneReguladores);
}

function agregarCilindroPacienteFormulario(numeroSeleccionado = "") {
    const contenedor = document.getElementById("filasCilindrosPaciente");
    if (!contenedor) return;

    const seleccionado = cilindros.find(c => c.numero === numeroSeleccionado);

    contenedor.insertAdjacentHTML("beforeend", `
        <div class="fila-cilindro-paciente border-2 border-blue-200 bg-blue-50/50 rounded-xl p-4">
            <div class="flex items-start justify-between gap-3 mb-3">
                <div><p class="font-black text-blue-950">Cilindro en préstamo</p><p class="text-xs text-slate-500">Digite el número para buscar un cilindro lleno disponible.</p></div>
                <button type="button" onclick="this.closest('.fila-cilindro-paciente').remove(); actualizarMensajesEquiposPaciente()" class="text-red-600 font-extrabold text-sm">Quitar</button>
            </div>
            <div class="buscador-cilindro">
                <svg class="icono buscador-cilindro-icono" aria-hidden="true"><use href="img/iconos.svg#search"></use></svg>
                <input type="text" data-buscador-cilindro value="${seleccionado ? textoSeguro(etiquetaCilindroBuscador(seleccionado)) : ""}"
                    placeholder="Buscar por número de cilindro..." autocomplete="off" spellcheck="false"
                    role="combobox" aria-autocomplete="list" aria-expanded="false" aria-label="Buscar cilindro"
                    oninput="filtrarBuscadorCilindro(this, true)" onfocus="filtrarBuscadorCilindro(this)" onclick="filtrarBuscadorCilindro(this)"
                    onkeydown="teclaBuscadorCilindro(event, this)" onblur="cerrarBuscadorCilindro(this)"
                    class="w-full border-2 border-blue-300 rounded-xl pl-11 pr-4 py-3 bg-white font-bold">
                <input type="hidden" data-campo="cilindro" value="${seleccionado ? textoSeguro(seleccionado.numero) : ""}">
                <ul class="buscador-cilindro-lista" role="listbox" hidden></ul>
            </div>
            <div data-detalle class="mt-3 text-xs font-bold text-blue-900"></div>
        </div>`);

    const fila = contenedor.lastElementChild;
    mostrarDetalleCilindroPacienteFormulario(fila.querySelector('[data-campo="cilindro"]'));
    actualizarMensajesEquiposPaciente();
    if (!numeroSeleccionado) fila.querySelector("[data-buscador-cilindro]").focus();
}

function mostrarDetalleCilindroPacienteFormulario(campo) {
    const cilindro = cilindros.find(c => c.numero === campo.value);
    const detalle = campo.closest(".fila-cilindro-paciente")?.querySelector("[data-detalle]");
    if (!detalle) return;
    detalle.textContent = cilindro
        ? `Tipo: ${cilindro.tipo} · Recibido del proveedor: ${formatearFecha(cilindro.fechaRecepcion)} · Cambio programado: ${formatearFecha(cilindro.fechaCambio)}`
        : "";
}

/* ---------------------------------------------------------
   Buscador de cilindros del formulario
   Muestra los cilindros llenos disponibles (y los que ya tiene
   el paciente en edición) que coinciden con lo digitado.
--------------------------------------------------------- */

function etiquetaCilindroBuscador(cilindro) {
    return `${cilindro.numero} · ${tamanoCilindro(cilindro)} · ${cilindro.tipo}`;
}

function opcionesBuscadorCilindro(entrada) {
    const actuales = pacientes.find(p => p.id === pacienteEnEdicionId)?.cilindros || [];
    const propio = entrada.parentElement.querySelector('[data-campo="cilindro"]').value;
    // Un cilindro elegido en otra fila no se vuelve a ofrecer.
    const usados = [...document.querySelectorAll('#filasCilindrosPaciente [data-campo="cilindro"]')]
        .map(campo => campo.value).filter(numero => numero && numero !== propio);
    return cilindros.filter(c =>
        (c.estado === "Disponible" || actuales.includes(c.numero) || c.numero === propio) && !usados.includes(c.numero)
    );
}

function filtrarBuscadorCilindro(entrada, escribiendo = false) {
    const campo = entrada.parentElement.querySelector('[data-campo="cilindro"]');
    const lista = entrada.parentElement.querySelector(".buscador-cilindro-lista");
    // Al escribir se descarta la selección anterior hasta elegir otra.
    if (escribiendo && campo.value) {
        campo.value = "";
        mostrarDetalleCilindroPacienteFormulario(campo);
    }

    const termino = (campo.value ? "" : entrada.value).trim().toLowerCase();
    const actuales = pacientes.find(p => p.id === pacienteEnEdicionId)?.cilindros || [];
    const resultados = opcionesBuscadorCilindro(entrada)
        .filter(c => !termino || String(c.numero).toLowerCase().includes(termino) || String(c.tipo || "").toLowerCase().includes(termino))
        .sort((a, b) => Number(!String(a.numero).toLowerCase().startsWith(termino)) - Number(!String(b.numero).toLowerCase().startsWith(termino))
            || String(a.numero).localeCompare(String(b.numero), "es", { numeric: true }));

    lista.innerHTML = resultados.length
        ? resultados.slice(0, 50).map((c, indice) => `
            <li role="option" data-numero="${textoSeguro(c.numero)}" class="buscador-cilindro-opcion${indice === 0 ? " activa" : ""}"
                onmousedown="event.preventDefault(); elegirCilindroBuscador(this)">
                <strong>${textoSeguro(c.numero)}</strong>
                <span>${textoSeguro(tamanoCilindro(c))} · ${textoSeguro(c.tipo)}${actuales.includes(c.numero) ? " · Actualmente asignado" : ""}</span>
            </li>`).join("")
        : `<li class="buscador-cilindro-vacio">No hay cilindros disponibles${termino ? ` que coincidan con "${textoSeguro(termino)}"` : ""}.</li>`;
    lista.hidden = false;
    entrada.setAttribute("aria-expanded", "true");
}

function elegirCilindroBuscador(opcion) {
    const contenedor = opcion.closest(".buscador-cilindro");
    const cilindro = cilindros.find(c => c.numero === opcion.dataset.numero);
    const entrada = contenedor.querySelector("[data-buscador-cilindro]");
    const campo = contenedor.querySelector('[data-campo="cilindro"]');
    campo.value = cilindro?.numero || "";
    entrada.value = cilindro ? etiquetaCilindroBuscador(cilindro) : "";
    contenedor.querySelector(".buscador-cilindro-lista").hidden = true;
    entrada.setAttribute("aria-expanded", "false");
    mostrarDetalleCilindroPacienteFormulario(campo);
}

function teclaBuscadorCilindro(event, entrada) {
    const lista = entrada.parentElement.querySelector(".buscador-cilindro-lista");
    const opciones = [...lista.querySelectorAll(".buscador-cilindro-opcion")];
    const actual = opciones.findIndex(opcion => opcion.classList.contains("activa"));

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (lista.hidden) return filtrarBuscadorCilindro(entrada);
        if (!opciones.length) return;
        const siguiente = (actual + (event.key === "ArrowDown" ? 1 : -1) + opciones.length) % opciones.length;
        opciones.forEach((opcion, i) => opcion.classList.toggle("activa", i === siguiente));
        opciones[siguiente].scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter") {
        // Enter elige el resaltado y no envía el formulario.
        event.preventDefault();
        if (!lista.hidden && opciones[Math.max(actual, 0)]) elegirCilindroBuscador(opciones[Math.max(actual, 0)]);
    } else if (event.key === "Escape" && !lista.hidden) {
        event.stopPropagation();
        lista.hidden = true;
        entrada.setAttribute("aria-expanded", "false");
    }
}

function cerrarBuscadorCilindro(entrada) {
    const contenedor = entrada.parentElement;
    const campo = contenedor.querySelector('[data-campo="cilindro"]');
    // Si se digitó el número exacto sin elegirlo de la lista, se toma igual.
    if (!campo.value && entrada.value.trim()) {
        const exacto = opcionesBuscadorCilindro(entrada).find(c => String(c.numero).toLowerCase() === entrada.value.trim().toLowerCase());
        if (exacto) {
            campo.value = exacto.numero;
            entrada.value = etiquetaCilindroBuscador(exacto);
            mostrarDetalleCilindroPacienteFormulario(campo);
        }
    }
    contenedor.querySelector(".buscador-cilindro-lista").hidden = true;
    entrada.setAttribute("aria-expanded", "false");
}

function agregarReguladorPacienteFormulario(regulador = {}) {
    const contenedor = document.getElementById("filasReguladoresPaciente");
    if (!contenedor) return;
    contenedor.insertAdjacentHTML("beforeend", `
        <div class="fila-regulador-paciente border-2 border-amber-200 bg-amber-50/50 rounded-xl p-4">
            <div class="flex items-start justify-between gap-3 mb-3"><p class="font-black text-amber-950">Regulador en préstamo</p><button type="button" onclick="this.closest('.fila-regulador-paciente').remove(); actualizarMensajesEquiposPaciente()" class="text-red-600 font-extrabold text-sm">Quitar</button></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label class="block text-xs font-black text-slate-600 uppercase mb-1">Tipo *</label><select data-campo="tipo" class="w-full border-2 border-amber-300 rounded-xl px-4 py-3 bg-white"><option value="">Seleccione...</option><option value="Rosca" ${regulador.tipo === "Rosca" ? "selected" : ""}>Rosca</option><option value="Pin" ${regulador.tipo === "Pin" ? "selected" : ""}>Pin</option></select></div>
                <div><label class="block text-xs font-black text-slate-600 uppercase mb-1">Número de serie</label><input data-campo="serie" value="${textoSeguro(regulador.serie || "")}" class="w-full border-2 border-amber-300 rounded-xl px-4 py-3 bg-white" placeholder="Ej. REG-00125"></div>
            </div>
        </div>`);
    actualizarMensajesEquiposPaciente();
}

function obtenerEquiposPacienteFormulario() {
    const cilindrosSeleccionados = [...document.querySelectorAll('#filasCilindrosPaciente [data-campo="cilindro"]')]
        .map(select => select.value).filter(Boolean);
    const filasReguladores = [...document.querySelectorAll("#filasReguladoresPaciente .fila-regulador-paciente")];
    const reguladores = filasReguladores.map(fila => ({
        tipo: fila.querySelector('[data-campo="tipo"]').value,
        serie: fila.querySelector('[data-campo="serie"]').value.trim()
    }));

    if (cilindrosSeleccionados.length !== document.querySelectorAll("#filasCilindrosPaciente .fila-cilindro-paciente").length) {
        alert("Seleccione un cilindro en cada fila agregada.");
        return null;
    }
    if (new Set(cilindrosSeleccionados).size !== cilindrosSeleccionados.length) {
        alert("No puede asignar el mismo cilindro más de una vez.");
        return null;
    }
    if (reguladores.some(reg => !reg.tipo)) {
        alert("Seleccione el tipo de cada regulador agregado.");
        return null;
    }
    const pacienteEditado = pacientes.find(p => p.id === pacienteEnEdicionId);
    const actuales = pacienteEditado?.cilindros || [];
    const noDisponibles = cilindrosSeleccionados.filter(numero => {
        const cilindro = cilindros.find(c => c.numero === numero);
        return !cilindro || (cilindro.estado !== "Disponible" && !actuales.includes(numero));
    });
    if (noDisponibles.length) {
        alert(`Los siguientes cilindros ya no están disponibles: ${noDisponibles.join(", ")}.`);
        return null;
    }
    return { cilindros: cilindrosSeleccionados, reguladores };
}

function sincronizarReguladorLegacy(paciente) {
    paciente.reguladorPrestado = (paciente.reguladores || []).length > 0;
    paciente.reguladorTipo = paciente.reguladores?.[0]?.tipo || null;
    paciente.reguladorSerie = paciente.reguladores?.[0]?.serie || null;
}

function actualizarAsignacionCilindrosPaciente(paciente, nuevosNumeros, anterioresForzados = null) {
    const anteriores = anterioresForzados === null ? [...(paciente.cilindros || [])] : anterioresForzados;
    const retirados = anteriores.filter(numero => !nuevosNumeros.includes(numero));
    const agregados = nuevosNumeros.filter(numero => !anteriores.includes(numero));

    retirados.forEach(numero => {
        const cilindro = cilindros.find(c => c.numero === numero);
        if (cilindro && cilindro.pacienteId === paciente.id) {
            cilindro.estado = "Recibido";
            cilindro.pacienteId = null;
        }
    });

    agregados.forEach(numero => {
        const cilindro = cilindros.find(c => c.numero === numero);
        if (!cilindro) return;
        cilindro.estado = "Asignado";
        cilindro.pacienteId = paciente.id;
        cilindro.fechaEntrega = fechaHoyLocal();
    });

    paciente.cilindros = [...new Set(nuevosNumeros)];
    paciente.cilindroActual = paciente.cilindros.at(-1) || null;
}

/* Datos que se imprimen en el contrato (boleta de préstamo). */
const CAMPOS_PRESTAMO = {
    direccion: "nuevoPacienteDireccion",
    telefono: "nuevoPacienteTelefono",
    retiraNombre: "nuevoPacienteRetiraNombre",
    retiraCedula: "nuevoPacienteRetiraCedula",
    retiraTelefono: "nuevoPacienteRetiraTelefono",
    entregaNombre: "nuevoPacienteEntregaNombre",
    fechaRetiroPrestamo: "nuevoPacienteFechaRetiro"
};

function cargarDatosPrestamoFormulario(paciente = {}) {
    Object.entries(CAMPOS_PRESTAMO).forEach(([campo, id]) => {
        document.getElementById(id).value = paciente[campo] || "";
    });
    if (!paciente.fechaRetiroPrestamo) document.getElementById(CAMPOS_PRESTAMO.fechaRetiroPrestamo).value = fechaHoyLocal();
}

function leerDatosPrestamoFormulario() {
    return Object.fromEntries(Object.entries(CAMPOS_PRESTAMO).map(([campo, id]) => [campo, document.getElementById(id).value.trim()]));
}

// Equipo con el que salió el paciente la primera vez (lo usa el contrato).
function equiposPrestamoDe(equipos) {
    return {
        cilindros: equipos.cilindros.map(numero => {
            const cilindro = cilindros.find(c => c.numero === numero);
            return { numero, tamano: tamanoCilindro(cilindro), tipo: cilindro?.tipo || "" };
        }),
        reguladores: equipos.reguladores.map(regulador => ({ ...regulador }))
    };
}

function abrirNuevoPaciente() {
    if (!exigirPermisoEdicion()) return;

    pacienteEnEdicionId = null;
    document.getElementById("tituloModalPaciente").textContent = "Nuevo paciente";
    document.getElementById("subtituloModalPaciente").textContent = "Registrar paciente en el sistema.";
    document.getElementById("botonGuardarPaciente").textContent = "Guardar";
    document.getElementById("nuevoPacienteNombre").value = "";
    document.getElementById("nuevoPacienteCedula").value = "";
    document.getElementById("nuevoPacienteReferencia").value = "";
    prepararDocumentoReferencia();
    cargarDatosPrestamoFormulario();
    document.getElementById("filasCilindrosPaciente").innerHTML = "";
    document.getElementById("filasReguladoresPaciente").innerHTML = "";
    actualizarMensajesEquiposPaciente();

    document
        .getElementById("modalPaciente")
        .classList.remove("hidden");

    document
        .getElementById("modalPaciente")
        .classList.add("flex");

}


function cerrarModalPaciente() {

    document
        .getElementById("modalPaciente")
        .classList.add("hidden");

    document
        .getElementById("modalPaciente")
        .classList.remove("flex");

    pacienteEnEdicionId = null;
    descartarArchivoNuevoReferencia();

}

function editarPaciente(id) {
    if (!exigirPermisoEdicion()) return;
    const paciente = pacientes.find(p => p.id === id);
    if (!paciente) return;

    pacienteEnEdicionId = id;
    document.getElementById("tituloModalPaciente").textContent = "Editar paciente";
    document.getElementById("subtituloModalPaciente").textContent = "Actualice los datos del paciente.";
    document.getElementById("botonGuardarPaciente").textContent = "Guardar cambios";
    document.getElementById("nuevoPacienteNombre").value = paciente.nombre || "";
    document.getElementById("nuevoPacienteCedula").value = paciente.cedula || "";
    document.getElementById("nuevoPacienteReferencia").value = paciente.referencia || "";
    prepararDocumentoReferencia(paciente);
    cargarDatosPrestamoFormulario(paciente);
    document.getElementById("filasCilindrosPaciente").innerHTML = "";
    document.getElementById("filasReguladoresPaciente").innerHTML = "";
    (paciente.cilindros || []).forEach(numero => agregarCilindroPacienteFormulario(numero));
    (paciente.reguladores || []).forEach(reg => agregarReguladorPacienteFormulario(reg));
    actualizarMensajesEquiposPaciente();
    document.getElementById("modalPaciente").classList.remove("hidden");
    document.getElementById("modalPaciente").classList.add("flex");
}

// Sube la referencia adjunta (si hay) con el botón Guardar bloqueado.
async function subirReferenciaConBoton(pacienteId) {
    const boton = document.getElementById("botonGuardarPaciente");
    const texto = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Subiendo referencia...";
    try {
        return { documento: await subirDocumentoReferencia(pacienteId) };
    } catch (error) {
        mostrarPopup(`No se pudo subir la referencia médica: ${error.message}`, "error");
        return null;
    } finally {
        boton.disabled = false;
        boton.textContent = texto;
    }
}

async function guardarPaciente() {
    if (!exigirPermisoEdicion()) return;
    if (pacienteEnEdicionId === null) {
        await guardarNuevoPaciente();
        return;
    }

    const pacienteId = pacienteEnEdicionId;
    let paciente = pacientes.find(p => p.id === pacienteId);
    if (!paciente) return;
    const nombre = document.getElementById("nuevoPacienteNombre").value.trim();
    const cedula = document.getElementById("nuevoPacienteCedula").value.trim();
    const referencia = document.getElementById("nuevoPacienteReferencia").value.trim();
    const equipos = obtenerEquiposPacienteFormulario();

    if (!nombre || !cedula) {
        alert("Debe ingresar nombre e identificación.");
        return;
    }
    if (!equipos) return;
    if (pacientes.some(p => p.cedula === cedula && p.id !== paciente.id)) {
        alert("Ya existe un paciente con esa identificación.");
        return;
    }
    if (pacienteFallecido(paciente) && (equipos.cilindros.some(numero => !(paciente.cilindros || []).includes(numero)) || equipos.reguladores.length > (paciente.reguladores || []).length)) {
        alert("No se puede asignar equipo nuevo a un expediente inactivo por fallecimiento.");
        return;
    }

    const adjunto = await subirReferenciaConBoton(pacienteId);
    if (!adjunto) return;
    // Los datos pudieron refrescarse mientras se subía el archivo.
    paciente = pacientes.find(p => p.id === pacienteId);
    if (!paciente) return;
    const documentoAnterior = paciente.referenciaDocumento || null;

    paciente.nombre = nombre;
    paciente.cedula = cedula;
    paciente.referencia = referencia;
    paciente.referenciaDocumento = adjunto.documento;
    Object.assign(paciente, leerDatosPrestamoFormulario());
    actualizarAsignacionCilindrosPaciente(paciente, equipos.cilindros);
    paciente.reguladores = equipos.reguladores;
    sincronizarReguladorLegacy(paciente);
    guardarDatos();
    eliminarDocumentoReferenciaAnterior(documentoAnterior, adjunto.documento);
    cerrarModalPaciente();
    renderPacientes();
    alert("Paciente actualizado correctamente.");
}

async function eliminarPaciente(id) {
    if (!exigirPermisoEdicion()) return;
    const paciente = pacientes.find(p => p.id === id);
    if (!paciente) return;
    if ((paciente.cilindros || []).length) {
        alert(`No se puede eliminar a ${paciente.nombre} porque tiene cilindros asignados: ${paciente.cilindros.join(", ")}. Registre primero la devolución de los cilindros.`);
        return;
    }
    const historial = paciente.historial?.length || 0;
    const aviso = historial ? `Se eliminará también su historial de ${historial} intercambio(s).` : "El paciente no tiene intercambios registrados.";
    const confirmado = await confirmarEliminacion({
        titulo: "¿Eliminar paciente?",
        nombre: paciente.nombre,
        detalle: aviso
    });
    if (!confirmado) return;
    pacientes = pacientes.filter(p => p.id !== id);
    if (pacienteSeleccionado?.id === id) pacienteSeleccionado = null;
    guardarDatos();
    renderPacientes();
    alert("Paciente eliminado correctamente.");
}


async function guardarNuevoPaciente() {

    const nombre =
        document.getElementById("nuevoPacienteNombre")
        .value.trim();


    const cedula =
        document.getElementById("nuevoPacienteCedula")
        .value.trim();


    const referencia =
        document.getElementById("nuevoPacienteReferencia")
        .value.trim();

    const equipos = obtenerEquiposPacienteFormulario();


    if (!nombre || !cedula) {

        alert(
            "Debe ingresar nombre e identificación."
        );

        return;

    }


    if (!equipos) return;


    if (
        pacientes.some(
            p => p.cedula === cedula
        )
    ) {

        alert(
            "Ya existe un paciente con esa identificación."
        );

        return;

    }


    const id = Date.now();
    const adjunto = await subirReferenciaConBoton(id);
    if (!adjunto) return;

    const nuevoPaciente = {

        id,

        nombre: nombre,

        cedula: cedula,

        referencia: referencia,

        referenciaDocumento: adjunto.documento,

        ...leerDatosPrestamoFormulario(),

        equiposPrestamoInicial: equiposPrestamoDe(equipos),

        reguladores: equipos.reguladores,

        reguladorPrestado: equipos.reguladores.length > 0,

        reguladorTipo: equipos.reguladores[0]?.tipo || null,

        reguladorSerie: equipos.reguladores[0]?.serie || null,

        cilindroActual: null,

        cilindros: equipos.cilindros,

        historial: []

    };

    pacientes.push(nuevoPaciente);
    actualizarAsignacionCilindrosPaciente(nuevoPaciente, equipos.cilindros, []);


    guardarDatos();

    cerrarModalPaciente();

    document.getElementById("nuevoPacienteNombre").value = "";

    document.getElementById("nuevoPacienteCedula").value = "";

    document.getElementById("nuevoPacienteReferencia").value = "";
    document.getElementById("filasCilindrosPaciente").innerHTML = "";
    document.getElementById("filasReguladoresPaciente").innerHTML = "";


    renderPacientes();


    alert(
        "Paciente registrado correctamente."
    );

}
