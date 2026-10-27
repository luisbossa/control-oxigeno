/* =========================================================
   NUEVO CILINDRO
========================================================= */

function abrirNuevoCilindro() {

    cilindroEnEdicionNumero = null;
    document.getElementById("tituloModalCilindro").textContent = "Nuevo cilindro";
    document.getElementById("botonGuardarCilindro").textContent = "Guardar";
    document.getElementById("nuevoCilindroNumero").value = "";
    document.getElementById("nuevoCilindroTipo").value = "";
    document.getElementById("nuevoCilindroVencimiento").value = "";

    const inputFechaRecepcion =
        document.getElementById("nuevoCilindroFechaRecepcion");

    if (inputFechaRecepcion && !inputFechaRecepcion.value) {
        inputFechaRecepcion.value = fechaHoyLocal();
    }

    document
        .getElementById("modalCilindro")
        .classList.remove("hidden");

    document
        .getElementById("modalCilindro")
        .classList.add("flex");

}


function cerrarModalCilindro() {

    document
        .getElementById("modalCilindro")
        .classList.add("hidden");

    document
        .getElementById("modalCilindro")
        .classList.remove("flex");

    cilindroEnEdicionNumero = null;

}

function editarCilindro(numero) {
    const cilindro = cilindros.find(c => c.numero === numero);
    if (!cilindro) return;
    cilindroEnEdicionNumero = numero;
    document.getElementById("tituloModalCilindro").textContent = "Editar cilindro";
    document.getElementById("botonGuardarCilindro").textContent = "Guardar cambios";
    document.getElementById("nuevoCilindroNumero").value = cilindro.numero || "";
    document.getElementById("nuevoCilindroTipo").value = cilindro.tipo || "";
    document.getElementById("nuevoCilindroFechaRecepcion").value = cilindro.fechaRecepcion || "";
    document.getElementById("nuevoCilindroVencimiento").value = cilindro.vencimiento || "";
    document.getElementById("modalCilindro").classList.remove("hidden");
    document.getElementById("modalCilindro").classList.add("flex");
}

function guardarCilindro() {
    if (cilindroEnEdicionNumero === null) {
        guardarNuevoCilindro();
        return;
    }

    const cilindro = cilindros.find(c => c.numero === cilindroEnEdicionNumero);
    if (!cilindro) return;
    const numero = document.getElementById("nuevoCilindroNumero").value.trim();
    const tipo = document.getElementById("nuevoCilindroTipo").value;
    const fechaRecepcion = document.getElementById("nuevoCilindroFechaRecepcion").value;
    const vencimiento = document.getElementById("nuevoCilindroVencimiento").value;

    if (!numero || !tipo || !fechaRecepcion || !vencimiento) {
        alert("Complete todos los campos, incluyendo la fecha de almacenamiento y la fecha de vencimiento físico.");
        return;
    }
    if (cilindros.some(c => c.numero === numero && c !== cilindro)) {
        alert("Ya existe un cilindro con ese número.");
        return;
    }

    const numeroAnterior = cilindro.numero;
    const fechaCambio = calcularFechaCambioPorRecepcion(fechaRecepcion);
    cilindro.numero = numero;
    cilindro.tipo = tipo;
    cilindro.fechaRecepcion = fechaRecepcion;
    cilindro.vencimiento = vencimiento;
    cilindro.fechaCambio = fechaCambio;
    cilindro.fechaAlertaCambio = fechaCambio;
    cilindro.fechaVencimientoUso = vencimiento;

    pacientes.forEach(paciente => {
        if (paciente.cilindroActual === numeroAnterior) paciente.cilindroActual = numero;
        paciente.cilindros = (paciente.cilindros || []).map(item => item === numeroAnterior ? numero : item);
        (paciente.historial || []).forEach(registro => {
            if (registro.cilindroRecibido === numeroAnterior) registro.cilindroRecibido = numero;
            if (registro.cilindroEntregado === numeroAnterior) {
                registro.cilindroEntregado = numero;
                registro.tipoCilindroEntregado = tipo;
            }
        });
    });

    ubicacionesInstitucionales.ebais.forEach(ebais => {
        if (ebais.cilindroActual === numeroAnterior) ebais.cilindroActual = numero;
        ebais.cilindros = (ebais.cilindros || []).map(item => item === numeroAnterior ? numero : item);
        (ebais.historial || []).forEach(registro => {
            if (registro.cilindroRetirado === numeroAnterior) registro.cilindroRetirado = numero;
            if (registro.cilindroInstalado === numeroAnterior) {
                registro.cilindroInstalado = numero;
                registro.tipoCilindro = tipo;
                registro.fechaRecepcionProveedor = fechaRecepcion;
                registro.fechaVencimientoEtiqueta = vencimiento;
                registro.fechaProgramadaCambio = fechaCambio;
            }
        });
    });
    ubicacionesInstitucionales.ambulancias.forEach(ambulancia => {
        ambulancia.cilindros = (ambulancia.cilindros || []).map(item => item === numeroAnterior ? numero : item);
        (ambulancia.detallesCilindros || []).forEach(detalle => { if (detalle.numero === numeroAnterior) detalle.numero = numero; });
        (ambulancia.historial || []).forEach(movimiento => (movimiento.detalles || []).forEach(detalle => {
            if (detalle.cilindroRetirado === numeroAnterior) detalle.cilindroRetirado = numero;
            if (detalle.cilindroInstalado === numeroAnterior) { detalle.cilindroInstalado = numero; detalle.tipoCilindro = tipo; detalle.vencimiento = vencimiento; detalle.fechaProgramadaCambio = fechaCambio; }
        }));
    });

    guardarDatos();
    cerrarModalCilindro();
    if (bodegaActiva) renderCilindros();
    renderPacientes();
    alert(`Cilindro actualizado correctamente. Fecha programada de cambio: ${formatearFecha(fechaCambio)}.`);
}

