/* =========================================================
   INTERCAMBIO
========================================================= */

function buscarPacienteIntercambio() {

    const consulta =
        document.getElementById("buscarPaciente").value.trim();


    const resultado =
        document.getElementById("resultadoPaciente");


    if (!consulta) {

        resultado.innerHTML = "";

        document
            .getElementById("panelIntercambio")
            .classList.add("hidden");

        pacienteSeleccionado = null;

        return;

    }


    const normalizar = valor => String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const termino = normalizar(consulta);
    const coincidencias = pacientes.filter(paciente =>
        normalizar(paciente.cedula).includes(termino) ||
        normalizar(paciente.nombre).includes(termino)
    );
    const coincidenciaExacta = coincidencias.find(paciente =>
        normalizar(paciente.cedula) === termino || normalizar(paciente.nombre) === termino
    );
    const paciente = coincidenciaExacta || (coincidencias.length === 1 ? coincidencias[0] : null);


    if (!coincidencias.length) {

        resultado.innerHTML = `

            <div class="bg-red-50 border-2 border-red-300 rounded-xl p-4 shadow-sm">

                <p class="font-bold text-red-900">
                    Paciente no encontrado
                </p>

                <p class="text-xs text-red-800 font-semibold mt-0.5">
                    Verifique el nombre o la identificación ingresada.
                </p>

            </div>

        `;

        document
            .getElementById("panelIntercambio")
            .classList.add("hidden");

        pacienteSeleccionado = null;

        return;

    }

    if (!paciente) {
        pacienteSeleccionado = null;
        document.getElementById("panelIntercambio").classList.add("hidden");
        resultado.innerHTML = `
            <div class="bg-white border-2 border-blue-200 rounded-xl overflow-hidden shadow-sm">
                <div class="px-4 py-3 bg-blue-50 border-b border-blue-200">
                    <p class="font-black text-blue-950">Seleccione el paciente correcto</p>
                    <p class="text-xs font-bold text-blue-700 mt-0.5">Se encontraron ${coincidencias.length} coincidencias.</p>
                </div>
                <div class="divide-y divide-slate-200 max-h-72 overflow-y-auto">
                    ${coincidencias.map(item => `
                        <button type="button" onclick="seleccionarResultadoPacienteIntercambio('${encodeURIComponent(item.cedula)}')" class="w-full px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition-colors">
                            <div><p class="font-extrabold text-slate-900">${textoSeguro(item.nombre)}</p><p class="text-xs font-bold text-slate-500 mt-0.5">${textoSeguro(item.cedula)}</p></div>
                            <span class="text-blue-700 font-black text-sm">Seleccionar <svg class="icono" aria-hidden="true"><use href="img/iconos.svg#arrow-right"></use></svg></span>
                        </button>`).join("")}
                </div>
            </div>`;
        return;
    }


    if (pacienteFallecido(paciente)) {
        pacienteSeleccionado = null;
        document.getElementById("panelIntercambio").classList.add("hidden");
        resultado.innerHTML = `<div class="p-4 bg-slate-100 border-2 border-slate-300 rounded-xl font-bold text-slate-700">${textoSeguro(paciente.nombre)}: expediente inactivo por fallecimiento. Si quedó equipo pendiente, registre la devolución desde el historial del paciente.</div>`;
        return;
    }

    pacienteSeleccionado = paciente;


    const cilindrosPrestados = paciente.cilindros || (paciente.cilindroActual ? [paciente.cilindroActual] : []);


    resultado.innerHTML = `

        <div class="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 shadow-sm">

            <div class="flex items-center justify-between">

                <div>

                    <p class="text-xs uppercase font-extrabold text-emerald-800 tracking-wider">
                        Paciente encontrado
                    </p>

                    <p class="text-xl font-black text-emerald-950 mt-1">
                        ${paciente.nombre}
                    </p>

                    <p class="text-xs font-bold text-emerald-900 mt-0.5">
                        ${paciente.cedula}
                    </p>

                </div>

                <div class="text-right">

                    <p class="text-xs font-extrabold text-emerald-800 tracking-wider">
                        Cilindros en préstamo
                    </p>

                    <p class="text-lg font-black text-emerald-950 mt-0.5">
                        ${cilindrosPrestados.length ? cilindrosPrestados.map(textoSeguro).join(" · ") : "Sin cilindro"}
                    </p>

                </div>

            </div>

        </div>

    `;


    document
        .getElementById("panelIntercambio")
        .classList.remove("hidden");

    document.getElementById("tipoTramitePaciente").value = "intercambio";


    document.getElementById("cilindroPacienteACambiar").innerHTML =
        `<option value="">Seleccione el cilindro...</option>` +
        cilindrosPrestados.map(numero => {
            const c = cilindros.find(item => item.numero === numero);
            return `<option value="${textoSeguro(numero)}">${textoSeguro(numero)}${c ? ` · ${tamanoCilindro(c)} · ${textoSeguro(c.tipo)}` : ""}</option>`;
        }).join("");

    document.getElementById("cilindroActualMostrar").textContent = "Seleccione un cilindro";
    document.getElementById("tipoActualMostrar").textContent = "Pendiente de selección";


    document.getElementById("cilindroDevuelto").value = "";

    actualizarModoTramitePaciente();
    validarCilindroDevuelto();

}

