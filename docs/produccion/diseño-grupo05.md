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