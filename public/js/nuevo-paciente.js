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

    const pacienteEditado = pacientes.find(p => p.id === pacienteEnEdicionId);
    const actuales = pacienteEditado?.cilindros || [];
    const opciones = cilindros.filter(c =>
        c.estado === "Disponible" || actuales.includes(c.numero) || c.numero === numeroSeleccionado
    );

    contenedor.insertAdjacentHTML("beforeend", `
        <div class="fila-cilindro-paciente border-2 border-blue-200 bg-blue-50/50 rounded-xl p-4">
            <div class="flex items-start justify-between gap-3 mb-3">
                <div><p class="font-black text-blue-950">Cilindro en préstamo</p><p class="text-xs text-slate-500">Seleccione un cilindro lleno disponible.</p></div>
                <button type="button" onclick="this.closest('.fila-cilindro-paciente').remove(); actualizarMensajesEquiposPaciente()" class="text-red-600 font-extrabold text-sm">Quitar</button>
            </div>
            <select data-campo="cilindro" onchange="mostrarDetalleCilindroPacienteFormulario(this)" class="w-full border-2 border-blue-300 rounded-xl px-4 py-3 bg-white font-bold">
                <option value="">Seleccione un cilindro...</option>
                ${opciones.map(c => `<option value="${textoSeguro(c.numero)}" ${c.numero === numeroSeleccionado ? "selected" : ""}>${textoSeguro(c.numero)} · ${tamanoCilindro(c)} · ${textoSeguro(c.tipo)}${actuales.includes(c.numero) ? " · Actualmente asignado" : ""}</option>`).join("")}
            </select>
            <div data-detalle class="mt-3 text-xs font-bold text-blue-900"></div>
        </div>`);

    const fila = contenedor.lastElementChild;
    mostrarDetalleCilindroPacienteFormulario(fila.querySelector('[data-campo="cilindro"]'));
    actualizarMensajesEquiposPaciente();
}

function mostrarDetalleCilindroPacienteFormulario(select) {
    const cilindro = cilindros.find(c => c.numero === select.value);
    const detalle = select.closest(".fila-cilindro-paciente")?.querySelector("[data-detalle]");
    if (!detalle) return;
    detalle.textContent = cilindro
        ? `Tipo: ${cilindro.tipo} · Recibido del proveedor: ${formatearFecha(cilindro.fechaRecepcion)} · Cambio programado: ${formatearFecha(cilindro.fechaCambio)}`
        : "";
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

function abrirNuevoPaciente() {

    pacienteEnEdicionId = null;
    document.getElementById("tituloModalPaciente").textContent = "Nuevo paciente";
    document.getElementById("subtituloModalPaciente").textContent = "Registrar paciente en el sistema.";
    document.getElementById("botonGuardarPaciente").textContent = "Guardar";
    document.getElementById("nuevoPacienteNombre").value = "";
    document.getElementById("nuevoPacienteCedula").value = "";
    document.getElementById("nuevoPacienteReferencia").value = "";
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

}

function editarPaciente(id) {
    const paciente = pacientes.find(p => p.id === id);
    if (!paciente) return;

    pacienteEnEdicionId = id;
    document.getElementById("tituloModalPaciente").textContent = "Editar paciente";
    document.getElementById("subtituloModalPaciente").textContent = "Actualice los datos del paciente.";
    document.getElementById("botonGuardarPaciente").textContent = "Guardar cambios";
    document.getElementById("nuevoPacienteNombre").value = paciente.nombre || "";
    document.getElementById("nuevoPacienteCedula").value = paciente.cedula || "";
    document.getElementById("nuevoPacienteReferencia").value = paciente.referencia || "";
    document.getElementById("filasCilindrosPaciente").innerHTML = "";
    document.getElementById("filasReguladoresPaciente").innerHTML = "";
    (paciente.cilindros || []).forEach(numero => agregarCilindroPacienteFormulario(numero));
    (paciente.reguladores || []).forEach(reg => agregarReguladorPacienteFormulario(reg));
    actualizarMensajesEquiposPaciente();
    document.getElementById("modalPaciente").classList.remove("hidden");
    document.getElementById("modalPaciente").classList.add("flex");
}

function guardarPaciente() {
    if (pacienteEnEdicionId === null) {
        guardarNuevoPaciente();
        return;
    }

    const paciente = pacientes.find(p => p.id === pacienteEnEdicionId);
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

    paciente.nombre = nombre;
    paciente.cedula = cedula;
    paciente.referencia = referencia;
    actualizarAsignacionCilindrosPaciente(paciente, equipos.cilindros);
    paciente.reguladores = equipos.reguladores;
    sincronizarReguladorLegacy(paciente);
    guardarDatos();
    cerrarModalPaciente();
    renderPacientes();
    alert("Paciente actualizado correctamente.");
}

async function eliminarPaciente(id) {
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


function guardarNuevoPaciente() {

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


    const nuevoPaciente = {

        id: Date.now(),

        nombre: nombre,

        cedula: cedula,

        referencia: referencia,

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