function seleccionarResultadoPacienteIntercambio(cedulaCodificada) {
    const campo = document.getElementById("buscarPaciente");
    campo.value = decodeURIComponent(cedulaCodificada);
    buscarPacienteIntercambio();
}

function actualizarModoTramitePaciente() {
    const bloqueRecepcion = document.getElementById("bloqueRecepcionIntercambio");
    document.getElementById("tipoTramitePaciente").value = "intercambio";
    bloqueRecepcion?.classList.remove("hidden");
}

function seleccionarCilindroPaciente() {
    const numero = document.getElementById("cilindroPacienteACambiar")?.value || "";
    const cilindro = cilindros.find(c => c.numero === numero);
    document.getElementById("cilindroActualMostrar").textContent = numero || "Seleccione un cilindro";
    document.getElementById("tipoActualMostrar").textContent = cilindro
        ? `${tamanoCilindro(cilindro)} · ${cilindro.tipo} (Recibido del proveedor: ${formatearFecha(cilindro.fechaRecepcion)} · Cambio: ${formatearFecha(cilindro.fechaCambio)} · Vence según etiqueta: ${formatearFecha(cilindro.vencimiento)})`
        : "Pendiente de selección";
    document.getElementById("cilindroDevuelto").value = "";
    validarCilindroDevuelto();
}


function validarCilindroDevuelto() {

    if (!pacienteSeleccionado) return;


    const numero =
        document.getElementById("cilindroDevuelto").value.trim();


    const resultado =
        document.getElementById("resultadoCilindro");


    const panel =
        document.getElementById("panelDiscrepancia");


    if (!numero) {

        resultado.innerHTML =
            "Pendiente de ingresar cilindro";

        resultado.className =
            "border-2 border-slate-300 rounded-xl px-4 py-3 bg-slate-100 text-sm font-bold text-slate-700";

        panel.classList.add("hidden");

        return;

    }


    const cilindroSeleccionado = document.getElementById("cilindroPacienteACambiar")?.value || "";

    if (!cilindroSeleccionado) {
        resultado.innerHTML = "Primero seleccione cuál cilindro viene a cambiar";
        resultado.className = "border-2 border-amber-300 rounded-xl px-4 py-3 bg-amber-50 text-sm font-bold text-amber-900";
        panel.classList.add("hidden");
        return;
    }

    if (numero === cilindroSeleccionado) {

        resultado.innerHTML = `
            <span class="text-emerald-900 font-extrabold">
                <svg class="icono" aria-hidden="true"><use href="img/iconos.svg#check"></use></svg> Coincide con el cilindro registrado
            </span>
        `;

        resultado.className =
            "border-2 border-emerald-300 rounded-xl px-4 py-3 bg-emerald-50 text-sm shadow-sm";

        panel.classList.add("hidden");

    } else {

        resultado.innerHTML = `
            <span class="text-amber-900 font-extrabold">
                <svg class="icono" aria-hidden="true"><use href="img/iconos.svg#triangle-alert"></use></svg> No coincide con el cilindro registrado
            </span>
        `;

        resultado.className =
            "border-2 border-amber-300 rounded-xl px-4 py-3 bg-amber-50 text-sm shadow-sm";

        panel.classList.remove("hidden");

    }

}


