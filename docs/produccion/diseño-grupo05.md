## 2.1. Diseño de la Infraestructura Docker

### a) packages/api/Dockerfile.prod

#### 1. Propósito
El propósito de este archivo es definir la construcción automatizad de la imagen de ejecución para la API de Alentapp (backend basado en Fastify). Es necesario para garantizar un entorno productivo aislado, repetible y con la menor superficie de ataque posible, eliminando herramientas de desarrollo y configuraciones locales.

#### 2. Estructura del Multi-stage Build
Para solucionar de forma integral la presencia de herramientas de compilación innecesarias en producción y optimizar el almacenamiento, el archivo se estructurará en un multi-stage build de 3 etapas basado en node:22-alpine:

| Etapa | Nombre | Base | Propósito |
| :--- | :--- | :--- | :--- |
| *Stage 1* | deps | node:22-alpine | Descargar e instalar estrictamente las dependencias de producción utilizando el comando npm ci --omit=dev. |
| *Stage 2* | build | node:22-alpine | Copiar el código fuente y las dependencias de desarrollo para compilar TypeScript (tsc) y generar los artefactos JavaScript en la carpeta dist. |
| *Stage 3* | runtime | node:22-alpine | Etapa final y limpia. Se copia el JS compilado de la etapa 2 y los node_modules de producción de la etapa 1. Es la única que se despliega. |

#### 3. Requisitos No Funcionales y de Seguridad
* *Disponibilidad y Monitoreo (Solución Problema 3):* Se añade una directiva HEALTHCHECK que ejecuta de forma interna el comando curl -f http://localhost:3000/ para que la capa de orquestación conozca en tiempo real si la API se encuentra lista para recibir tráfico.
* *Seguridad de Privilegios (Solución Problema 7):* Se descarta el usuario root por defecto. Se incorpora la creación de un usuario del sistema sin privilegios mediante RUN adduser -D appuser && USER appuser previo al punto de entrada.
* *Instalación Reproducible (Solución Problema 8):* Se reemplaza definitivamente el uso de npm install por npm ci. Esto garantiza que el contenedor de producción instale de manera exacta y estricta las versiones fijadas en el archivo package-lock.json, mitigando inconsistencias entre entornos.
* *Reducción del Contexto (Solución Problema 9):* Se implementa el archivo .dockerignore en la raíz para excluir explícitamente del contexto de build elementos como node_modules locales, carpetas de control de versiones (.git), compilaciones locales (dist) y credenciales (.env).
* *Optimización de Caché de Capas (Solución Problema 11):* Se altera el orden de las instrucciones de construcción. Se copiarán primero los archivos package*.json antes del resto del código fuente para ejecutar el proceso de instalación. De este modo, los cambios en el código de la aplicación no invalidarán el caché de las dependencias, acelerando significativamente los builds subsiguientes.

---
### b) packages/web/Dockerfile.prod

#### 1. Propósito
Compilar la aplicación cliente Frontend (desarrollada con Vite) y empaquetar los artefactos estáticos resultantes (HTML, CSS, JavaScript) dentro de un servidor web dedicado de alta performance. Esto descarta por completo el servidor de desarrollo de Vite en producción, eliminando vulnerabilidades y optimizando la velocidad de carga de la interfaz del club.

#### 2. Estructura del Multi-stage Build
El archivo se diseña usando una estrategia de migración tecnológica de 3 etapas, abstrayendo el compilador Node.js de la capa final de entrega:

| Etapa | Nombre | Base | Propósito |
| :--- | :--- | :--- | :--- |
| **Stage 1** | `deps` | `node:22-alpine` | Instalación limpia de la totalidad de las dependencias (`dependencies` y `devDependencies`) mediante `npm ci` para posibilitar la compilación de la SPA. |
| **Stage 2** | `build` | `node:22-alpine` | Copia del código fuente del módulo web y ejecución de la compilación de producción mediante `npm run build` (`vite build`). |
| **Stage 3** | `runtime` | `nginx:stable-alpine` | Servidor web inmutable de tiempo de ejecución. Se descarta Node.js y se utiliza Nginx de forma exclusiva para servir los estáticos minificados resultantes de la etapa anterior. |

