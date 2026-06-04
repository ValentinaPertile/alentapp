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

### c) docker-compose.prod.yml

#### 1. Propósito
Este archivo funciona como el plano de orquestación de la arquitectura de servicios en el entorno productivo. Su finalidad es coordinar el ciclo de vida, el orden de arranque y la conectividad de la API, el cliente Web y el motor de Base de Datos, endureciendo los límites de acceso al sistema operativo, gestionando las variables sensibles y asegurando la persistencia adecuada de los datos de Alentapp sin comprometer el host.

#### 2. Estructura y Configuración de Servicios para Producción

| Aspecto Técnico | Requisito de Diseño y Justificación Académica |
| :--- | :--- |
| *Gestión de Secrets<br>(Solución Problema 1)* | Se prohíbe taxativamente harcodear credenciales en el archivo. Se elimina la exposición de cadenas críticas (como DATABASE_URL=postgres://admin:password123...) del repositorio público y se migran al uso dinámico de variables de entorno administradas mediante un archivo .env local e independiente. |
| *Resource limits<br>(Solución Problema 2)* | Se introducen restricciones de hardware mandatorias para cada uno de los servicios mediante las directivas deploy.resources.limits (estableciendo topes de cpus y memory). Esto impide que un desbordamiento de memoria o un hilo bloqueado en la API agote los recursos del servidor físico de la institución. |
| *Orquestación y Salud<br>(Solución Problema 3)* | Se integran bloques de healthcheck cruzados en el compose. El servicio de la API utiliza la cláusula depends_on con la condición service_healthy respecto a la base de datos, impidiendo que el backend intente arrancar y falle conexiones antes de que el motor SQL esté listo para operar. |
| *Aislamiento de Redes<br>(Solución Problema 4)* | Se descarta el uso del default bridge de Docker. Se define explícitamente una red interna personalizada de tipo bridge (alentapp-network), aislando lógicamente los componentes y limitando qué servicios (como la base de datos) tienen denegado el acceso o la exposición directa hacia redes externas. |
| *Políticas de Logging<br>(Solución Problema 5)* | Se configura de forma global el driver de logs nativo json-file acompañado de parámetros estrictos de rotación (max-size: "10m" y max-file: "3"). Esto asegura la auditoría de eventos de la aplicación sin el riesgo latente de colapsar el almacenamiento en disco por el crecimiento desmedido de los logs de salida. |
| *Estrategia de Migraciones<br>(Solución Problema 12)* | Para la inicialización del motor de persistencia, se elimina por completo la instrucción npx prisma migrate dev, la cual está diseñada exclusivamente para entornos de desarrollo y acarrea el riesgo de resetear la base de datos de producción de forma irreversible. En su lugar, se automatiza el comando npx prisma migrate deploy, que aplica los esquemas pendientes de forma segura y no destructiva. |
| *Inmutabilidad de Código<br>(Solución Problema 13)* | Se eliminan los mapeos de volúmenes de desarrollo que montaban el código fuente local directo al contenedor (volumes: - .:/app). En producción el contenedor debe ser autosuficiente e inmutable; los volúmenes quedan limitados únicamente a la persistencia estricta de los archivos de datos del motor de base de datos (pgdata). |
| *Protección del Filesystem<br>(Solución Problema 14)* | Con el objeto de evitar la inyección o ejecución de scripts maliciosos en caliente en caso de que un contenedor sea vulnerado, se añade la bandera read_only: true sobre el sistema de archivos raíz, complementándose con el uso de volúmenes de tipo tmpfs acotados únicamente para aquellos directorios específicos que requieran escrituras temporales del sistema operativo. |
| *Mínimo Privilegio del Kernel<br>(Solución Problema 15)* | Se implementa el principio de mínimo privilegio sobre el Kernel de Linux a través de la configuración del Compose. Se remueven los privilegios por defecto mediante cap_drop: [ALL] y se añaden estrictamente las capacidades indispensables para la operación de red del servicio web por medio de cap_add: [NET_BIND_SERVICE]. |

---

## 2.2. Diseño de la observabilidad
 
### a) Métricas RED a capturar
 
A continuación se definen las 3 métricas fundamentales del método RED que se capturarán desde la API de Alentapp, siguiendo la metodología de Tom Wilkie (2015):
 
| Métrica | Tipo OpenTelemetry | Descripción | Labels |
|---|---|---|---|
| *Rate* | Counter | Cantidad total de requests HTTP recibidos por segundo (solicitudes exitosas y fallidas) | method (GET, POST, PATCH, DELETE), route (/api/v1/socios, /api/v1/payments, etc.), status (200, 201, 400, 404, 500, etc.) |
| *Errors* | Counter | Cantidad de requests que resultan en error (códigos de estado 4xx y 5xx). Se expresa comúnmente como porcentaje: (errors / total requests) * 100 | method, route, status |
| *Duration* | Histogram | Tiempo en milisegundos que toma procesar y responder cada request. Se analiza mediante percentiles (p50, p95, p99) para entender la distribución real de latencias | method, route |
 
*Métricas adicionales de contexto del sistema:*
 
| Métrica | Tipo OpenTelemetry | Descripción |
|---|---|---|
| process.memory.usage | Gauge | Consumo de memoria RAM del proceso Node.js en bytes. Útil para detectar memory leaks |
| http.requests.active | Gauge | Número de requests HTTP concurrentes en procesamiento en tiempo real |
 
*Ejemplo de uso en Alentapp:*
 
- *Rate:* Saber si /api/v1/socios recibe 10 req/s o 1000 req/s → dimensiona la infraestructura
- *Errors:* Detectar si después de un deploy hay 5% de 500 errors en /api/v1/payments → rollback inmediato
- *Duration:* Identificar que /api/v1/socios tiene p99=2.5s mientras que /api/v1/sports tiene p99=50ms → optimizar queries

---
 