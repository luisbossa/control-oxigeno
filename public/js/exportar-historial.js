/* =========================================================
   EXPORTAR HISTORIAL DEL PACIENTE
========================================================= */

function exportarHistorialPaciente() {

    if (
        !pacienteSeleccionado ||
        !pacienteSeleccionado.historial.length
    ) {

        alert(
            "Este paciente no tiene historial para exportar."
        );

        return;

    }


    const encabezados = [

        "Fecha",

        "Paciente",

        "Identificacion",

        "Cilindro recibido",

        "Cilindro entregado",

        "Tipo cilindro",

        "Fecha recepción proveedor",

        "Fecha entrega",

        "Cambio programado 4 meses",

        "Vencimiento fisico",

        "Discrepancia",

        "Motivo discrepancia",

        "Tipo persona",

        "Persona que retira",

        "Identificacion receptor",

        "Funcionario",

        "Observaciones"

    ];


    const filas =
        pacienteSeleccionado.historial.map(h => [

            formatearFechaCompleta(h.fecha),

            pacienteSeleccionado.nombre,

            pacienteSeleccionado.cedula,

            h.cilindroRecibido,

            h.cilindroEntregado,

            h.tipoCilindroEntregado,

            h.fechaRecepcion || "",

            h.fechaEntrega || "",

            h.fechaCambio || h.fechaAlertaCambio || "",

            h.fechaVencimientoUso || "",

            h.discrepancia ? "SI" : "NO",

            h.motivoDiscrepancia,

            h.personaRetira.tipo,

            h.personaRetira.nombre,

            h.personaRetira.cedula,

            h.funcionario,

            h.observaciones

        ]);


    const csv = [

        encabezados,

        ...filas

    ]

    .map(row =>
        row.map(campo =>
            `"${String(campo || "")
                .replace(/"/g, '""')}"`
        ).join(",")
    )

    .join("\n");


    const blob =
        new Blob(
            ["\ufeff" + csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download =
        "historial_" +
        pacienteSeleccionado.cedula.replace(
            /[^a-zA-Z0-9]/g,
            "_"
        ) +
        ".csv";


    link.click();


    URL.revokeObjectURL(url);

}