#### 3. Requisitos No Funcionales y de Seguridad
* **Despliegue de Producción Optimizado:** Se elimina la instrucción de desarrollo `npm run dev --host 0.0.0.0`. La adopción de `nginx:stable-alpine` disminuye drásticamente el peso del contenedor (pasando de ~1GB a ~40MB), reduciendo la superficie de ataque y el consumo de memoria RAM en el servidor del club.
* **Ajustes de Rendimiento y Endurecimiento del Servidor Web:** Se inyecta un archivo personalizado `nginx.conf` en la etapa de ejecución para proveer:
  * **Compresión Gzip Activa:** Comprime los archivos de texto (JS, CSS, HTML) sobre la marcha, acelerando los tiempos de respuesta percibidos por el usuario en redes móviles o lentas.
  * **Políticas de Caché Agresivas:** Configuración de cabeceras `Cache-Control` prolongadas para recursos con hash único en el nombre, evitando descargas redundantes del navegador.
  * **Cabeceras de Seguridad HTTP:** Inclusión de directivas como `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y configuraciones básicas de *Content Security Policy* (CSP) para prevenir ataques de inyección (*Cross-Site Scripting* o *Clickjacking*).
* **Healthcheck:** Configuración de un control interno periódico contra el puerto `80` para monitorizar la salud del demonio de Nginx.

---

### c) docker-compose.prod.yml

#### 1. Propósito
Este archivo funciona como el plano de orquestación de la arquitectura de servicios en el entorno productivo. Su finalidad es coordinar el ciclo de vida, el orden de arranque y la conectividad de la API, el cliente Web y el motor de Base de Datos, endureciendo los límites de acceso al sistema operativo, gestionando las variables sensibles y asegurando la persistencia adecuada de los datos de Alentapp sin comprometer el host.

#### 2. Estructura y Configuración de Servicios para Producción

| Aspecto Técnico | Requisito de Diseño y Justificación Académica |
| :--- | :--- |
| **Gestión de Secrets<br>(Solución Problema 1)** | Se prohíbe taxativamente harcodear credenciales en el archivo. Se elimina la exposición de cadenas críticas (como `DATABASE_URL=postgres://admin:password123...`) del repositorio público y se migran al uso dinámico de variables de entorno administradas mediante un archivo `.env` local e independiente. |
| **Resource limits<br>(Solución Problema 2)** | Se introducen restricciones de hardware mandatorias para cada uno de los servicios mediante las directivas `deploy.resources.limits` (estableciendo topes de `cpus` y `memory`). Esto impide que un desbordamiento de memoria o un hilo bloqueado en la API agote los recursos del servidor físico de la institución. |
| **Orquestación y Salud<br>(Solución Problema 3)** | Se integran bloques de `healthcheck` cruzados en el compose. El servicio de la API utiliza la cláusula `depends_on` con la condición `service_healthy` respecto a la base de datos, impidiendo que el backend intente arrancar y falle conexiones antes de que el motor SQL esté listo para operar. |
| **Aislamiento de Redes<br>(Solución Problema 4)** | Se descarta el uso del `default bridge` de Docker. Se define explícitamente una red interna personalizada de tipo bridge (`alentapp-network`), aislando lógicamente los componentes y limitando qué servicios (como la base de datos) tienen denegado el acceso o la exposición directa hacia redes externas. |
| **Políticas de Logging<br>(Solución Problema 5)** | Se configura de forma global el driver de logs nativo `json-file` acompañado de parámetros estrictos de rotación (`max-size: "10m"` y `max-file: "3"`). Esto asegura la auditoría de eventos de la aplicación sin el riesgo latente de colapsar el almacenamiento en disco por el crecimiento desmedido de los logs de salida. |
| **Estrategia de Migraciones<br>(Solución Problema 12)** | Para la inicialización del motor de persistencia, se elimina por completo la instrucción `npx prisma migrate dev`, la cual está diseñada exclusivamente para entornos de desarrollo y acarrea el riesgo de resetear la base de datos de producción de forma irreversible. En su lugar, se automatiza el comando `npx prisma migrate deploy`, que aplica los esquemas pendientes de forma segura y no destructiva. |
| **Inmutabilidad de Código<br>(Solución Problema 13)** | Se eliminan los mapeos de volúmenes de desarrollo que montaban el código fuente local directo al contenedor (`volumes: - .:/app`). En producción el contenedor debe ser autosuficiente e inmutable; los volúmenes quedan limitados únicamente a la persistencia estricta de los archivos de datos del motor de base de datos (`pgdata`). |
| **Protección del Filesystem<br>(Solución Problema 14)** | Con el objeto de evitar la inyección o ejecución de scripts maliciosos en caliente en caso de que un contenedor sea vulnerado, se añade la bandera `read_only: true` sobre el sistema de archivos raíz, complementándose con el uso de volúmenes de tipo `tmpfs` acotados únicamente para aquellos directorios específicos que requieran escrituras temporales del sistema operativo. |
| **Mínimo Privilegio del Kernel<br>(Solución Problema 15)** | Se implementa el principio de mínimo privilegio sobre el Kernel de Linux a través de la configuración del Compose. Se remueven los privilegios por defecto mediante `cap_drop: [ALL]` y se añaden estrictamente las capacidades indispensables para la operación de red del servicio web por medio de `cap_add: [NET_BIND_SERVICE]`. |