/* =========================================================
   SESIÓN Y USUARIOS
========================================================= */

let usuarioEnSesion = null;
let sistemaConfigurado = true;
let usuariosRegistrados = [];
let temporizadorRefresco = null;
let cambiosRetenidos = null; // Cambios sin guardar al vencer la sesión.

function mostrarPantalla(estado) {
    document.body.dataset.sesion = estado; // "cargando" | "acceso" | "activa"
}

function mostrarErrorAcceso(mensaje) {
    const error = document.getElementById("errorAcceso");
    error.textContent = mensaje;
    error.hidden = false;
}

function configurarFormularioAcceso() {
    const primerUso = !sistemaConfigurado;
    document.getElementById("tituloAcceso").textContent = primerUso ? "Crear cuenta administradora" : "Iniciar sesión";
    document.getElementById("descripcionAcceso").textContent = primerUso
        ? "Es el primer ingreso. Esta cuenta podrá crear los usuarios del resto del equipo."
        : "Ingrese con su usuario y contraseña.";
    document.getElementById("camposPrimerAdministrador").hidden = !primerUso;
    document.getElementById("campoConfirmarClave").hidden = !primerUso;
    document.getElementById("accesoNombre").required = primerUso;
    document.getElementById("accesoClaveConfirmar").required = primerUso;
    document.getElementById("accesoClave").autocomplete = primerUso ? "new-password" : "current-password";
    document.getElementById("botonAcceso").textContent = primerUso ? "Crear cuenta e ingresar" : "Ingresar";
    document.getElementById("errorAcceso").hidden = true;
}

function mostrarAcceso() {
    usuarioEnSesion = null;
    datosServidorCargados = false;
    clearInterval(temporizadorRefresco);
    configurarFormularioAcceso();
    mostrarPantalla("acceso");
    document.getElementById(sistemaConfigurado ? "accesoUsuario" : "accesoNombre").focus();
}

function aplicarUsuario(usuario) {
    usuarioEnSesion = usuario;
    FUNCIONARIO_ACTUAL = usuario.nombre;
    document.getElementById("nombreUsuarioSesion").textContent = usuario.nombre;
    document.getElementById("nombreUsuarioSesion").title = usuario.nombre;
    document.getElementById("rolUsuarioSesion").textContent = usuario.rol === "administrador" ? "Administrador" : "Funcionario";
    document.getElementById("inicialesUsuario").textContent = iniciales(usuario.nombre) || "US";
    document.getElementById("botonGestionUsuarios").hidden = usuario.rol !== "administrador";
}

// Envía los cambios que quedaron pendientes cuando venció la sesión (solo si vuelve el mismo usuario).
async function recuperarCambiosRetenidos(usuario) {
    if (!cambiosRetenidos) return;
    const { usuarioId, nombre, cambios } = cambiosRetenidos;
    cambiosRetenidos = null;
    if (usuarioId !== usuario.id) {
        mostrarPopup(`Había cambios sin guardar de ${nombre} cuando venció su sesión. No se aplicaron a esta cuenta.`, "advertencia");
        return;
    }
    try {
        await api("/api/sincronizar", { method: "POST", body: JSON.stringify({ cambios }) });
        mostrarPopup("Se guardaron los cambios que quedaron pendientes al vencer la sesión.", "exito");
    } catch (error) {
        mostrarPopup(`No se pudieron guardar los cambios pendientes: ${error.message}`, "error");
    }
}

async function entrarAlSistema(usuario) {
    aplicarUsuario(usuario);
    try {
        await recuperarCambiosRetenidos(usuario);
        aplicarDatosServidor(await api("/api/datos"));
        restaurarInterfazTrasCarga();
        mostrarPantalla("activa");
        clearInterval(temporizadorRefresco);
        temporizadorRefresco = setInterval(refrescarDatos, INTERVALO_REFRESCO);
    } catch (error) {
        mostrarAcceso();
        mostrarErrorAcceso(error.message);
    }
}

async function iniciarSistema() {
    try {
        const estado = await api("/api/estado");
        sistemaConfigurado = estado.configurado;
        if (estado.usuario) return entrarAlSistema(estado.usuario);
        mostrarAcceso();
    } catch (error) {
        mostrarAcceso();
        mostrarErrorAcceso("No se pudo conectar con el servidor. Verifique que esté en ejecución.");
    }
}

