/* =========================================================
   INVENTARIO (MÓDULOS SEPARADOS POR SELECCIÓN)
========================================================= */

function renderCilindros() {

    if (!bodegaActiva) return;

    if (bodegaActiva === 'llenos') {
        const filtroLlenos =
            (document.getElementById("buscarLlenos")?.value || "").toLowerCase();

        const llenos = cilindros.filter(
            c => c.estado === "Disponible" && c.numero.toLowerCase().includes(filtroLlenos)
        );

        let htmlLlenos = "";
        llenos.forEach(cilindro => {
            htmlLlenos += `
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="px-4 py-3 font-bold text-slate-800">${cilindro.numero}</td>
                    <td class="px-4 py-3 text-sm text-slate-600">${cilindro.tipo}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-slate-700">${formatearFecha(cilindro.fechaRecepcion)}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-slate-700">${formatearFecha(cilindro.vencimiento)}</td>
                    <td class="px-4 py-3 text-sm font-black text-slate-800">${formatearFecha(cilindro.fechaCambio)}</td>
                    <td class="px-4 py-3">${badgeVigencia(cilindro)}</td>
                    <td class="px-4 py-3">${badgeEstado(cilindro.estado)}</td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">
                        <button onclick="editarCilindro(decodeURIComponent('${encodeURIComponent(cilindro.numero)}'))" title="Editar cilindro" aria-label="Editar cilindro" class="solo-administrador inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:text-amber-900 transition-colors mr-1"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20h9"/><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>
                        <button onclick="eliminarCilindro(decodeURIComponent('${encodeURIComponent(cilindro.numero)}'))" title="Eliminar cilindro" aria-label="Eliminar cilindro" class="solo-administrador inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-800 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v6m4-6v6"/></svg></button>
                    </td>
                </tr>
            `;
        });

        if (!htmlLlenos) {
            htmlLlenos = `
                <tr>
                    <td colspan="8" class="px-4 py-8 text-center text-slate-400 text-sm">
                        No se encontraron cilindros llenos.
                    </td>
                </tr>
            `;
        }
        document.getElementById("tablaCilindrosLlenos").innerHTML = htmlLlenos;
    }

    if (bodegaActiva === 'vacios') {
        const filtroVacios =
            (document.getElementById("buscarVacios")?.value || "").toLowerCase();

        const vacios = cilindros.filter(
            c => c.estado === "Recibido" && c.numero.toLowerCase().includes(filtroVacios)
        );

        let htmlVacios = "";
        vacios.forEach(cilindro => {
            htmlVacios += `
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="px-3 py-3 text-center"><input type="checkbox" ${cilindrosSeleccionadosDevolucion.includes(cilindro.numero) ? "checked" : ""} onchange="alternarCilindroDevolucion(decodeURIComponent('${encodeURIComponent(cilindro.numero)}'), this.checked)" class="w-5 h-5 accent-blue-700 cursor-pointer" aria-label="Seleccionar cilindro ${textoSeguro(cilindro.numero)}"></td>
                    <td class="px-4 py-3 font-bold text-slate-800">${cilindro.numero}</td>
                    <td class="px-4 py-3 text-sm text-slate-600">${cilindro.tipo}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-slate-700">${formatearFecha(cilindro.vencimiento)}</td>
                    <td class="px-4 py-3">${badgeEstado(cilindro.estado)}</td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">
                        <button onclick="editarCilindro(decodeURIComponent('${encodeURIComponent(cilindro.numero)}'))" title="Editar cilindro" aria-label="Editar cilindro" class="solo-administrador inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:text-amber-900 transition-colors mr-1"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20h9"/><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>
                        <button onclick="eliminarCilindro(decodeURIComponent('${encodeURIComponent(cilindro.numero)}'))" title="Eliminar cilindro" aria-label="Eliminar cilindro" class="solo-administrador inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-800 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v6m4-6v6"/></svg></button>
                    </td>
                </tr>
            `;
        });

        if (!htmlVacios) {
            htmlVacios = `
                <tr>
                    <td colspan="6" class="px-4 py-8 text-center text-slate-400 text-sm">
                        No se encontraron cilindros vacíos.
                    </td>
                </tr>
            `;
        }
        document.getElementById("tablaCilindrosVacios").innerHTML = htmlVacios;
        renderResumenBodegaVacios(cilindros.filter(c => c.estado === "Recibido"));
        renderHistorialDevolucionesProveedor();
    }

}

