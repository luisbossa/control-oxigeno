/* =========================================================
   UTILIDADES
========================================================= */

function sumarMeses(fecha, meses) {
    const resultado = new Date(fecha);
    const diaOriginal = resultado.getDate();
    resultado.setMonth(resultado.getMonth() + meses);
    if (resultado.getDate() < diaOriginal) {
        resultado.setDate(0);
    }
    return resultado;
}

function calcularVigencia(cilindro) {
    if (!cilindro) return null;

    const fechaCambioTexto =
        cilindro.fechaCambio ||
        calcularFechaCambioPorRecepcion(cilindro.fechaRecepcion);

    if (!fechaCambioTexto) return null;

    const recepcion = cilindro.fechaRecepcion
        ? new Date(cilindro.fechaRecepcion + "T00:00:00")
        : null;

    const cambio = new Date(fechaCambioTexto + "T00:00:00");
    const vencimientoFisico = cilindro.vencimiento
        ? new Date(cilindro.vencimiento + "T00:00:00")
        : null;

    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    let estado = "vigente";

    if (vencimientoFisico && !isNaN(vencimientoFisico.getTime()) && hoy >= vencimientoFisico) {
        estado = "vencido_fisico";
    } else if (hoy >= cambio) {
        estado = "cambio";
    }

    return { recepcion, cambio, vencimientoFisico, estado };
}

function badgeVigencia(cilindro) {
    const vigencia = calcularVigencia(cilindro);

    if (!vigencia) {
        return '<span class="badge badge-gray">Sin fecha de recepción del proveedor</span>';
    }

    if (vigencia.estado === "vencido_fisico") {
        return `<span class="badge badge-red"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#circle-x"></use></svg> Vencimiento físico · ${formatearFecha(cilindro.vencimiento)}</span>`;
    }

    if (vigencia.estado === "cambio") {
        return `<span class="badge badge-red"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#siren"></use></svg> Cambio requerido · ${formatearFecha(cilindro.fechaCambio)}</span>`;
    }

    return `<span class="badge badge-green"><svg class="icono icono-relleno icono-verde" aria-hidden="true"><use href="img/iconos.svg#circle"></use></svg> Cambiar el ${formatearFecha(cilindro.fechaCambio)}</span>`;
}

function renderAlertaVigenciaPaciente(cilindro) {
    const contenedor = document.getElementById("alertaVigenciaPaciente");
    if (!contenedor) return;

    if (!cilindro) {
        contenedor.innerHTML = "";
        return;
    }

    const vigencia = calcularVigencia(cilindro);
    if (!vigencia) {
        contenedor.innerHTML = `
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-5 shadow-sm">
                <p class="font-black text-slate-800">Fecha de cambio no disponible</p>
                <p class="text-sm font-bold text-slate-600 mt-1">No hay información suficiente para mostrar la fecha programada de cambio de este cilindro.</p>
            </div>`;
        return;
    }

    if (vigencia.estado === "vencido_fisico") {
        contenedor.innerHTML = `
            <div class="bg-red-50 border-2 border-red-400 rounded-xl p-5 shadow-sm">
                <div class="flex items-start gap-3">
                    <span class="text-2xl"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#siren"></use></svg></span>
                    <div>
                        <p class="font-black text-red-950">Cambio de cilindro requerido</p>
                        <p class="text-sm font-bold text-red-900 mt-1">Entregado al paciente: ${formatearFecha(cilindro.fechaEntrega)} · Debe cambiarse: ${formatearFecha(cilindro.fechaCambio)}.</p>
                    </div>
                </div>
            </div>`;
        return;
    }

    if (vigencia.estado === "cambio") {
        contenedor.innerHTML = `
            <div class="bg-red-50 border-2 border-red-400 rounded-xl p-5 shadow-sm">
                <div class="flex items-start gap-3">
                    <span class="text-2xl"><svg class="icono" aria-hidden="true"><use href="img/iconos.svg#siren"></use></svg></span>
                    <div>
                        <p class="font-black text-red-950">Cambio de cilindro requerido</p>
                        <p class="text-sm font-bold text-red-900 mt-1">Este cilindro ya cumplió 4 meses desde que fue recibido del proveedor y debe cambiarse por otro cilindro.</p>
                        <p class="text-xs font-bold text-red-800 mt-1">Entregado al paciente: ${formatearFecha(cilindro.fechaEntrega)} · Debe cambiarse: ${formatearFecha(cilindro.fechaCambio)}</p>
                    </div>
                </div>
            </div>`;
        return;
    }

    contenedor.innerHTML = `
        <div class="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 shadow-sm">
            <div class="flex items-start gap-3">
                <span class="text-2xl"><svg class="icono icono-relleno icono-verde" aria-hidden="true"><use href="img/iconos.svg#circle"></use></svg></span>
                <div>
                    <p class="font-black text-emerald-950">Cilindro dentro del período de uso</p>
                    <p class="text-sm font-bold text-emerald-900 mt-1">Entregado al paciente: ${formatearFecha(cilindro.fechaEntrega)}.</p>
                    <p class="text-xs font-bold text-emerald-800 mt-1">Debe cambiarse el ${formatearFecha(cilindro.fechaCambio)}.</p>
                </div>
            </div>
        </div>`;
}

function iniciales(nombre) {

    return nombre
        .split(" ")
        .slice(0,2)
        .map(n => n.charAt(0))
        .join("")
        .toUpperCase();

}


function formatearFecha(fecha) {

    if (!fecha) return "—";

    return new Date(fecha + "T00:00:00").toLocaleDateString(
        "es-CR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}


function formatearFechaCompleta(fecha) {

    return new Date(fecha).toLocaleString(
        "es-CR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}
