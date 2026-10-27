/* =========================================================
   CONFIGURACIÓN
========================================================= */

// Devuelve el marcado de un ícono del sprite img/iconos.svg (Lucide).
function iconoSVG(nombre, clases = "") {
    return `<svg class="icono${clases ? " " + clases : ""}" aria-hidden="true"><use href="img/iconos.svg#${nombre}"></use></svg>`;
}

let FUNCIONARIO_ACTUAL = "Funcionario CCSS";