function renderResumenBodegaVacios(vacios) {
    const contenedor = document.getElementById("resumenBodegaVacios");
    if (!contenedor) return;
    const tipos = ["220 PC - Rosca", "30 PC - Pin Index", "30 PC - Rosca"];
    const tarjetas = tipos.map(tipo => {
        const cantidad = vacios.filter(c => c.tipo === tipo).length;
        return `<div class="bg-white border-2 border-slate-200 rounded-xl p-4"><p class="text-[11px] font-black uppercase text-slate-500">${textoSeguro(tipo)}</p><p class="text-2xl font-black text-slate-900 mt-1">${cantidad}</p></div>`;
    });
    tarjetas.unshift(`<div class="bg-slate-900 text-white border-2 border-slate-900 rounded-xl p-4"><p class="text-[11px] font-black uppercase text-slate-300">Total de vacíos</p><p class="text-2xl font-black mt-1">${vacios.length}</p></div>`);
    contenedor.innerHTML = tarjetas.join("");
}

function alternarCilindroDevolucion(numero, seleccionado) {
    if (seleccionado) {
        if (!cilindrosSeleccionadosDevolucion.includes(numero)) cilindrosSeleccionadosDevolucion.push(numero);
    } else {
        cilindrosSeleccionadosDevolucion = cilindrosSeleccionadosDevolucion.filter(item => item !== numero);
    }
}

function seleccionarTodosVacios(seleccionar) {
    const filtro = (document.getElementById("buscarVacios")?.value || "").toLowerCase();
    const visibles = cilindros.filter(c => c.estado === "Recibido" && c.numero.toLowerCase().includes(filtro)).map(c => c.numero);
    if (seleccionar) {
        cilindrosSeleccionadosDevolucion = [...new Set([...cilindrosSeleccionadosDevolucion, ...visibles])];
    } else {
        cilindrosSeleccionadosDevolucion = cilindrosSeleccionadosDevolucion.filter(numero => !visibles.includes(numero));
    }
    renderCilindros();
}