async function procesarAcceso(event) {
    event.preventDefault();
    const boton = document.getElementById("botonAcceso");
    const cuenta = document.getElementById("accesoUsuario").value;
    const clave = document.getElementById("accesoClave").value;
    document.getElementById("errorAcceso").hidden = true;

    let ruta = "/api/login";
    let cuerpo = { cuenta, clave };
    if (!sistemaConfigurado) {
        const nombre = document.getElementById("accesoNombre").value.trim();
        if (clave.length < 8) return mostrarErrorAcceso("La contraseña debe tener al menos 8 caracteres.");
        if (clave !== document.getElementById("accesoClaveConfirmar").value) return mostrarErrorAcceso("Las contraseñas no coinciden.");
        ruta = "/api/configurar";
        cuerpo = { nombre, cuenta, clave };
    }

    boton.disabled = true;
    try {
        const respuesta = await api(ruta, { method: "POST", body: JSON.stringify(cuerpo) });
        sistemaConfigurado = true;
        event.target.reset();
        await entrarAlSistema(respuesta.usuario);
    } catch (error) {
        mostrarErrorAcceso(error.message);
    } finally {
        boton.disabled = false;
    }
}

async function cerrarSesion() {
    await guardarDatos(true);
    if (hayCambiosPendientes()) {
        const salir = await confirmarAccion({
            titulo: "Hay cambios sin guardar",
            mensaje: "No se pudieron guardar los últimos cambios en el servidor. Si sale ahora, se perderán.",
            aceptar: "Salir de todos modos"
        });
        if (!salir) return;
    }
    try { await api("/api/logout", { method: "POST", body: "{}" }); } catch (error) { console.warn(error); }
    cerrarGestionUsuarios();
    mostrarAcceso();
}

// Llamada cuando el servidor responde 401 durante el uso.
function sesionVencida() {
    if (!usuarioEnSesion) return;
    if (hayCambiosPendientes() || notificacionesLeidas.some(id => !leidasSincronizadas.has(id))) {
        cambiosRetenidos = {
            usuarioId: usuarioEnSesion.id,
            nombre: usuarioEnSesion.nombre,
            cambios: calcularCambios(instantaneaSincronizada, instantaneaActual())
        };
    }
    clearTimeout(temporizadorReintento);
    cerrarGestionUsuarios();
    mostrarAcceso();
    mostrarErrorAcceso("La sesión venció. Ingrese nuevamente; los cambios no guardados se reintentarán al volver.");
}

// Confirmación genérica reutilizando el diálogo de eliminación.
function confirmarAccion({ titulo, mensaje, aceptar = "Aceptar" }) {
    return confirmarEliminacion({ titulo, nombre: "", detalle: mensaje, textoAceptar: aceptar });
}

/* ---------------------------------------------------------
   Cambio de la contraseña propia
--------------------------------------------------------- */

function abrirCambioClave() {
    document.getElementById("formularioCambioClave").reset();
    abrirModal("modalCambioClave");
    document.getElementById("claveActual").focus();
}

// Sirve para el modal del menú lateral y para la pestaña "Mi contraseña" de la administración.
async function guardarCambioClave(event) {
    event.preventDefault();
    const formulario = event.target;
    const { actual, nueva, confirmar } = formulario.elements;
    if (nueva.value !== confirmar.value) return mostrarPopup("Las contraseñas nuevas no coinciden.", "advertencia");
    try {
        await api("/api/cuenta/clave", { method: "POST", body: JSON.stringify({ actual: actual.value, nueva: nueva.value }) });
        formulario.reset();
        cerrarModal("modalCambioClave");
        mostrarPopup("Su contraseña se actualizó correctamente.", "exito");
    } catch (error) {
        mostrarPopup(error.message, "error");
    }
}

/* ---------------------------------------------------------
   Administración de usuarios (solo administradores)
--------------------------------------------------------- */

function abrirModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

async function abrirGestionUsuarios() {
    if (usuarioEnSesion?.rol !== "administrador") return;
    try {
        await cargarUsuarios();
        mostrarPestanaAdmin("usuarios");
        abrirModal("modalGestionUsuarios");
    } catch (error) {
        mostrarPopup(error.message, "error");
    }
}

function cerrarGestionUsuarios() {
    cerrarModal("modalGestionUsuarios");
}

function mostrarPestanaAdmin(nombre) {
    document.querySelectorAll(".pestana-admin").forEach(boton => {
        const activa = boton.dataset.pestanaAdmin === nombre;
        boton.classList.toggle("activo", activa);
        boton.setAttribute("aria-selected", activa);
    });
    document.getElementById("panelAdminUsuarios").hidden = nombre !== "usuarios";
    document.getElementById("panelAdminClave").hidden = nombre !== "clave";
    if (nombre === "clave") {
        document.getElementById("formularioClaveAdmin").reset();
        document.querySelector("#formularioClaveAdmin [name=actual]").focus();
    }
}

async function cargarUsuarios() {
    usuariosRegistrados = (await api("/api/usuarios")).usuarios;
    renderUsuarios();
}

