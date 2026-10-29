/* =========================================================
   PACIENTES
========================================================= */

// Un paciente fallecido conserva su expediente, pero queda inactivo.
function pacienteFallecido(paciente) {
    return paciente?.estadoVital === "Fallecido" ||
        (paciente?.historial || []).some(r => r.tipoMovimiento === "Devolución definitiva" && r.motivoDevolucion === "Fallecimiento");
}

// Intercambios y entregas; las devoluciones definitivas no cuentan.
function totalIntercambios(paciente) {
    return (paciente.historial || []).filter(r => r.tipoMovimiento !== "Devolución definitiva").length;
}

function renderPacientes() {

    const filtro =
        (document.getElementById("buscarPacientes")?.value || "")
        .toLowerCase();


    const filtrados = pacientes.filter(p =>
        p.nombre.toLowerCase().includes(filtro) ||
        p.cedula.toLowerCase().includes(filtro)
    );


    let html = "";


    filtrados.forEach(paciente => {

        html += `

            <tr class="border-b border-slate-100 hover:bg-slate-50">

                <td class="px-6 py-4 celda-paciente">

                    <div class="flex items-center gap-3">

                        <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                            ${iniciales(paciente.nombre)}
                        </div>

                        <div>

                            <p class="font-semibold text-slate-800">
                                ${textoSeguro(paciente.nombre)}
                                ${pacienteFallecido(paciente) ? '<span class="estado estado-sin-fecha ml-1">Fallecido · inactivo</span>' : ""}
                            </p>

                            <p class="text-xs text-slate-400">
                                Referencia: ${textoSeguro(paciente.referencia || "—")}
                            </p>

                        </div>

                    </div>

                </td>


                <td class="px-6 py-4 text-sm text-slate-600 font-mono">
                    ${textoSeguro(paciente.cedula)}
                </td>


                <td class="px-6 py-4">

                    ${(paciente.cilindros || []).length
                        ? `<div class="flex flex-wrap gap-1">${paciente.cilindros.map(numero => `<span class="badge badge-blue font-mono">${textoSeguro(numero)}</span>`).join("")}</div>`
                        : `<span class="badge badge-gray">Sin cilindro</span>`}

                </td>


                <td class="px-6 py-4">
                    ${urgenciaPaciente(paciente) ? etiquetaUrgencia(urgenciaPaciente(paciente)) : `<span class="text-xs text-slate-400">—</span>`}
                </td>


                <td class="px-6 py-4">
                    ${
                        paciente.reguladorPrestado
                        ? `<div>
                            <span class="badge badge-blue">Sí · ${textoSeguro(paciente.reguladorTipo || "Tipo no indicado")}</span>
                            <p class="text-xs text-slate-400 mt-1">Serie: ${textoSeguro(paciente.reguladorSerie || "No aplica / no registrada")}</p>
                           </div>`
                        : `<span class="badge badge-gray">No</span>`
                    }
                </td>

                <td class="px-6 py-4 text-sm text-slate-600">
                    ${totalIntercambios(paciente)}
                </td>


                <td class="px-6 py-4 text-right">
                    <div class="flex flex-nowrap items-center justify-end gap-1.5">
                        <button onclick="abrirPaciente(${paciente.id})"
                            class="text-blue-600 hover:text-blue-800 font-semibold text-sm px-2 py-1 whitespace-nowrap">
                            Ver historial <svg class="icono" aria-hidden="true"><use href="img/iconos.svg#arrow-right"></use></svg>
                        </button>
                        <button onclick="imprimirContratoPrestamoPaciente(${paciente.id})" title="Generar contrato de préstamo" aria-label="Generar contrato de préstamo"
                            class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:text-blue-900 transition-colors">
                            <svg class="icono" aria-hidden="true"><use href="img/iconos.svg#file-text"></use></svg>
                        </button>
                        <button onclick="editarPaciente(${paciente.id})" title="Editar paciente" aria-label="Editar paciente"
                            class="solo-administrador inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:text-amber-900 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20h9"/><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
                        </button>
                        <button onclick="eliminarPaciente(${paciente.id})" title="Eliminar paciente" aria-label="Eliminar paciente"
                            class="solo-administrador inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-800 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v6m4-6v6"/></svg>
                        </button>
                    </div>
                </td>

            </tr>

        `;

    });


    if (!html) {

        html = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-slate-400">
                    No se encontraron pacientes.
                </td>
            </tr>
        `;

    }


    document.getElementById("tablaPacientes").innerHTML = html;

}


/* =========================================================
   FICHA DEL PACIENTE
========================================================= */

function volverAPacientes() {

    pacienteSeleccionado = null;
    document.getElementById("view-paciente-detalle")?.classList.add("hidden-view");
    mostrarVista("pacientes");

    requestAnimationFrame(() => {
        window.scrollTo({
            top: scrollPacientesGuardado,
            behavior: "auto"
        });
    });

}


function abrirPaciente(id) {

    // Guarda la posición actual del directorio para restaurarla al regresar.
    scrollPacientesGuardado = window.scrollY || document.documentElement.scrollTop || 0;

    pacienteSeleccionado =
        pacientes.find(p => p.id === id);


    if (!pacienteSeleccionado) return;


    document.getElementById("detalleNombre").textContent =
        pacienteSeleccionado.nombre;

    document.getElementById("detalleCedula").textContent =
        "Identificación: " + pacienteSeleccionado.cedula;

    document.getElementById("detalleAvatar").textContent =
        iniciales(pacienteSeleccionado.nombre);

    const fallecido = pacienteFallecido(pacienteSeleccionado);
    const etiquetaEstado = document.getElementById("detalleEstadoPaciente");
    etiquetaEstado.textContent = fallecido ? "Fallecido · inactivo" : "Activo";
    etiquetaEstado.className = `estado ${fallecido ? "estado-sin-fecha" : "estado-al-dia"} ml-1`;
    document.getElementById("botonIntercambioPaciente").hidden = fallecido;

    document.getElementById("detalleTelefono").textContent =
        "Teléfono: " + (pacienteSeleccionado.telefono || "No registrado");

    document.getElementById("detalleDireccion").textContent =
        "Dirección: " + (pacienteSeleccionado.direccion || "No registrada");


    const cilindrosDelPaciente = (pacienteSeleccionado.cilindros || [])
        .map(numero => cilindros.find(c => c.numero === numero))
        .filter(Boolean);

    document.getElementById("detalleCilindro").innerHTML = cilindrosDelPaciente.length
        ? cilindrosDelPaciente.map(c => `<div class="rounded-lg bg-white border border-emerald-200 p-3"><div class="flex items-center justify-between gap-2"><strong class="text-lg font-mono font-medium text-slate-900">${textoSeguro(c.numero)}</strong><span class="badge badge-green">${tamanoCilindro(c)}</span></div><p class="text-xs text-emerald-700 mt-1">${textoSeguro(c.tipo)}</p><p class="text-[11px] text-emerald-700 mt-1">Entregado: ${formatearFecha(c.fechaEntrega)} · Cambio: ${formatearFecha(c.fechaCambio)}</p></div>`).join("")
        : '<span class="text-xl font-black">Sin cilindro</span>';

    document.getElementById("detalleTipoCilindro").innerHTML = cilindrosDelPaciente.length
        ? `${cilindrosDelPaciente.length} cilindro${cilindrosDelPaciente.length === 1 ? "" : "s"} actualmente en préstamo`
        : "No hay cilindros asignados";

    renderAlertaVigenciaPaciente(cilindrosDelPaciente[0] || null);


    document.getElementById("detalleTotal").textContent =
        totalIntercambios(pacienteSeleccionado);


    document.getElementById("detalleReferencia").textContent =
        pacienteSeleccionado.referencia || "—";

    renderInfoReguladorPaciente();

    // Al abrir un expediente, el formulario de edición del regulador inicia cerrado.
    document.getElementById("panelEditarRegulador")?.classList.add("hidden");

    renderHistorialPaciente();


    mostrarVista("paciente-detalle");
    guardarDatos();

    // Lleva la ficha del paciente a la vista.
    requestAnimationFrame(() => {
        document.getElementById("view-paciente-detalle")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

}


/* =========================================================
   REGULADOR PRESTADO AL PACIENTE
========================================================= */

function renderInfoReguladorPaciente() {
    if (!pacienteSeleccionado) return;

    const detalle = document.getElementById("detalleRegulador");
    const serie = document.getElementById("detalleReguladorSerie");

    const reguladores = pacienteSeleccionado.reguladores || [];

    if (reguladores.length) {
        if (detalle) detalle.textContent = `${reguladores.length} regulador${reguladores.length === 1 ? "" : "es"} en préstamo`;
        if (serie) serie.innerHTML = reguladores.map((reg, indice) =>
            `${indice + 1}. ${textoSeguro(reg.tipo || "Tipo no indicado")} · Serie: ${textoSeguro(reg.serie || "No registrada")}`
        ).join("<br>");
    } else {
        if (detalle) detalle.textContent = "Sin regulador prestado";
        if (serie) serie.textContent = "Número de serie: —";
    }
}

function actualizarCamposReguladorNuevo() {
    const tiene = document.getElementById("nuevoPacienteReguladorPrestado")?.value === "si";
    document.getElementById("nuevoPacienteReguladorDetalles")?.classList.toggle("hidden", !tiene);

    if (!tiene) {
        const tipo = document.getElementById("nuevoPacienteReguladorTipo");
        const serie = document.getElementById("nuevoPacienteReguladorSerie");
        if (tipo) tipo.value = "";
        if (serie) serie.value = "";
    }
}

function actualizarCamposReguladorEdicion() {
    const tiene = document.getElementById("editarReguladorPrestado")?.value === "si";
    document.getElementById("editarReguladorDetalles")?.classList.toggle("hidden", !tiene);

    if (!tiene) {
        const tipo = document.getElementById("editarReguladorTipo");
        const serie = document.getElementById("editarReguladorSerie");
        if (tipo) tipo.value = "";
        if (serie) serie.value = "";
    }
}

function toggleEditarRegulador(forzarAbrir = null) {
    if (!pacienteSeleccionado) return;

    const panel = document.getElementById("panelEditarRegulador");
    if (!panel) return;

    const abrir = forzarAbrir === null ? panel.classList.contains("hidden") : forzarAbrir;

    if (!abrir) {
        panel.classList.add("hidden");
        return;
    }

    panel.classList.remove("hidden");

    const prestado = document.getElementById("editarReguladorPrestado");
    const tipo = document.getElementById("editarReguladorTipo");
    const serie = document.getElementById("editarReguladorSerie");

    if (prestado) prestado.value = pacienteSeleccionado.reguladorPrestado ? "si" : "no";
    if (tipo) tipo.value = pacienteSeleccionado.reguladorTipo || "";
    if (serie) serie.value = pacienteSeleccionado.reguladorSerie || "";

    actualizarCamposReguladorEdicion();
}

function guardarReguladorPaciente() {
    if (!pacienteSeleccionado) return;

    const prestado = document.getElementById("editarReguladorPrestado")?.value === "si";
    const tipo = (document.getElementById("editarReguladorTipo")?.value || "").trim();
    const serie = (document.getElementById("editarReguladorSerie")?.value || "").trim();

    if (prestado && !tipo) {
        alert("Debe seleccionar el tipo de regulador: Rosca o Pin.");
        return;
    }

    pacienteSeleccionado.reguladores = prestado ? [{ tipo, serie }] : [];
    sincronizarReguladorLegacy(pacienteSeleccionado);

    guardarDatos();
    renderInfoReguladorPaciente();
    renderPacientes();
    toggleEditarRegulador(false);

    alert("Información del regulador actualizada correctamente.");
}

/* =========================================================
   VISTA DE HISTORIAL
========================================================= */

function obtenerFechaDevolucionCilindro(numeroCilindro, registroEntrega) {
    if (!numeroCilindro || !pacienteSeleccionado) return null;

    const fechaEntregaBase = new Date(registroEntrega.fechaEntrega || registroEntrega.fecha);

    const devoluciones = pacienteSeleccionado.historial
        .filter(r => r.cilindroRecibido === numeroCilindro || (r.cilindrosDevueltos || []).some(c => c.numero === numeroCilindro))
        .map(r => ({
            registro: r,
            fecha: new Date(r.fecha)
        }))
        .filter(item => !isNaN(item.fecha.getTime()) && item.fecha >= fechaEntregaBase)
        .sort((a, b) => a.fecha - b.fecha);

    return devoluciones.length ? devoluciones[0].registro.fecha : null;
}

function renderHistorialPaciente() {

    const historial =
        [...pacienteSeleccionado.historial]
        .sort(
            (a,b) =>
            new Date(b.fecha) -
            new Date(a.fecha)
        );


    if (!historial.length) {

        document.getElementById("historialPaciente").innerHTML = `

            <div class="py-12 text-center">

                <div class="text-4xl mb-3">
                    <svg class="icono" aria-hidden="true"><use href="img/iconos.svg#clipboard-list"></use></svg>
                </div>

                <p class="font-semibold text-slate-700">
                    No existen intercambios registrados
                </p>

                <p class="text-sm text-slate-400 mt-1">
                    El historial del paciente aparecerá aquí.
                </p>

            </div>

        `;

        return;

    }


    let html = "";


    historial.forEach((registro) => {

        if (registro.tipoMovimiento === "Devolución definitiva") {
            html += `
            <div class="bg-white rounded-2xl border-2 border-slate-300 border-l-8 border-l-emerald-600 shadow-md p-5 sm:p-6">
                <div class="flex flex-wrap justify-between items-start gap-3">
                    <div>
                        <p class="encabezado-vista-seccion">Devolución definitiva</p>
                        <h4 class="font-black text-slate-900 mt-0.5">${textoSeguro(registro.motivoDevolucion === "Fallecimiento" ? "Devolución por fallecimiento" : "Devolución de equipo")}</h4>
                        <p class="text-sm text-slate-500">${formatearFechaCompleta(registro.fecha)}</p>
                    </div>
                    <button onclick="imprimirBoletaDevolucionPaciente(${pacienteSeleccionado.id}, '${encodeURIComponent(registro.fecha)}')" class="boton boton-secundario boton-chico"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#printer"></use></svg> Boleta de devolución</button>
                </div>
                <dl class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div><dt class="text-xs font-bold text-slate-500">Cilindros devueltos</dt><dd class="font-mono">${(registro.cilindrosDevueltos || []).map(c => textoSeguro(c.numero)).join(", ") || "Ninguno"}</dd></div>
                    <div><dt class="text-xs font-bold text-slate-500">Reguladores devueltos</dt><dd>${(registro.reguladoresDevueltos || []).length}</dd></div>
                    <div><dt class="text-xs font-bold text-slate-500">Entrega</dt><dd>${textoSeguro(registro.personaEntrega?.nombre)} · <span class="font-mono">${textoSeguro(registro.personaEntrega?.cedula)}</span></dd></div>
                    <div><dt class="text-xs font-bold text-slate-500">Recibe</dt><dd>${textoSeguro(registro.personaRecibe)}</dd></div>
                    <div class="sm:col-span-2"><dt class="text-xs font-bold text-slate-500">Estado del equipo</dt><dd>${textoSeguro(registro.estadoEquipo)}</dd></div>
                </dl>
            </div>`;
            return;
        }

        const bordeLateral = registro.discrepancia ? "border-l-8 border-l-amber-500" : "border-l-8 border-l-blue-600";
        const fechaDevolucion = obtenerFechaDevolucionCilindro(registro.cilindroEntregado, registro);
        const esCilindroActual = (pacienteSeleccionado.cilindros || []).includes(registro.cilindroEntregado);

        html += `

            <div class="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden ${bordeLateral} transition-all hover:shadow-lg">

                <!-- ENCABEZADO DE LA TRANSACCIÓN -->
                <div class="bg-slate-100 px-6 py-4 border-b-2 border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow">
                            <svg class="icono" aria-hidden="true"><use href="img/iconos.svg#refresh-cw"></use></svg>
                        </div>
                        <div>
                            <span class="font-extrabold text-slate-900 text-base tracking-wide">${registro.tipoMovimiento || "Intercambio"}</span>
                            <p class="text-xs text-slate-600 font-bold">${formatearFechaCompleta(registro.fecha)}</p>
                        </div>
                    </div>

                    <div>
                        ${
                            registro.tipoMovimiento === "Entrega adicional"
                            ?
                            `<span class="badge badge-blue px-3 py-1 text-xs">
                                ＋ Cilindro adicional
                            </span>`
                            : registro.discrepancia
                            ?
                            `<span class="badge badge-yellow px-3 py-1 text-xs">
                                <svg class="icono" aria-hidden="true"><use href="img/iconos.svg#triangle-alert"></use></svg> Discrepancia registrada
                            </span>`
                            :
                            `<span class="badge badge-green px-3 py-1 text-xs">
                                <svg class="icono" aria-hidden="true"><use href="img/iconos.svg#check"></use></svg> Coincide Correctamente
                            </span>`
                        }
                    </div>
                </div>


                <!-- CUERPO DE LA TARJETA -->
                <div class="p-6 space-y-5">

                    <!-- SECCIÓN 1: CILINDROS -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <div class="bg-blue-50/50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                            <span class="block text-xs font-extrabold text-blue-700 uppercase tracking-wider mb-1.5">Cilindro Recibido (Devuelto)</span>
                            <span class="font-black text-blue-950 text-xl">${registro.cilindroRecibido || "—"}</span>
                        </div>

                        <div class="bg-blue-50/80 border-2 border-blue-300 rounded-xl p-4 shadow-sm">
                            <span class="block text-xs font-extrabold text-blue-700 uppercase tracking-wider mb-1.5">Cilindro Entregado (Nuevo)</span>
                            <span class="font-black text-blue-950 text-xl">${registro.cilindroEntregado || "—"}</span>
                            <span class="block text-xs font-bold text-blue-700 mt-1">${registro.tamanoCilindroEntregado || tamanoCilindro(cilindros.find(c => c.numero === registro.cilindroEntregado))} · ${registro.tipoCilindroEntregado || ""}</span>
                        </div>

                    </div>


                    <!-- FECHAS DEL CILINDRO EN PRÉSTAMO AL PACIENTE -->
                    <div class="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 shadow-sm">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <span class="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Fecha de entrega al paciente</span>
                                <p class="font-black text-slate-900 mt-1">${registro.fechaEntrega ? formatearFecha(registro.fechaEntrega) : formatearFecha(registro.fecha)}</p>
                            </div>
                            <div>
                                <span class="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Fecha de devolución</span>
                                <p class="font-black ${fechaDevolucion ? "text-slate-900" : (esCilindroActual ? "text-emerald-700" : "text-slate-500")} mt-1">
                                    ${fechaDevolucion ? formatearFechaCompleta(fechaDevolucion) : (esCilindroActual ? "Actualmente en préstamo" : "Sin devolución registrada")}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- ALERTA DE DISCREPANCIA SI APLICA -->
                    ${
                        registro.discrepancia
                        ?
                        `
                        <div class="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                            <span class="text-2xl"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#triangle-alert"></use></svg></span>
                            <div>
                                <span class="block text-xs font-black text-amber-900 uppercase tracking-wide">Motivo de Discrepancia</span>
                                <p class="text-sm text-amber-900 font-semibold mt-0.5">${registro.motivoDiscrepancia}</p>
                            </div>
                        </div>
                        `
                        :
                        ""
                    }


                    <!-- SECCIÓN 2: AUDITORÍA -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-sm">

                        <div class="bg-blue-50/50 border-2 border-blue-200 rounded-xl p-4 space-y-1 shadow-sm">
                            <span class="block text-xs font-extrabold text-blue-700 uppercase tracking-wider mb-1.5">Persona que Retiró</span>
                            <p class="font-black text-blue-950 text-base">${registro.personaRetira.nombre}</p>
                            <p class="text-xs text-slate-700 font-bold">ID: <span class="text-slate-900">${registro.personaRetira.cedula}</span></p>
                            <p class="text-xs font-bold text-slate-600">${registro.personaRetira.tipo}</p>
                        </div>

                        <div class="bg-blue-50/50 border-2 border-blue-200 rounded-xl p-4 space-y-2 shadow-sm">
                            <span class="block text-xs font-extrabold text-blue-700 uppercase tracking-wider mb-1.5">Funcionarios responsables</span>
                            <div>
                                <p class="text-[11px] font-black text-slate-500 uppercase">Gestión administrativa</p>
                                <p class="font-black text-blue-950 text-base">${registro.funcionarioAdministrativo || registro.funcionario || "—"}</p>
                            </div>
                            <div>
                                <p class="text-[11px] font-black text-slate-500 uppercase">Entrega física</p>
                                <p class="font-black text-blue-950 text-base">${registro.funcionarioEntrega || registro.funcionario || "—"}</p>
                            </div>
                            <p class="text-xs font-bold text-slate-600">CCSS · Área de Salud Naranjo</p>
                        </div>

                    </div>


                    <!-- SECCIÓN 3: OBSERVACIONES -->
                    ${
                        registro.observaciones
                        ?
                        `
                        <div class="bg-blue-50/50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                            <span class="block text-xs font-extrabold text-blue-700 uppercase tracking-wider mb-1.5">Observaciones</span>
                            <p class="text-sm font-bold text-slate-800">${registro.observaciones}</p>
                        </div>
                        `
                        :
                        ""
                    }

                    <div class="border-t-2 border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-3">
                        <div><p class="text-xs font-black uppercase text-slate-500">Autorización de salida</p><p class="font-extrabold text-slate-800">Boleta asociada a esta transacción</p></div>
                        <button onclick="imprimirBoletaSalida(${pacienteSeleccionado.id}, '${encodeURIComponent(registro.fecha)}')" class="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold text-sm shadow-sm"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#printer"></use></svg> Generar boleta PDF</button>
                    </div>

                </div>

            </div>

        `;

    });


    document.getElementById("historialPaciente").innerHTML = html;

}
