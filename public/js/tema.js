/* =========================================================
   TEMAS DE COLOR
   Se carga en <head> para aplicar el tema antes de mostrar la
   página. La elección se guarda en este navegador.
========================================================= */

const TEMAS = [
    { id: "azul", nombre: "Azul institucional", muestra: "#1f5598" },
    { id: "verde", nombre: "Verde", muestra: "#1b683e" },
    { id: "turquesa", nombre: "Turquesa", muestra: "#12636c" },
    { id: "morado", nombre: "Morado", muestra: "#583d94" },
    { id: "grafito", nombre: "Grafito", muestra: "#3f4857" }
];
const CLAVE_TEMA = "ccss_tema";

function leerTemaGuardado() {
    try {
        const id = localStorage.getItem(CLAVE_TEMA);
        return TEMAS.some(tema => tema.id === id) ? id : "azul";
    } catch {
        return "azul";
    }
}

function aplicarTema(id) {
    const tema = TEMAS.find(item => item.id === id) || TEMAS[0];
    if (tema.id === "azul") delete document.documentElement.dataset.tema;
    else document.documentElement.dataset.tema = tema.id;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", tema.muestra);
    document.querySelectorAll(".opcion-tema").forEach(opcion =>
        opcion.setAttribute("aria-checked", String(opcion.dataset.tema === tema.id)));
}

function elegirTema(id) {
    aplicarTema(id);
    try { localStorage.setItem(CLAVE_TEMA, id); } catch { /* Sin almacenamiento: el tema dura hasta recargar. */ }
    alternarSelectorTema(null, false);
}

function alternarSelectorTema(event, forzar = null) {
    event?.stopPropagation();
    const panel = document.getElementById("panelSelectorTema");
    if (!panel) return;
    const abrir = forzar === null ? panel.hidden : forzar;
    panel.hidden = !abrir;
    document.getElementById("botonSelectorTema")?.setAttribute("aria-expanded", String(abrir));
}

function construirSelectorTema() {
    const panel = document.getElementById("panelSelectorTema");
    if (!panel) return;
    panel.innerHTML = `<p class="selector-tema-titulo">Tema de color</p>` + TEMAS.map(tema => `
        <button type="button" role="menuitemradio" class="opcion-tema" data-tema="${tema.id}" aria-checked="false" onclick="elegirTema('${tema.id}')">
            <span class="opcion-tema-muestra" style="background:${tema.muestra}"></span>
            <span>${tema.nombre}</span>
            <svg class="icono" aria-hidden="true"><use href="img/iconos.svg#check"></use></svg>
        </button>`).join("");
    aplicarTema(leerTemaGuardado());
    panel.addEventListener("click", event => event.stopPropagation());
    document.addEventListener("click", () => alternarSelectorTema(null, false));
    document.addEventListener("keydown", event => { if (event.key === "Escape") alternarSelectorTema(null, false); });
}

aplicarTema(leerTemaGuardado());
document.addEventListener("DOMContentLoaded", construirSelectorTema);