function renderUsuarios() {
    const formatoFecha = valor => valor ? new Date(valor).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" }) : "Nunca";
    document.getElementById("listaUsuarios").innerHTML = usuariosRegistrados.map(usuario => {
        const propio = usuario.id === usuarioEnSesion?.id;
        return `
        <div class="usuario-fila${usuario.activo ? "" : " usuario-inactivo"}">
            <span class="sesion-avatar">${textoSeguro(iniciales(usuario.nombre))}</span>
            <div class="min-w-0">
                <p class="font-medium text-slate-900">${textoSeguro(usuario.nombre)}${propio ? ' <span class="text-xs text-slate-500">(usted)</span>' : ""}</p>
                <p class="text-xs text-slate-500"><span class="font-mono">@${textoSeguro(usuario.cuenta)}</span> · Último ingreso: ${formatoFecha(usuario.ultimoIngreso)}</p>
            </div>
            <div class="usuario-acciones">
                <select class="usuario-rol" onchange="cambiarRolUsuario('${usuario.id}', this.value)" ${propio ? "disabled" : ""} aria-label="Rol de ${textoSeguro(usuario.nombre)}">
                    <option value="funcionario" ${usuario.rol === "funcionario" ? "selected" : ""}>Funcionario</option>
                    <option value="administrador" ${usuario.rol === "administrador" ? "selected" : ""}>Administrador</option>
                </select>
                <span class="badge ${usuario.activo ? "badge-green" : "badge-gray"}">${usuario.activo ? "Activo" : "Inactivo"}</span>
                <button type="button" class="boton boton-secundario boton-chico" onclick="${propio ? "mostrarPestanaAdmin('clave')" : `restablecerClaveUsuario('${usuario.id}')`}">${iconoSVG("key-round")} Cambiar contraseña</button>
                ${propio ? "" : `<button type="button" class="boton-icono" title="${usuario.activo ? "Desactivar" : "Activar"}" onclick="cambiarEstadoUsuario('${usuario.id}')">${iconoSVG(usuario.activo ? "lock" : "lock-open")}</button>
                <button type="button" class="boton-icono boton-icono-peligro" title="Eliminar" onclick="eliminarUsuarioSistema('${usuario.id}')">${iconoSVG("trash-2")}</button>`}
            </div>
        </div>`;
    }).join("");
}

async function actualizarUsuarioSistema(id, cambios, mensajeExito) {
    try {
        await api(`/api/usuarios/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(cambios) });
        await cargarUsuarios();
        if (mensajeExito) mostrarPopup(mensajeExito, "exito");
    } catch (error) {
        mostrarPopup(error.message, "error");
        await cargarUsuarios().catch(() => {});
    }
}

async function crearUsuarioSistema(event) {
    event.preventDefault();
    try {
        await api("/api/usuarios", { method: "POST", body: JSON.stringify({
            nombre: document.getElementById("nuevoUsuarioNombre").value.trim(),
            cuenta: document.getElementById("nuevoUsuarioCuenta").value,
            clave: document.getElementById("nuevoUsuarioClave").value,
            rol: document.getElementById("nuevoUsuarioRol").value
        }) });
        event.target.reset();
        await cargarUsuarios();
        mostrarPopup("Usuario creado. Comparta la contraseña temporal por un medio seguro.", "exito");
    } catch (error) {
        mostrarPopup(error.message, "error");
    }
}

function cambiarRolUsuario(id, rol) {
    actualizarUsuarioSistema(id, { rol });
}

function cambiarEstadoUsuario(id) {
    const usuario = usuariosRegistrados.find(item => item.id === id);
    if (usuario) actualizarUsuarioSistema(id, { activo: !usuario.activo });
}

function restablecerClaveUsuario(id) {
    const usuario = usuariosRegistrados.find(item => item.id === id);
    if (!usuario) return;
    document.getElementById("restablecerClaveUsuarioId").value = id;
    document.getElementById("restablecerClaveNombre").textContent = usuario.nombre;
    document.getElementById("formularioRestablecerClave").reset();
    abrirModal("modalRestablecerClave");
    document.getElementById("restablecerClaveNueva").focus();
}

async function guardarRestablecerClave(event) {
    event.preventDefault();
    const id = document.getElementById("restablecerClaveUsuarioId").value;
    const clave = document.getElementById("restablecerClaveNueva").value;
    cerrarModal("modalRestablecerClave");
    await actualizarUsuarioSistema(id, { clave }, "Contraseña restablecida.");
}

async function eliminarUsuarioSistema(id) {
    const usuario = usuariosRegistrados.find(item => item.id === id);
    if (!usuario) return;
    const confirmado = await confirmarEliminacion({ titulo: "¿Eliminar usuario?", nombre: usuario.nombre, detalle: "La cuenta ya no podrá ingresar al sistema. Los registros que hizo se conservan." });
    if (!confirmado) return;
    try {
        await api(`/api/usuarios/${encodeURIComponent(id)}`, { method: "DELETE" });
        await cargarUsuarios();
    } catch (error) {
        mostrarPopup(error.message, "error");
    }
}
