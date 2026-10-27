/* =========================================================
   CONTRATOS, BOLETAS Y DEVOLUCIONES DEL PACIENTE
   Documentos imprimibles (se abren en una ventana y se pueden
   guardar como PDF) y la devolución definitiva del equipo.
========================================================= */

const LOGO_PRESTAMO = new URL("img/logo-ccss.png", document.baseURI).href;

/* ---------------------------------------------------------
   Devolución definitiva del equipo
--------------------------------------------------------- */

function abrirDevolucionPaciente() {
    if (!pacienteSeleccionado) return;
    const paciente = pacienteSeleccionado;
    document.getElementById("devolucionNombrePaciente").textContent = `${paciente.nombre} · ${paciente.cedula}`;
    document.getElementById("devolucionCilindrosPaciente").innerHTML = (paciente.cilindros || []).map(numero => {
        const c = cilindros.find(item => item.numero === numero);
        return `<label class="flex gap-2 items-center border rounded-lg p-2"><input type="checkbox" data-devolucion-cilindro="${textoSeguro(numero)}"><span>${textoSeguro(numero)} · ${textoSeguro(tamanoCilindro(c))} · ${textoSeguro(c?.tipo || "")}</span></label>`;
    }).join("") || '<p class="text-slate-500">No tiene cilindros asignados.</p>';
    document.getElementById("devolucionReguladoresPaciente").innerHTML = (paciente.reguladores || []).map((reg, i) =>
        `<label class="flex gap-2 items-center border rounded-lg p-2"><input type="checkbox" data-devolucion-regulador="${i}"><span>${textoSeguro(reg.tipo)} · Serie: ${textoSeguro(reg.serie || "No registrada")}</span></label>`
    ).join("") || '<p class="text-slate-500">No tiene manómetros asignados.</p>';
    ["devolucionEntregaNombre", "devolucionEntregaCedula", "devolucionEstadoEquipo", "devolucionRecibeNombre"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("devolucionMotivoPaciente").value = "Devolución";
    document.getElementById("modalDevolucionPaciente").classList.remove("hidden");
    document.getElementById("modalDevolucionPaciente").classList.add("flex");
}

function cerrarDevolucionPaciente() {
    document.getElementById("modalDevolucionPaciente").classList.add("hidden");
    document.getElementById("modalDevolucionPaciente").classList.remove("flex");
}

function guardarDevolucionPaciente() {
    const paciente = pacienteSeleccionado;
    if (!paciente) return;
    const numeros = [...document.querySelectorAll('#devolucionCilindrosPaciente input:checked')].map(input => input.dataset.devolucionCilindro);
    const indices = [...document.querySelectorAll('#devolucionReguladoresPaciente input:checked')].map(input => Number(input.dataset.devolucionRegulador));
    const nombre = document.getElementById("devolucionEntregaNombre").value.trim();
    const cedula = document.getElementById("devolucionEntregaCedula").value.trim();
    const estado = document.getElementById("devolucionEstadoEquipo").value.trim();
    const recibe = document.getElementById("devolucionRecibeNombre").value.trim();
    if (!numeros.length && !indices.length) { alert("Seleccione al menos un cilindro o manómetro."); return; }
    if (!nombre || !cedula || !estado || !recibe) { alert("Complete la persona que entrega, su cédula, el estado del equipo y la persona que recibe."); return; }
    if (numeros.some(numero => !(paciente.cilindros || []).includes(numero)) || indices.some(i => !paciente.reguladores?.[i])) { alert("La asignación del paciente cambió. Cierre y abra nuevamente la devolución."); return; }
    const cilindrosDevueltos = numeros.map(numero => {
        const c = cilindros.find(item => item.numero === numero);
        return { numero, tamano: tamanoCilindro(c), tipo: c?.tipo || "" };
    });
    const reguladoresDevueltos = indices.map(i => ({ ...paciente.reguladores[i] }));
    const registro = { fecha: new Date().toISOString(), tipoMovimiento: "Devolución definitiva", motivoDevolucion: document.getElementById("devolucionMotivoPaciente").value, fechaEntrega: fechaHoyLocal(), cilindrosDevueltos, reguladoresDevueltos, personaEntrega: { nombre, cedula }, estadoEquipo: estado, personaRecibe: recibe };
    numeros.forEach(numero => { const c = cilindros.find(item => item.numero === numero); if (c) { c.estado = "Recibido"; c.pacienteId = null; } });
    paciente.cilindros = (paciente.cilindros || []).filter(numero => !numeros.includes(numero));
    paciente.cilindroActual = paciente.cilindros.at(-1) || null;
    paciente.reguladores = (paciente.reguladores || []).filter((_, i) => !indices.includes(i));
    sincronizarReguladorLegacy(paciente);
    paciente.historial.push(registro);
    if (registro.motivoDevolucion === "Fallecimiento") paciente.estadoVital = "Fallecido";
    guardarDatos(); cerrarDevolucionPaciente(); abrirPaciente(paciente.id); renderPacientes(); renderCilindros();
    alert("Devolución registrada. Puede generar la boleta desde el historial del paciente.");
}

/* ---------------------------------------------------------
   Documentos imprimibles
--------------------------------------------------------- */

function imprimirBoletaDevolucionPaciente(pacienteId, fechaCodificada) {
    const paciente = pacientes.find(p => p.id === pacienteId);
    const registro = paciente?.historial?.find(r => r.fecha === decodeURIComponent(fechaCodificada) && r.tipoMovimiento === "Devolución definitiva");
    if (!registro) { alert("No se encontró la devolución."); return; }
    const ventana = window.open("", "_blank", "width=900,height=1100");
    if (!ventana) { alert("Permita ventanas emergentes para generar la boleta."); return; }
    const seguro = valor => textoSeguro(valor || "");
    const grandes = registro.cilindrosDevueltos.filter(c => c.tamano === "Grande");
    const pequenos = registro.cilindrosDevueltos.filter(c => c.tamano === "Pequeño");
    const fila = (titulo, dato) => `<div class="fila"><strong>${titulo}</strong><span>${seguro(dato)}</span></div>`;
    const equipo = (titulo, cantidad) => `<div class="equipo"><i>${cantidad ? "✓" : ""}</i><span>${titulo}</span><b>${cantidad || ""}</b></div>`;
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Boleta devolución - ${seguro(paciente.nombre)}</title><style>
@page{size:A4 portrait;margin:13mm 17mm}*{box-sizing:border-box}body{margin:0;font:11pt Arial,Helvetica,sans-serif;color:#111;background:#ddd}.acciones{text-align:right;max-width:180mm;margin:10px auto}.acciones button{border:0;background:#17365d;color:white;padding:10px 16px;border-radius:5px;font-weight:bold}.hoja{background:white;width:176mm;min-height:258mm;margin:auto;padding:9mm;box-shadow:0 2px 12px #0002}.formulario{width:100%;max-width:160mm;margin:0 auto}.cabecera{display:grid;grid-template-columns:18mm 1fr 18mm;align-items:center;margin:0 5mm 2mm}.sello{width:16mm;height:16mm;object-fit:contain}.titulo{text-align:center;font:bold 14pt Arial;line-height:1.15}.caja{border:1.5px solid #111;border-radius:9mm;padding:3mm 4mm}.caja h2{text-align:center;font:bold 10pt Arial;margin:0 0 2mm}.fila{display:flex;align-items:end;height:6.2mm;gap:1mm;font-size:9.8pt}.fila strong{font-weight:normal;white-space:nowrap}.fila span{flex:1;border-bottom:1px solid #111;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 1mm}.motivo{border:1.4px solid #111;border-radius:2mm;display:flex;justify-content:space-evenly;margin:2mm 0;padding:1.5mm;font-size:10pt}.cuadro{display:inline-block;border:1.3px solid #111;width:7mm;height:5mm;text-align:center;margin-left:5mm;font-weight:bold}.equipo-caja{margin-top:2mm;min-height:49mm}.enc-cant{text-align:right;padding-right:2mm;font-weight:bold;font-size:9.5pt}.equipo{display:grid;grid-template-columns:7mm 1fr 17mm;gap:2mm;align-items:center;height:8mm;font-size:10pt}.equipo i{width:6mm;height:5mm;border:1.3px solid #111;font-style:normal;text-align:center;font-weight:bold}.equipo b{border-bottom:1px solid #111;min-height:5mm;text-align:center;font-weight:normal}.estado{display:flex;gap:2mm;margin-top:2mm;font-size:10pt}.estado span{flex:1;border-bottom:1px solid #111;overflow:hidden;white-space:nowrap}.recibe{display:flex;gap:2mm;margin:4mm 1mm 0;font-size:10pt}.recibe span{flex:1;border-bottom:1px solid #111}.copia{font-size:9pt;margin:5mm 0 0}.copia:before{content:'▣';margin-right:2mm}@media print{body{background:white}.acciones{display:none}.hoja{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}}
</style></head><body><div class="acciones"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div><main class="hoja"><div class="formulario"><header class="cabecera"><img class="sello" src="${LOGO_PRESTAMO}" alt="Seguro Social"><div class="titulo">ÁREA DE SALUD DE NARANJO<br>BOLETA DEVOLUCIÓN CILINDROS</div><img class="sello" src="${LOGO_PRESTAMO}" alt="Seguro Social"></header><section class="caja"><h2>DATOS DEL USUARIO</h2>${fila("Fecha de entrega:", registro.fechaEntrega.split("-").reverse().join("/"))}${fila("Nombre de usuario:",paciente.nombre)}${fila("Número de cédula:",paciente.cedula)}${fila("Persona que entrega:",registro.personaEntrega.nombre)}${fila("Número de cédula:",registro.personaEntrega.cedula)}</section><div class="motivo"><span>Devolución <i class="cuadro">${registro.motivoDevolucion === "Devolución" ? "✓" : ""}</i></span><span>Fallecimiento <i class="cuadro">${registro.motivoDevolucion === "Fallecimiento" ? "✓" : ""}</i></span></div><section class="caja equipo-caja"><h2>DATOS DEL EQUIPO</h2><div class="enc-cant">Cantidad</div>${equipo("Cilindro de oxígeno grande de 220 pc",grandes.length)}${equipo("Cilindro de oxígeno pequeño de 110 pc",0)}${equipo("Manómetro",registro.reguladoresDevueltos.length)}${pequenos.length ? equipo("Cilindro de oxígeno pequeño de 30 pc",pequenos.length) : ""}<div class="estado">Estado del equipo: <span>${seguro(registro.estadoEquipo)}</span></div></section><div class="recibe">Persona que recibe: <span>${seguro(registro.personaRecibe)}</span></div><div class="copia">COPIA USUARIO</div></div></main></body></html>`;
    ventana.document.open(); ventana.document.write(html); ventana.document.close(); ventana.focus();
}

function imprimirContratoPrestamoPaciente(id) {
    const paciente = pacientes.find(p => p.id === id);
    if (!paciente) { alert("No se encontró el paciente."); return; }
    const ventana = window.open("", "_blank", "width=1200,height=850");
    if (!ventana) { alert("Permita las ventanas emergentes para abrir la boleta de préstamo."); return; }
    const seguro = valor => textoSeguro(valor || "");
    const fecha = new Date().toLocaleDateString("es-CR", {day:"2-digit", month:"2-digit", year:"numeric"});
    const fechaRetiro = paciente.fechaRetiroPrestamo ? paciente.fechaRetiroPrestamo.split("-").reverse().join("/") : fecha;
    const asignados = paciente.equiposPrestamoInicial?.cilindros || (paciente.cilindros || []).map(numero => cilindros.find(c => c.numero === numero)).filter(Boolean);
    const grandes = asignados.filter(c => tamanoCilindro(c) === "Grande");
    const pequenos = asignados.filter(c => tamanoCilindro(c) === "Pequeño");
    const otros = asignados.filter(c => tamanoCilindro(c) === "No indicado");
    const reguladores = paciente.equiposPrestamoInicial?.reguladores || paciente.reguladores || [];
    const linea = (rotulo, valor) => `<div class="fila"><strong>${rotulo}</strong><span>${seguro(valor)}</span></div>`;
    const equipo = (rotulo, lista) => `<div class="equipo"><span class="cuadro">${lista.length ? "✓" : ""}</span><span>${rotulo}</span><span class="cantidad">${lista.length || ""}</span></div>`;
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Boleta préstamo cilindros - ${seguro(paciente.nombre)}</title><style>
@page{size:A4 landscape;margin:9mm 11mm}*{box-sizing:border-box}body{margin:0;background:#ddd;color:#111;font:11pt Arial,Helvetica,sans-serif}.acciones{width:270mm;margin:8px auto;text-align:right}.acciones button{background:#17365d;color:white;border:0;border-radius:4px;padding:9px 14px;font-weight:bold;cursor:pointer}.hoja{width:275mm;height:190mm;margin:auto;padding:5mm 7mm;background:white;box-shadow:0 2px 12px #0002}.cabecera{height:27mm;display:grid;grid-template-columns:20mm 1fr 20mm;align-items:start}.sello{width:17mm;height:17mm;object-fit:contain}.cabecera .sello:last-child{justify-self:end}.titulo{text-align:center;padding-top:5mm;font:bold 16pt Arial,Helvetica,sans-serif;line-height:1.12}.contenido{height:134mm;display:grid;grid-template-columns:67% 31%;grid-template-rows:78mm 53mm;gap:3mm 2%;}.caja{border:1.5px solid #111;border-radius:11mm;padding:4mm 5mm}.caja h2{text-align:center;font:bold 10.5pt Arial;margin:0 0 2.5mm}.usuario{grid-column:1;grid-row:1}.fila{height:7.35mm;display:flex;gap:1mm;align-items:flex-end;font-size:10.5pt}.fila strong{font-weight:normal;white-space:nowrap;padding-bottom:.6mm}.fila span{display:block;border-bottom:1px solid #111;flex:1;height:5.8mm;padding:0 2mm .4mm;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.equipo-caja{grid-column:1;grid-row:2}.equipo-caja h2{margin-bottom:4mm}.equipo-cab{display:flex;justify-content:flex-end;padding-right:5mm;font-weight:bold;font-size:10pt}.equipo{height:8mm;display:grid;grid-template-columns:7mm 1fr 22mm;align-items:center;gap:2mm;font-size:10.3pt}.cuadro{border:1.3px solid #111;width:5mm;height:5mm;line-height:4.6mm;text-align:center;font-weight:bold}.cantidad{border-bottom:1px solid #111;min-height:6mm;text-align:center}.declaracion{grid-column:2;grid-row:2;position:relative;padding:4mm 5mm;font-size:10.5pt;line-height:1.28;text-align:justify}.declaracion p{margin:0}.firma{position:absolute;bottom:-6mm;left:0;width:100%;text-align:center;font-size:10pt}.pie{height:16mm;margin-top:8mm;position:relative;font-size:10.5pt}.entrega{display:flex;gap:1mm;width:65%;align-items:flex-end}.entrega span{border-bottom:1px solid #111;flex:1;height:6mm;padding:0 2mm}.copia{font-weight:bold;margin-top:3mm;font-size:10pt}.copia:before{content:'▣';margin-right:2mm}.nota{font-size:8.5pt;margin:1mm 0 0 8mm}.declaracion{grid-row:2;}.contenido{grid-template-columns:66% 32%}.usuario{grid-column:1/-1;width:100%}.equipo-caja{grid-column:1}.declaracion{grid-column:2}@media print{body{background:white}.acciones{display:none}.hoja{width:auto;height:auto;min-height:0;margin:0;padding:0;box-shadow:none}}
</style></head><body><div class="acciones"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div><main class="hoja"><header class="cabecera"><img class="sello" src="__LOGO__" alt="Seguro Social"><div class="titulo">ÁREA DE SALUD DE NARANJO<br>BOLETA PRÉSTAMO CILINDROS</div><img class="sello" src="__LOGO__" alt="Seguro Social"></header><div class="contenido"><section class="caja usuario"><h2>DATOS DEL USUARIO</h2>${linea("Fecha de retiro:",fechaRetiro)}${linea("Nombre de usuario:",paciente.nombre)}${linea("Número de cédula:",paciente.cedula)}${linea("Dirección:",paciente.direccion)}${linea("Teléfono:",paciente.telefono)}${linea("Persona que retira:",paciente.retiraNombre)}${linea("Número de cédula:",paciente.retiraCedula)}${linea("Teléfono:",paciente.retiraTelefono)}</section><section class="caja equipo-caja"><h2>DATOS DEL EQUIPO</h2><div class="equipo-cab">Cantidad</div>${equipo("Cilindro de oxígeno grande de 220 pc",grandes)}${equipo("Cilindro de oxígeno pequeño de 110 pc",[])}${equipo("Manómetro",reguladores)}${pequenos.length ? equipo("Cilindro de oxígeno pequeño de 30 pc",pequenos) : ""}</section><section class="caja declaracion"><p>Declaro que recibo como préstamo el tipo y cantidad de suministros indicados, todos en perfecto estado, los cuales me comprometo a devolver en la fecha que se defina y en las mismas condiciones que lo recibí, por lo tanto, costearé cualquier reparación que sea necesaria producto de un mal uso.</p><div class="firma">Firma</div></section></div><footer class="pie"><div class="entrega">Persona que entrega: <span>${seguro(paciente.entregaNombre)}</span></div><div class="copia">COPIA USUARIO</div></footer></main></body></html>`;
    ventana.document.open(); ventana.document.write(html.replaceAll("__LOGO__", LOGO_PRESTAMO)); ventana.document.close(); ventana.focus();
}

function imprimirBoletaSalida(pacienteId, fechaRegistroCodificada) {
    const paciente = pacientes.find(p => p.id === pacienteId);
    if (!paciente) {
        alert("No se encontró el paciente asociado a la boleta.");
        return;
    }

    const fechaRegistro = decodeURIComponent(fechaRegistroCodificada);
    const registro = (paciente.historial || []).find(r => r.fecha === fechaRegistro);
    if (!registro) {
        alert("No se encontró la transacción asociada a la boleta.");
        return;
    }

    const ventana = window.open("", "_blank", "width=900,height=1100");
    if (!ventana) {
        alert("Permita las ventanas emergentes para imprimir o guardar la boleta como PDF.");
        return;
    }

    const seguro = valor => textoSeguro(valor === null || valor === undefined || valor === "" ? "—" : String(valor));
    const fechaEmision = registro.fechaEmisionBoleta || registro.fecha;
    const fechaLegible = fechaEmision && !Number.isNaN(new Date(fechaEmision).getTime())
        ? new Date(fechaEmision).toLocaleDateString("es-CR", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "________________";
    const numeroSerie = registro.cilindroEntregado || "";
    const funcionario = registro.funcionarioAdministrativo || registro.funcionario || "";
    const responsable = registro.personaRetira?.nombre || paciente.nombre || "";
    const cedulaResponsable = registro.personaRetira?.cedula || paciente.cedula || "";

    const htmlBoleta = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Boleta de salida · ${seguro(numeroSerie)}</title>
<style>
@page{size:A4;margin:9mm 12mm}
*{box-sizing:border-box}
body{margin:0;color:#111;font-family:"Arial Narrow",Arial,Helvetica,sans-serif;font-size:11.1pt;line-height:1.24;background:#e5e7eb}
.herramientas{max-width:190mm;margin:12px auto;text-align:right}
.herramientas button{border:0;border-radius:7px;background:#17365d;color:white;font:700 14px Arial,sans-serif;padding:10px 16px;cursor:pointer}
.pagina{width:186mm;min-height:277mm;margin:0 auto;padding:9mm 7mm 7mm;background:#fff;box-shadow:0 3px 18px #0002}
.encabezado{position:relative;min-height:29mm;text-align:center}
.sello{position:absolute;left:0;top:1mm;width:19mm;height:19mm}
.sello img{display:block;width:100%;height:100%;object-fit:contain}.institucion{font:bold 14pt Georgia,"Times New Roman",serif;line-height:1.06}.institucion div:nth-child(2){font-size:12.6pt}.institucion div:nth-child(3){font-size:12.3pt}
.contacto{font-size:8.1pt;line-height:1.2;margin-top:1.3mm}
h1{font:bold 11.4pt Georgia,"Times New Roman",serif;text-align:center;line-height:1.16;margin:4.5mm 8mm 4mm;text-transform:uppercase}
.intro{text-align:center;margin:0 2mm 5.2mm}
p{margin:0 0 3.1mm}
.cuidados{margin-top:3.5mm}
.cuidados ol{margin:2.8mm 0 3.6mm;padding-left:6.4mm}
.cuidados li{padding-left:.8mm;margin-bottom:1.8mm}
.bloque{border:1.7px solid #4b4b4b;text-align:center;padding:2.2mm 3mm;margin-top:3.4mm}
.bloque h2{font:bold 10.8pt Georgia,"Times New Roman",serif;margin:0 0 1.6mm}
.bloque p{margin:0 0 .9mm}.bloque p:last-child{margin:0}
.recibido{margin-top:4.1mm;display:grid;grid-template-columns:1.1fr .85fr 1fr;align-items:end;gap:4mm;font-size:10.5pt}
.linea{display:inline-block;border-bottom:1px solid #222;min-height:5mm;text-align:center;padding:0 1mm 1mm;white-space:nowrap}
.numero{margin-top:3.8mm;display:grid;grid-template-columns:1.5fr 1fr;gap:3mm;align-items:end;font-size:10.4pt}
.firmas{display:grid;grid-template-columns:1fr 1fr;column-gap:18mm;row-gap:7mm;margin:7mm 13mm 0;text-align:center;font-size:10pt}
.firma{min-height:13mm}.firma .dato{height:6mm;border-bottom:1px solid #222;display:flex;align-items:flex-end;justify-content:center;padding-bottom:1mm;font-size:10pt;font-weight:400}.firma .rotulo{display:block;padding-top:1mm}
@media print{body{background:white}.herramientas{display:none}.pagina{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}}
</style></head><body>
<div class="herramientas"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>
<main class="pagina">
  <header class="encabezado">
    <div class="sello" aria-hidden="true"><img alt="" src="${LOGO_PRESTAMO}"></div>
    <div class="institucion"><div>CAJA COSTARRICENSE DE SEGURO SOCIAL</div><div>ÁREA DE SALUD NARANJO</div><div>SERVICIO INGENIERÍA Y MANTENIMIENTO</div></div>
    <div class="contacto">Tel. 2103-1700, ext. 1095-1096-1143-1144<br>E-mail pcrojas@ccss.sa.cr</div>
  </header>
  <h1>BOLETA DE SALIDA PARA PRÉSTAMO DE CILINDROS Y EQUIPO DE<br>REGULAR OXÍGENO A PACIENTES</h1>
  <p class="intro">Será responsabilidad de la persona a quien se le prestan los equipos velar por el buen funcionamiento y cuidado de éstos.</p>
  <p>El Área de Salud Naranjo y la C.C.S.S. no se hacen responsables por cualquier accidente que produzca este equipo fuera del Centro de Salud.</p>
  <section class="cuidados">
    <p>Seguidamente se detallan los cuidados que estos equipos deben tener:</p>
    <ol>
      <li>Los cilindros deben viajar en forma vertical en los vehículos y con su respectiva tapa y debidamente sujetados.</li>
      <li>Nunca se deben golpear ni exponer al calor o fuego.</li>
      <li>Cuando se tenga el cilindro en la casa del paciente se deben sujetar a la cama o pared para evitar que en un temblor se caigan pues en caso de quebrarse la válvula, estos se convierten en un proyectil con gran poder de destrucción.</li>
      <li>Los cilindros se entregan llenos al paciente pero una pequeña fuga en sus válvulas, puede descargarlo por lo que debe estar verificando con regularidad el contenido.</li>
      <li>El usuario debe revisar que el equipo esté suministrando normalmente el oxígeno y en caso de duda traerlo al Área de Salud donde se lo revisamos e incluso cambiarlo.</li>
      <li>No se debe transportar ni mantener el cilindro de oxígeno junto a materiales inflamables, grasa o aceite.</li>
      <li>Nunca se le debe poner aceite a la tuerca del regulador ya que produce una explosión.</li>
    </ol>
  </section>
  <p>Los equipos deben ser devueltos cuando no se necesiten ya que otras personas lo requieren.</p>
  <p>La no devolución de los cilindros, el Área de Salud tendrá la potestad de realizar el cobro de lo que cueste el cilindro de oxígeno, según los costos de la empresa TRIGAS S.A. de C.R.</p>
  <p>Los permisos deben ser renovados antes de la fecha de vencimiento, indicada en la boleta de salida de artículos.</p>
  <section class="bloque"><h2>HORARIO DE ENTREGA Y CAMBIO DE CILINDROS:</h2><p>De Lunes a Jueves de 7:00am a 3:00pm</p><p>Viernes de 7:00am a 2:00pm</p><p>Sábados, Domingos y Feriados NO se hacen cambios.</p></section>
  <section class="bloque"><h2>DEVOLUCIÓN DEFINITIVA DEL EQUIPO:</h2><p>Se deben entregar en el Servicio de Ingeniería y Mantenimiento del ASN en el Horario anteriormente mencionado.</p><p>El encargado le confeccionará un comprobante de recibido del equipo.</p></section>
  <div class="recibido"><span>Firma de recibido conforme el día</span><span class="linea">${seguro(fechaLegible)}</span><span>en el Área de Salud Naranjo</span></div>
  <div class="numero"><span>Número de Serie del Tanque de Oxígeno</span><span class="linea">${seguro(numeroSerie)}</span></div>
  <div class="firmas"><div class="firma"><span class="dato">${seguro(funcionario)}</span><span class="rotulo">Funcionario ASN</span></div><div class="firma"><span class="dato"></span><span class="rotulo">N° Cédula</span></div><div class="firma"><span class="dato">${seguro(responsable)}</span><span class="rotulo">Encargado Responsable</span></div><div class="firma"><span class="dato">${seguro(cedulaResponsable)}</span><span class="rotulo">N° Cédula</span></div></div>
</main></body></html>`;

    ventana.document.open();
    ventana.document.write(htmlBoleta);
    ventana.document.close();
    ventana.focus();
}
