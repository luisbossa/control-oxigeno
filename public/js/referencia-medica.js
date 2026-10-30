/* =========================================================
   REFERENCIA MÉDICA ADJUNTA (PDF o foto)
   Opcional. El archivo se elige en el formulario del paciente y
   se sube al servidor solo al presionar Guardar. El paciente
   guarda únicamente los datos del documento (id, nombre, tipo).
========================================================= */

const TAMANO_MAXIMO_REFERENCIA = 3 * 1024 * 1024; // Igual que en el servidor.
const LADO_MAXIMO_FOTO = 2000;

// original: documento ya guardado del paciente.
// nuevo: archivo elegido que todavía no se ha subido.
let referenciaFormulario = { original: null, nuevo: null, quitado: false };
let flujoCamaraReferencia = null;

function prepararDocumentoReferencia(paciente = null) {
    descartarArchivoNuevoReferencia();
    referenciaFormulario = { original: paciente?.referenciaDocumento || null, nuevo: null, quitado: false };
    mostrarDocumentoReferencia();
}

function documentoReferenciaActual() {
    return referenciaFormulario.nuevo || (referenciaFormulario.quitado ? null : referenciaFormulario.original);
}

function urlDocumentoReferencia(documento) {
    return documento.url || `/api/documentos/${encodeURIComponent(documento.id)}`;
}

function formatearTamanoArchivo(bytes) {
    return bytes < 1024 * 1024
        ? `${Math.max(1, Math.round(bytes / 1024))} KB`
        : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function mostrarDocumentoReferencia() {
    const documento = documentoReferenciaActual();
    document.getElementById("referenciaAdjuntoVacio").hidden = Boolean(documento);
    document.getElementById("referenciaAdjuntoArchivo").hidden = !documento;
    if (!documento) return;

    const esPDF = documento.tipo === "application/pdf";
    document.getElementById("referenciaAdjuntoNombre").textContent = documento.nombre;
    document.getElementById("referenciaAdjuntoDetalle").textContent =
        `${esPDF ? "PDF" : "Imagen"} · ${formatearTamanoArchivo(documento.tamano)}${referenciaFormulario.nuevo ? " · se guardará al presionar Guardar" : ""}`;
    document.getElementById("referenciaAdjuntoMiniatura").innerHTML = esPDF
        ? '<svg class="icono" aria-hidden="true"><use href="img/iconos.svg#file-text"></use></svg>'
        : `<img src="${textoSeguro(urlDocumentoReferencia(documento))}" alt="">`;
}

function verDocumentoReferenciaFormulario() {
    const documento = documentoReferenciaActual();
    if (documento) window.open(urlDocumentoReferencia(documento), "_blank");
}

function verDocumentoReferenciaPaciente() {
    const documento = pacienteSeleccionado?.referenciaDocumento;
    if (documento) window.open(urlDocumentoReferencia(documento), "_blank");
}

function descartarArchivoNuevoReferencia() {
    if (referenciaFormulario.nuevo?.url) URL.revokeObjectURL(referenciaFormulario.nuevo.url);
    referenciaFormulario.nuevo = null;
}

function quitarDocumentoReferencia() {
    if (referenciaFormulario.nuevo) descartarArchivoNuevoReferencia();
    else referenciaFormulario.quitado = true;
    mostrarDocumentoReferencia();
}

/* ---------------------------------------------------------
   Cargar archivo (PDF o imagen) o foto
--------------------------------------------------------- */

function blobABase64(blob) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(String(lector.result).split(",")[1] || "");
        lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
        lector.readAsDataURL(blob);
    });
}

