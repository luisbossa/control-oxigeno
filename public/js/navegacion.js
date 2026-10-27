/* =========================================================
   NAVEGACIÓN
========================================================= */

function alternarBarraLateral(abrir) {
    const barra = document.getElementById("barraLateral");
    const fondo = document.getElementById("fondoBarraLateral");
    const abierta = abrir ?? barra.classList.contains("-translate-x-full");
    barra.classList.toggle("-translate-x-full", !abierta);
    fondo.classList.toggle("hidden", !abierta);
}

function toggleMenuInstitucional() {
    const submenu = document.getElementById("submenuInstitucional");
    const flecha = document.getElementById("flechaMenuInstitucional");
    const estabaCerrado = submenu?.classList.contains("hidden");
    submenu?.classList.toggle("hidden");
    flecha?.classList.toggle("rotate-180", estabaCerrado);
    if (estabaCerrado) mostrarInstitucional(seccionInstitucionalActiva || "resumen");
}