function validarCilindroNuevo() {

    const numero =
        document.getElementById("cilindroNuevo").value.trim();


    const resultado =
        document.getElementById("resultadoCilindroNuevo");


    if (!numero) {

        resultado.innerHTML = "";
        return;

    }


    const cilindro =
        cilindros.find(c => c.numero === numero);


    if (!cilindro) {

        resultado.innerHTML = `

            <div class="bg-red-50 border-2 border-red-300 rounded-xl p-3 text-sm text-red-900 font-bold shadow-sm">
                <svg class="icono" aria-hidden="true"><use href="img/iconos.svg#x"></use></svg> Este cilindro no está registrado en el inventario.
            </div>

        `;

        return;

    }


    if (cilindro.estado !== "Disponible") {

        resultado.innerHTML = `

            <div class="bg-red-50 border-2 border-red-300 rounded-xl p-3 text-sm text-red-900 font-bold shadow-sm">
                <svg class="icono" aria-hidden="true"><use href="img/iconos.svg#x"></use></svg> Este cilindro no está disponible.
                Estado actual: <strong>${cilindro.estado}</strong>
            </div>

        `;

        return;

    }


    resultado.innerHTML = `

        <div class="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 text-sm text-emerald-950 font-bold shadow-sm">

            <svg class="icono" aria-hidden="true"><use href="img/iconos.svg#check"></use></svg> Cilindro disponible.

            <strong>${cilindro.tipo}</strong> · Recibido del proveedor: <strong>${formatearFecha(cilindro.fechaRecepcion)}</strong> · Cambio programado: <strong>${formatearFecha(cilindro.fechaCambio)}</strong> · Vence según etiqueta: <strong>${formatearFecha(cilindro.vencimiento)}</strong>

        </div>

    `;


    document.getElementById("tipoCilindroNuevo").value =
        cilindro.tipo;

    document.getElementById("tamanoCilindroNuevo").value =
        tamanoCilindro(cilindro) === "No indicado" ? "" : tamanoCilindro(cilindro);

}


/* =========================================================
   CONFIRMAR TRANSACCIÓN
========================================================= */

