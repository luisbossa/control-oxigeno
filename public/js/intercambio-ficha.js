/* =========================================================
   INTERCAMBIO DESDE FICHA DEL PACIENTE
========================================================= */

function irAIntercambioPaciente() {

    if (!pacienteSeleccionado) return;
    if (pacienteFallecido(pacienteSeleccionado)) {
        alert("El expediente está inactivo por fallecimiento. No se pueden registrar intercambios.");
        return;
    }


    const paciente =
        pacienteSeleccionado;


    mostrarVista("intercambio");


    document.getElementById("buscarPaciente").value =
        paciente.cedula;


    buscarPacienteIntercambio();

}
