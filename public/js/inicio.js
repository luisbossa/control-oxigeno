/* =========================================================
   INICIALIZACIÓN
========================================================= */

function restaurarInterfazTrasCarga() {
    const estadoUI = estadoUIActual;
    if (estadoUI?.busquedaPacientes && document.getElementById("buscarPacientes")) {
        document.getElementById("buscarPacientes").value = estadoUI.busquedaPacientes;
    }
    renderPacientes();
    if (estadoUI?.pacienteId && pacientes.some(p => p.id === estadoUI.pacienteId)) {
        abrirPaciente(estadoUI.pacienteId);
    } else {
        mostrarVista(estadoUI?.vista || "panel");
    }
    calcularNotificacionesSistema();
}

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        document.getElementById("formularioAcceso").addEventListener("submit", procesarAcceso);
        document.getElementById("formularioNuevoUsuario").addEventListener("submit", crearUsuarioSistema);
        document.getElementById("formularioCambioClave").addEventListener("submit", guardarCambioClave);
        document.getElementById("formularioClaveAdmin").addEventListener("submit", guardarCambioClave);
        document.getElementById("formularioRestablecerClave").addEventListener("submit", guardarRestablecerClave);

        await iniciarSistema();

        // Al volver a la pestaña se traen los cambios de otros usuarios.
        document.addEventListener("visibilitychange", () => { if (!document.hidden) refrescarDatos(); });

        // En tablet y celular, cerrar el menú al elegir una opción (excepto al desplegar Institucionales).
        document.getElementById("barraLateral").addEventListener("click", function(event) {
            if (event.target.closest("button") && !event.target.closest("#nav-institucionales")) alternarBarraLateral(false);
        });
        document.addEventListener("keydown", event => { if (event.key === "Escape") alternarBarraLateral(false); });

        actualizarReloj();

        setInterval(
            actualizarReloj,
            1000
        );

        setInterval(calcularNotificacionesSistema, 60000);

        // Refuerzo de persistencia antes de cerrar o recargar la aplicación.
        window.addEventListener("pagehide", () => guardarDatos(true));

        document.getElementById("buscarPacientes")?.addEventListener("input", guardarDatos);

        document.addEventListener("click", function(event) {
            const panel = document.getElementById("panelNotificaciones");
            const boton = document.getElementById("botonNotificaciones");
            if (panel && boton && !panel.classList.contains("hidden") && !panel.contains(event.target) && !boton.contains(event.target)) {
                panel.classList.add("hidden");
            }
        });

    }
);