function abrirDevolucionProveedor() {
    cilindrosSeleccionadosDevolucion = cilindrosSeleccionadosDevolucion.filter(numero =>
        cilindros.some(c => c.numero === numero && c.estado === "Recibido")
    );
    if (!cilindrosSeleccionadosDevolucion.length) {
        alert("Seleccione al menos un cilindro vacío para entregarlo al proveedor.");
        return;
    }
    const seleccionados = cilindrosSeleccionadosDevolucion.map(numero => cilindros.find(c => c.numero === numero)).filter(Boolean);
    const conteo = seleccionados.reduce((acc, c) => { acc[c.tipo] = (acc[c.tipo] || 0) + 1; return acc; }, {});
    document.getElementById("resumenDevolucionProveedor").innerHTML = `<p class="font-black text-blue-950 mb-2">${seleccionados.length} cilindro${seleccionados.length === 1 ? "" : "s"} seleccionado${seleccionados.length === 1 ? "" : "s"}</p><div class="flex flex-wrap gap-2 mb-3">${Object.entries(conteo).map(([tipo, cantidad]) => `<span class="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-extrabold text-blue-900">${cantidad} · ${textoSeguro(tipo)}</span>`).join("")}</div><p class="text-xs font-bold text-slate-600">Numeraciones: ${seleccionados.map(c => textoSeguro(c.numero)).join(", ")}</p>`;
    ["devolucionEmpresaProveedor", "devolucionPersonaProveedor", "devolucionFuncionarioCCSS", "devolucionComprobante", "devolucionObservaciones"].forEach(id => { document.getElementById(id).value = ""; });
    const modal = document.getElementById("modalDevolucionProveedor");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function cerrarDevolucionProveedor() {
    const modal = document.getElementById("modalDevolucionProveedor");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

async function confirmarDevolucionProveedor() {
    const empresa = document.getElementById("devolucionEmpresaProveedor").value.trim();
    const receptorProveedor = document.getElementById("devolucionPersonaProveedor").value.trim();
    const funcionarioCCSS = document.getElementById("devolucionFuncionarioCCSS").value.trim();
    const comprobante = document.getElementById("devolucionComprobante").value.trim();
    const observaciones = document.getElementById("devolucionObservaciones").value.trim();
    if (!empresa || !receptorProveedor || !funcionarioCCSS) {
        alert("Complete la empresa proveedora, la persona que recibe y el funcionario CCSS que entrega.");
        return;
    }

    const seleccionados = cilindrosSeleccionadosDevolucion.map(numero => cilindros.find(c => c.numero === numero && c.estado === "Recibido")).filter(Boolean);
    if (!seleccionados.length) {
        alert("Los cilindros seleccionados ya no se encuentran en la Bodega de Vacíos.");
        cerrarDevolucionProveedor();
        renderCilindros();
        return;
    }
    const confirmado = await confirmarEntregaProveedor(seleccionados.length);
    if (!confirmado) return;

    const numerosEntregados = seleccionados.map(c => c.numero);
    historialDevolucionesProveedor.push({
        id: Date.now(),
        fecha: new Date().toISOString(),
        empresa,
        receptorProveedor,
        funcionarioCCSS,
        comprobante,
        observaciones,
        cilindros: seleccionados.map(c => ({ numero: c.numero, tipo: c.tipo, tamano: tamanoCilindro(c), vencimiento: c.vencimiento || null }))
    });

    cilindros = cilindros.filter(c => !numerosEntregados.includes(c.numero));
    cilindrosSeleccionadosDevolucion = [];
    guardarDatos();
    cerrarDevolucionProveedor();
    renderCilindros();
    alert("Entrega registrada correctamente. Los cilindros salieron de la Bodega de Vacíos y permanecen en el historial de devoluciones al proveedor.");
}

function renderHistorialDevolucionesProveedor() {
    const contenedor = document.getElementById("historialDevolucionesProveedor");
    if (!contenedor) return;
    const historial = [...historialDevolucionesProveedor].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    if (!historial.length) {
        contenedor.innerHTML = `<div class="py-8 text-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold">Todavía no hay devoluciones registradas.</div>`;
        return;
    }
    contenedor.innerHTML = historial.map((lote, indice) => {
        const resumen = (lote.cilindros || []).reduce((acc, c) => { acc[c.tipo] = (acc[c.tipo] || 0) + 1; return acc; }, {});
        return `<article class="border-2 border-slate-200 rounded-2xl overflow-hidden"><div class="bg-slate-900 text-white px-5 py-4 flex flex-wrap justify-between gap-3"><div><p class="text-xs font-black uppercase text-blue-300">Devolución al proveedor</p><p class="font-black text-lg">${textoSeguro(lote.empresa)}</p></div><div class="text-right"><p class="font-extrabold">${formatearFechaCompleta(lote.fecha)}</p><p class="text-xs text-slate-300">${(lote.cilindros || []).length} cilindro(s)</p></div></div><div class="p-5 space-y-4"><div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm"><div class="bg-slate-50 rounded-xl p-3"><span class="text-xs font-black uppercase text-slate-500">Recibe proveedor</span><p class="font-bold mt-1">${textoSeguro(lote.receptorProveedor)}</p></div><div class="bg-slate-50 rounded-xl p-3"><span class="text-xs font-black uppercase text-slate-500">Entrega CCSS</span><p class="font-bold mt-1">${textoSeguro(lote.funcionarioCCSS)}</p></div><div class="bg-slate-50 rounded-xl p-3"><span class="text-xs font-black uppercase text-slate-500">Comprobante</span><p class="font-bold mt-1">${textoSeguro(lote.comprobante || "No registrado")}</p></div></div><div class="flex flex-wrap gap-2">${Object.entries(resumen).map(([tipo, cantidad]) => `<span class="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-extrabold text-blue-900">${cantidad} · ${textoSeguro(tipo)}</span>`).join("")}</div><details class="border-2 border-slate-200 rounded-xl"><summary class="cursor-pointer px-4 py-3 font-extrabold text-slate-800">Ver numeraciones entregadas</summary><div class="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2">${(lote.cilindros || []).map(c => `<div class="bg-slate-50 rounded-lg p-3 text-sm"><strong>${textoSeguro(c.numero)}</strong> · ${textoSeguro(c.tamano)} · ${textoSeguro(c.tipo)}</div>`).join("")}</div></details>${lote.observaciones ? `<p class="text-sm text-slate-600"><strong>Observaciones:</strong> ${textoSeguro(lote.observaciones)}</p>` : ""}</div></article>`;
    }).join("");
}


function badgeEstado(estado) {

    const clases = {

        "Disponible": "badge-green",

        "Asignado": "badge-blue",

        "Recibido": "badge-gray",

        "En revisión": "badge-yellow",

        "En mantenimiento": "badge-yellow",

        "Fuera de servicio": "badge-red",

        "Extraviado": "badge-red"

    };


    return `

        <span class="badge ${clases[estado] || "badge-gray"}">
            ${estado}
        </span>

    `;

}