async function eliminarCilindro(numero) {
    const cilindro = cilindros.find(c => c.numero === numero);
    if (!cilindro) return;
    const pacienteAsignado = pacientes.find(p => (p.cilindros || []).includes(numero) || p.cilindroActual === numero || p.id === cilindro.pacienteId);
    const ebaisAsignado = ubicacionesInstitucionales.ebais.find(ebais => ebais.cilindroActual === numero || ebais.id === cilindro.ubicacionInstitucionalId);
    const ambulanciaAsignada = ubicacionesInstitucionales.ambulancias.find(a => (a.cilindros || []).includes(numero) || a.id === cilindro.ubicacionInstitucionalId);
    if (cilindro.estado === "Asignado" || cilindro.pacienteId || pacienteAsignado || ebaisAsignado || ambulanciaAsignada) {
        const destino = pacienteAsignado?.nombre || ebaisAsignado?.nombre || ambulanciaAsignada?.nombre || "un paciente o ubicación institucional";
        alert(`No se puede eliminar el cilindro ${numero} porque está asignado a ${destino}. Registre primero su devolución.`);
        return;
    }
    const confirmado = await confirmarEliminacion({
        titulo: "¿Eliminar cilindro?",
        nombre: `Cilindro ${numero}`,
        detalle: "El cilindro se eliminará definitivamente del inventario."
    });
    if (!confirmado) return;
    cilindros = cilindros.filter(c => c.numero !== numero);
    guardarDatos();
    if (bodegaActiva) renderCilindros();
    alert("Cilindro eliminado correctamente.");
}


function guardarNuevoCilindro() {

    const numero =
        document.getElementById("nuevoCilindroNumero")
        .value.trim();


    const tipo =
        document.getElementById("nuevoCilindroTipo")
        .value;


    const fechaRecepcion =
        document.getElementById("nuevoCilindroFechaRecepcion")
        .value;


    const vencimiento =
        document.getElementById("nuevoCilindroVencimiento")
        .value;


    if (!numero || !tipo || !fechaRecepcion || !vencimiento) {

        alert(
            "Complete todos los campos, incluyendo la fecha de almacenamiento y la fecha de vencimiento físico."
        );

        return;

    }


    if (
        cilindros.some(
            c => c.numero === numero
        )
    ) {

        alert(
            "Ya existe un cilindro con ese número."
        );

        return;

    }


    const fechaCambio =
        calcularFechaCambioPorRecepcion(fechaRecepcion);


    cilindros.push({

        numero: numero,

        tipo: tipo,

        vencimiento: vencimiento,
        fechaRecepcion: fechaRecepcion,
        fechaCambio: fechaCambio,
        fechaEntrega: null,
        fechaAlertaCambio: fechaCambio,
        fechaVencimientoUso: vencimiento,

        estado: "Disponible",

        pacienteId: null

    });


    guardarDatos();

    cerrarModalCilindro();


    document.getElementById("nuevoCilindroNumero").value = "";

    document.getElementById("nuevoCilindroTipo").value = "";
    document.getElementById("nuevoCilindroFechaRecepcion").value = "";
    document.getElementById("nuevoCilindroVencimiento").value = "";


    if (bodegaActiva) {
        renderCilindros();
    }


    alert(
        `Cilindro registrado correctamente. Fecha programada de cambio: ${formatearFecha(fechaCambio)}.`
    );

}
