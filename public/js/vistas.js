function mostrarVista(vista) {

    vistaActual = vista;

    const vistas = [
        "panel",
        "intercambio",
        "pacientes",
        "paciente-detalle",
        "cilindros",
        "institucionales"
    ];

    vistas.forEach(v => {
        const elemento = document.getElementById("view-" + v);
        if (elemento) elemento.classList.add("hidden-view");
    });

    // Cada módulo se muestra como una vista independiente.
    // Al abrir el expediente de un paciente, el directorio se oculta
    // y queda visible únicamente la ficha/historial del paciente.
    const activa = document.getElementById("view-" + vista);
    if (activa) activa.classList.remove("hidden-view");

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    // El detalle pertenece al módulo Pacientes, por lo que Pacientes sigue activo.
    const navVista = vista === "paciente-detalle" ? "pacientes" : vista;
    document.getElementById("nav-" + navVista)?.classList.add("active");

    const titulos = {
        intercambio: "Intercambio de Cilindro",
        pacientes: "Gestión de Pacientes",
        "paciente-detalle": "Gestión de Pacientes",
        cilindros: "Inventario General de Cilindros",
        institucionales: "Cilindros Institucionales"
    };

    if (titulos[vista] && document.getElementById("page-title")) {
        document.getElementById("page-title").textContent = titulos[vista];
    }

    if (vista === "pacientes" || vista === "paciente-detalle") {
        renderPacientes();
    }

    if (vista === "cilindros") {
        bodegaActiva = null;
        document.getElementById("inventarioPlaceholder").classList.remove("hidden");
        document.getElementById("moduloLlenos").classList.add("hidden");
        document.getElementById("moduloVacios").classList.add("hidden");
        document.getElementById("btn-bodega-llenos").classList.remove("active-tab");
        document.getElementById("btn-bodega-vacios").classList.remove("active-tab");
    }

    if (vista === "institucionales") {
        renderInstitucionales();
    }

    if (vista === "panel") {
        renderPanel();
    }

    guardarDatos();
}



/* =========================================================
   SELECCIÓN DE BODEGA EN INVENTARIO
========================================================= */

function seleccionarBodega(tipo) {
    bodegaActiva = tipo;

    const placeholder = document.getElementById("inventarioPlaceholder");
    const modLlenos = document.getElementById("moduloLlenos");
    const modVacios = document.getElementById("moduloVacios");
    const btnLlenos = document.getElementById("btn-bodega-llenos");
    const btnVacios = document.getElementById("btn-bodega-vacios");

    placeholder.classList.add("hidden");

    if (tipo === 'llenos') {
        modLlenos.classList.remove("hidden");
        modVacios.classList.add("hidden");
        btnLlenos.classList.add("active-tab");
        btnVacios.classList.remove("active-tab");
    } else {
        modVacios.classList.remove("hidden");
        modLlenos.classList.add("hidden");
        btnVacios.classList.add("active-tab");
        btnLlenos.classList.remove("active-tab");
    }

    renderCilindros();
}