function confirmarTransaccion() {

    if (!pacienteSeleccionado) {

        alert("Debe seleccionar un paciente.");
        return;

    }

    if (pacienteFallecido(pacienteSeleccionado)) {
        alert("El expediente está inactivo por fallecimiento. Solo puede registrar devoluciones pendientes.");
        return;
    }


    const tipoTramite =
        document.getElementById("tipoTramitePaciente")?.value || "intercambio";

    const esEntregaAdicional = tipoTramite === "adicional";

    const cilindroSeleccionado =
        document.getElementById("cilindroPacienteACambiar").value;


    const cilindroDevuelto =
        document.getElementById("cilindroDevuelto").value.trim();


    const cilindroNuevo =
        document.getElementById("cilindroNuevo").value.trim();


    const tipoNuevo =
        document.getElementById("tipoCilindroNuevo").value;


    const tamanoNuevo =
        document.getElementById("tamanoCilindroNuevo").value;


    const tipoPersona =
        document.getElementById("tipoPersona").value;


    const nombre =
        document.getElementById("nombreReceptor").value.trim();


    const cedula =
        document.getElementById("cedulaReceptor").value.trim();


    const observaciones =
        document.getElementById("observaciones").value.trim();


    const motivo =
        document.getElementById("motivoDiscrepancia").value;

    const funcionarioAdministrativo =
        document.getElementById("funcionarioAdministrativo").value.trim();

    const funcionarioEntrega =
        document.getElementById("funcionarioEntrega").value.trim();


    /* VALIDACIONES */

    if (!esEntregaAdicional && !cilindroSeleccionado) {

        alert("Debe seleccionar cuál cilindro del paciente viene a cambiar.");
        return;

    }

    if (!esEntregaAdicional && !(pacienteSeleccionado.cilindros || []).includes(cilindroSeleccionado)) {

        alert("El cilindro seleccionado ya no aparece asignado a este paciente.");
        return;

    }

    if (!esEntregaAdicional && !cilindroDevuelto) {

        alert("Debe ingresar el cilindro recibido.");
        return;

    }


    if (!cilindroNuevo) {

        alert("Debe ingresar el cilindro que se entregará.");
        return;

    }


    if (!tipoNuevo) {

        alert("Debe seleccionar el tipo de cilindro.");
        return;

    }


    if (!tamanoNuevo) {

        alert("Debe seleccionar si el cilindro es grande o pequeño.");
        return;

    }


    if (!tipoPersona || !nombre || !cedula) {

        alert(
            "Debe completar los datos de la persona que retira el cilindro."
        );

        return;

    }

    if (!funcionarioAdministrativo || !funcionarioEntrega) {
        alert("Debe registrar los dos funcionarios responsables: gestión administrativa y entrega física.");
        return;
    }


    const discrepancia =
        !esEntregaAdicional && cilindroDevuelto !== cilindroSeleccionado;


    if (discrepancia && !motivo) {

        alert(
            "El cilindro recibido no coincide. Debe indicar el motivo."
        );

        return;

    }


    const cilindroNuevoObj =
        cilindros.find(
            c => c.numero === cilindroNuevo
        );


    if (!cilindroNuevoObj) {

        alert(
            "El cilindro nuevo no existe en el inventario."
        );

        return;

    }


    if (cilindroNuevoObj.estado !== "Disponible") {

        alert(
            "El cilindro seleccionado no está disponible."
        );

        return;

    }


    if (
        (pacienteSeleccionado.cilindros || []).includes(cilindroNuevo)
    ) {

        alert(
            "El cilindro entregado no puede ser uno que ya esté prestado al paciente."
        );

        return;

    }


    /* =====================================================
       GUARDAR ESTADO ANTERIOR
    ===================================================== */

    const cilindroAnterior = esEntregaAdicional ? null : cilindroSeleccionado;


    /* =====================================================
       REGISTRAR CILINDRO RECIBIDO
    ===================================================== */

    let recibido = !esEntregaAdicional ?
        cilindros.find(
            c => c.numero === cilindroDevuelto
        ) : null;

    if (!esEntregaAdicional && recibido) {

        recibido.estado = "Recibido";
        recibido.pacienteId = null;

    } else if (!esEntregaAdicional) {

        recibido = {

            numero: cilindroDevuelto,

            tipo: "Tipo no especificado",

            vencimiento: "2027-01-01",
            fechaRecepcion: null,
            fechaCambio: null,
            fechaAlertaCambio: null,
            fechaVencimientoUso: null,

            estado: "Recibido",

            pacienteId: null

        };

        cilindros.push(recibido);

    }


    /* =====================================================
       LIBERAR CILINDRO ANTERIOR SI ES DIFERENTE
    ===================================================== */

    const anterior =
        cilindros.find(
            c => c.numero === cilindroAnterior
        );


    if (!esEntregaAdicional && anterior) {

        anterior.estado = "Recibido";
        anterior.pacienteId = null;

    }


    /* =====================================================
       ASIGNAR NUEVO CILINDRO
       La fecha de cambio NO se calcula desde el vencimiento físico.
       Se calcula a partir de la fecha en que el cilindro fue recibido del proveedor
       por el establecimiento: fecha de recepción + 4 meses.
    ===================================================== */
    const fechaEntrega = fechaHoyLocal();

    if (!cilindroNuevoObj.fechaRecepcion) {
        // Compatibilidad para cilindros antiguos sin esta fecha registrada.
        cilindroNuevoObj.fechaRecepcion = fechaEntrega;
    }

    cilindroNuevoObj.fechaCambio =
        calcularFechaCambioPorRecepcion(cilindroNuevoObj.fechaRecepcion);

    cilindroNuevoObj.fechaEntrega = fechaEntrega;
    cilindroNuevoObj.fechaAlertaCambio = cilindroNuevoObj.fechaCambio;
    cilindroNuevoObj.fechaVencimientoUso = cilindroNuevoObj.vencimiento;
    cilindroNuevoObj.tamano = tamanoNuevo;
    cilindroNuevoObj.estado = "Asignado";
    cilindroNuevoObj.pacienteId =
        pacienteSeleccionado.id;


    /* =====================================================
       CREAR REGISTRO HISTÓRICO
    ===================================================== */

    const nuevoRegistro = {

        fecha: new Date().toISOString(),

        tipoMovimiento: esEntregaAdicional ? "Entrega adicional" : "Intercambio",

        cilindroRecibido: esEntregaAdicional ? null : cilindroDevuelto,

        cilindroEntregado: cilindroNuevo,

        tipoCilindroEntregado: tipoNuevo,
        tamanoCilindroEntregado: tamanoNuevo,
        fechaRecepcion: cilindroNuevoObj.fechaRecepcion,
        fechaEntrega: cilindroNuevoObj.fechaEntrega,
        fechaCambio: cilindroNuevoObj.fechaCambio,
        fechaAlertaCambio: cilindroNuevoObj.fechaCambio,
        fechaVencimientoUso: cilindroNuevoObj.fechaVencimientoUso,

        discrepancia: discrepancia,

        motivoDiscrepancia:
            discrepancia ? motivo : "",

        personaRetira: {

            tipo: tipoPersona,

            nombre: nombre,

            cedula: cedula

        },

        funcionarioAdministrativo: funcionarioAdministrativo,

        funcionarioEntrega: funcionarioEntrega,

        funcionario: funcionarioAdministrativo,

        observaciones: observaciones

    };


    pacienteSeleccionado.historial.push(
        nuevoRegistro
    );


    pacienteSeleccionado.cilindros = (pacienteSeleccionado.cilindros || []);
    if (!esEntregaAdicional) {
        pacienteSeleccionado.cilindros = pacienteSeleccionado.cilindros
            .filter(numero => numero !== cilindroSeleccionado);
    }
    pacienteSeleccionado.cilindros.push(cilindroNuevo);
    pacienteSeleccionado.cilindros = [...new Set(pacienteSeleccionado.cilindros)];
    pacienteSeleccionado.cilindroActual = cilindroNuevo;


    guardarDatos();


    alert(
        (esEntregaAdicional ? "Entrega adicional registrada correctamente.\n\n" : "Intercambio registrado correctamente.\n\n") +
        "La transacción fue agregada al historial del paciente."
    );


    const pacienteIdRegistrado = pacienteSeleccionado.id;
    const fechaRegistroBoleta = nuevoRegistro.fecha;
    limpiarIntercambio();
    abrirPaciente(pacienteIdRegistrado);

    if (confirm("¿Desea abrir ahora la boleta de salida para imprimirla o guardarla como PDF?")) {
        imprimirBoletaSalida(pacienteIdRegistrado, encodeURIComponent(fechaRegistroBoleta));
    }

}


