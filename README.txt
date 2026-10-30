SISTEMA DE CONTROL DE OXIGENO - CCSS
====================================

REQUISITO
---------
Node.js 22 o superior.

USO LOCAL
---------
1. Abra una terminal en esta carpeta.
2. La primera vez ejecute:  npm install
3. Inicie el sistema:       npm start
4. Abra http://localhost:3000
5. No cierre la terminal mientras el sistema este en uso (Ctrl+C lo detiene).

Primer ingreso: si la base esta vacia, el sistema pide crear la cuenta
administradora. Desde "Usuarios" (icono en la parte inferior del menu) el
administrador crea las cuentas del resto del equipo.

Perfiles:
- Administrador: usa el sistema y ademas registra, edita y elimina pacientes,
  cilindros y ubicaciones institucionales; tambien administra los usuarios.
- Funcionario: solo usa el sistema (intercambios, devoluciones, cambios en
  EBAIS/ambulancias, devolucion al proveedor, boletas). No puede registrar,
  editar ni eliminar informacion; el servidor tambien lo impide.

El servidor local solo acepta conexiones desde esta misma computadora.

DATOS
-----
La informacion se guarda en SQLite:  datos/oxigeno.db

Tablas: pacientes, cilindros, ubicaciones (EBAIS, ambulancias, emergencias,
manifold), devoluciones_proveedor, usuarios, notificaciones_leidas, bitacora
(registro de quien guardo o elimino cada dato y cuando) y documentos (PDF o
foto de la referencia medica de cada paciente, maximo 3 MB por archivo).

Respaldos automaticos cada 30 minutos en respaldos/oxigeno-<fecha>.db
(se conservan los ultimos 30). Para restaurar uno: detenga el servidor, copielo
como datos/oxigeno.db e inicie de nuevo.

Varios usuarios pueden trabajar a la vez: cada equipo envia solo lo que cambio
y recibe los cambios de los demas cada 30 segundos o al volver a la pestana.

PUBLICAR EN VERCEL
------------------
1. Suba el proyecto a un repositorio (GitHub, GitLab o Bitbucket).
   Las carpetas datos/ y respaldos/ estan excluidas en .gitignore y
   .vercelignore: los datos de pacientes nunca se suben.
2. En vercel.com: Add New > Project > importe el repositorio.
   Framework Preset: Other. No cambie los demas valores (vercel.json ya
   configura la carpeta public y la API).
3. En Settings > Environment Variables agregue:
     SESION_SECRETO = una cadena aleatoria larga (minimo 32 caracteres)
4. Deploy. Al abrir la URL, cree la cuenta administradora.

IMPORTANTE SOBRE VERCEL Y SQLITE:
Vercel no tiene disco permanente. Sin configuracion adicional la base SQLite
se crea en /tmp y SE BORRA cuando Vercel reinicia la funcion (tras minutos sin
uso o en cada despliegue), y cada instancia puede tener su propia copia.
Para conservar los datos use Turso (SQLite alojado, plan gratuito):
  1. Cree una base en turso.tech.
  2. Agregue en Vercel las variables TURSO_DATABASE_URL y TURSO_AUTH_TOKEN.
  3. Vuelva a desplegar. No hay que cambiar codigo.
Las mismas variables en un archivo .env permiten usar Turso tambien en local
(vea .env.example).

ESTRUCTURA DEL PROYECTO
-----------------------
server.js              Servidor local: entrega public/ y la API
api/index.js           Funcion de Vercel que atiende /api/*
vercel.json            Configuracion de Vercel
servidor/
  aplicacion.js        Rutas de la API (sesion, datos, usuarios)
  base-datos.js        SQLite: esquema, migracion, lectura y sincronizacion
  autenticacion.js     Contrasenas (PBKDF2) y sesiones en cookie firmada
datos/                 Base SQLite local (no se publica)
respaldos/             Copias automaticas de la base (no se publica)
public/                Todo lo que ve el navegador
  index.html           Estructura de la pagina
  favicon.ico
  fonts/               Tipografias IBM Plex Sans y Plex Mono (licencia OFL)
  img/                 Imagenes
  img/iconos.svg       Iconos Lucide (https://lucide.dev). Uso en HTML:
                         <svg class="icono"><use href="img/iconos.svg#bell"></use></svg>
                       En JS: iconoSVG("bell"). Para agregar uno nuevo, copie el
                       contenido del SVG de lucide.dev dentro de un <symbol id="nombre">.
  css/estilos.css      Estilos propios del sistema (agregue aqui los estilos nuevos)
  css/utilidades.css   Clases utilitarias fijas (no editar)
  css/temas.css        Temas de color (paletas y selector)
  js/tema.js           Selector de tema; se carga en <head> antes que el resto
  js/                  Logica separada por modulo, cargada en este orden:
    configuracion.js     Variables generales e iconos
    popups.js            Avisos y confirmaciones
    datos.js             Carga, normalizacion y sincronizacion con el servidor
    navegacion.js        Menu lateral
    institucionales.js   EBAIS, ambulancias, emergencias y manifold
    vistas.js            Cambio de vista y seleccion de bodega
    pacientes.js         Listado, ficha, regulador e historial del paciente
    intercambio.js       Intercambio, boletas de salida, prestamo y devolucion
    inventario.js        Bodegas de llenos y vacios, devolucion al proveedor
    nuevo-paciente.js    Registro y edicion de pacientes
    referencia-medica.js PDF o foto de la referencia medica (opcional)
    nuevo-cilindro.js    Registro y edicion de cilindros
    exportar-historial.js Exportar historial del paciente
    utilidades.js        Funciones de apoyo (fechas, formatos)
    notificaciones.js    Centro de notificaciones
    reloj.js             Fecha y hora del encabezado
    sesion.js            Ingreso, salida, usuarios y cambio de contrasena
    inicio.js            Arranque del sistema

Los archivos JS comparten variables globales: respete el orden en index.html.

IMPORTANTE
----------
- Nunca abra el HTML directamente. Ingrese siempre por el servidor.
- El sistema contiene datos de pacientes: use contrasenas robustas, no comparta
  cuentas y desactive las de personas que dejen de usar el sistema.
- Para uso institucional definitivo, siga las politicas de seguridad de la CCSS.
