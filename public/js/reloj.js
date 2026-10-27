/* =========================================================
   RELOJ
========================================================= */

function actualizarReloj() {

    const ahora = new Date();


    document.getElementById("currentDate").textContent =
        ahora.toLocaleDateString(
            "es-CR",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );


    document.getElementById("currentTime").textContent =
        ahora.toLocaleTimeString(
            "es-CR",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

}
