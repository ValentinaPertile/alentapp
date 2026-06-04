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