/* =========================================================
   LIMPIAR INTERCAMBIO
========================================================= */

function limpiarIntercambio() {

    document.getElementById("buscarPaciente").value = "";

    document.getElementById("resultadoPaciente").innerHTML = "";

    document
        .getElementById("panelIntercambio")
        .classList.add("hidden");


    document.getElementById("cilindroDevuelto").value = "";

    document.getElementById("tipoTramitePaciente").value = "intercambio";
    document.getElementById("bloqueRecepcionIntercambio")?.classList.remove("hidden");

    document.getElementById("cilindroPacienteACambiar").innerHTML =
        '<option value="">Seleccione el cilindro...</option>';

    document.getElementById("cilindroNuevo").value = "";

    document.getElementById("tipoCilindroNuevo").value = "";

    document.getElementById("tamanoCilindroNuevo").value = "";

    document.getElementById("tipoPersona").value = "";

    document.getElementById("nombreReceptor").value = "";

    document.getElementById("cedulaReceptor").value = "";
    document.getElementById("funcionarioAdministrativo").value = "";
    document.getElementById("funcionarioEntrega").value = "";

    document.getElementById("observaciones").value = "";

    document.getElementById("motivoDiscrepancia").value = "";


    document.getElementById("panelDiscrepancia")
        .classList.add("hidden");


    document.getElementById("resultadoCilindroNuevo")
        .innerHTML = "";


    document.getElementById("resultadoCilindro")
        .innerHTML =
        "Pendiente de ingresar cilindro";


    pacienteSeleccionado = null;

}