// Reduce la foto y la convierte a JPG para que pese poco.
async function comprimirImagenReferencia(fuente) {
    let imagen;
    try {
        imagen = await createImageBitmap(fuente, { imageOrientation: "from-image" });
    } catch {
        throw new Error("No se pudo leer la imagen. Use una foto en formato JPG o PNG.");
    }
    const escala = Math.min(1, LADO_MAXIMO_FOTO / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    imagen.close?.();

    for (const calidad of [0.85, 0.7, 0.55]) {
        const blob = await new Promise(resolve => lienzo.toBlob(resolve, "image/jpeg", calidad));
        if (blob && blob.size <= TAMANO_MAXIMO_REFERENCIA) return blob;
    }
    throw new Error("La foto es demasiado grande. Intente con otra de menor resolución.");
}

async function adjuntarArchivoReferencia(fuente, nombre) {
    let blob = fuente;
    let tipo = fuente.type;
    if (tipo.startsWith("image/")) {
        blob = await comprimirImagenReferencia(fuente);
        tipo = "image/jpeg";
        nombre = nombre.replace(/\.[^.]*$/, "") + ".jpg";
    } else if (tipo !== "application/pdf") {
        throw new Error("Solo se permiten archivos PDF o imágenes.");
    }
    if (blob.size > TAMANO_MAXIMO_REFERENCIA)
        throw new Error(`El archivo pesa ${formatearTamanoArchivo(blob.size)}. El máximo es 3 MB.`);

    descartarArchivoNuevoReferencia();
    referenciaFormulario.nuevo = {
        nombre,
        tipo,
        tamano: blob.size,
        contenido: await blobABase64(blob),
        url: URL.createObjectURL(blob)
    };
    mostrarDocumentoReferencia();
}

async function cargarArchivoReferencia(entrada) {
    const archivo = entrada.files?.[0];
    entrada.value = ""; // Permite volver a elegir el mismo archivo.
    if (!archivo) return;
    try {
        await adjuntarArchivoReferencia(archivo, archivo.name || nombreFotoReferencia());
    } catch (error) {
        mostrarPopup(error.message, "error");
    }
}

function nombreFotoReferencia() {
    return `referencia-${fechaHoyLocal()}.jpg`;
}

/* ---------------------------------------------------------
   Cámara
   En celulares y tabletas se abre la cámara del dispositivo.
   En computadoras se usa la cámara web dentro del sistema.
--------------------------------------------------------- */

async function tomarFotoReferencia() {
    const esTactil = window.matchMedia("(pointer: coarse)").matches;
    if (esTactil || !navigator.mediaDevices?.getUserMedia) {
        document.getElementById("referenciaCamaraNativa").click();
        return;
    }
    try {
        flujoCamaraReferencia = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false
        });
    } catch {
        mostrarPopup("No se pudo abrir la cámara (no hay una conectada o no se dio permiso). Puede subir una foto desde un archivo.", "advertencia");
        return;
    }
    document.getElementById("videoCamaraReferencia").srcObject = flujoCamaraReferencia;
    const modal = document.getElementById("modalCamaraReferencia");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function cerrarCamaraReferencia() {
    flujoCamaraReferencia?.getTracks().forEach(pista => pista.stop());
    flujoCamaraReferencia = null;
    document.getElementById("videoCamaraReferencia").srcObject = null;
    const modal = document.getElementById("modalCamaraReferencia");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

async function capturarFotoReferencia() {
    const video = document.getElementById("videoCamaraReferencia");
    if (!video.videoWidth) return;
    const lienzo = document.createElement("canvas");
    lienzo.width = video.videoWidth;
    lienzo.height = video.videoHeight;
    lienzo.getContext("2d").drawImage(video, 0, 0);
    const foto = await new Promise(resolve => lienzo.toBlob(resolve, "image/jpeg", 0.92));
    cerrarCamaraReferencia();
    try {
        await adjuntarArchivoReferencia(foto, nombreFotoReferencia());
    } catch (error) {
        mostrarPopup(error.message, "error");
    }
}

/* ---------------------------------------------------------
   Guardado (lo usan guardarPaciente y guardarNuevoPaciente)
--------------------------------------------------------- */

// Sube el archivo nuevo, si hay, y devuelve el documento que debe quedar en el paciente.
async function subirDocumentoReferencia(pacienteId) {
    const { original, nuevo, quitado } = referenciaFormulario;
    if (!nuevo) return quitado ? null : original;
    const { documento } = await api("/api/documentos", {
        method: "POST",
        body: JSON.stringify({ pacienteId, nombre: nuevo.nombre, tipo: nuevo.tipo, contenido: nuevo.contenido })
    });
    return documento;
}

// Borra del servidor el documento que fue reemplazado o quitado.
function eliminarDocumentoReferenciaAnterior(anterior, actual) {
    if (!anterior?.id || anterior.id === actual?.id) return;
    api(`/api/documentos/${encodeURIComponent(anterior.id)}`, { method: "DELETE" }).catch(() => {});
}
