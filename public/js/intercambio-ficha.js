/* =========================================================
   INTERCAMBIO DESDE FICHA DEL PACIENTE
========================================================= */

function irAIntercambioPaciente() {

    if (!pacienteSeleccionado) return;


    const paciente =
        pacienteSeleccionado;


    mostrarVista("intercambio");


    document.getElementById("buscarPaciente").value =
        paciente.cedula;


    buscarPacienteIntercambio();

}
