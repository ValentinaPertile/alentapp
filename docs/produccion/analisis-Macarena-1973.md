# Fase 1: Analizar y proponer - Infraestructura y Observabilidad
**Estudiante:** Macarena Romero (Macarena-1973)  
**Fecha:** Junio 2026  

## 1.1. Análisis de la Infraestructura Docker Actual

A continuación se detallan los 5 problemas críticos identificados en los Dockerfiles actuales del proyecto respecto a las buenas prácticas de entornos productivos:

| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
| :--- | :--- | :---: | :--- |
| **Imagen sin multi-stage build:** El contenedor final arrastra herramientas de desarrollo innecesarias para la ejecución en producción. | `packages/api/Dockerfile` | **Alto** | Implementar un *multi-stage build* con 3 etapas (`deps`, `build` y `runtime`), copiando a la imagen final solo el JS compilado y eliminando `tsc` y `npm`. |
| **El contenedor corre como `root`:** No se define un usuario con privilegios limitados, otorgando control total sobre el entorno del contenedor en caso de vulnerabilidad. | `packages/api/Dockerfile` y `packages/web/Dockerfile` | **Alto** | Crear un usuario del sistema sin privilegios y activarlo usando la directiva `USER` antes del punto de entrada (ej: `USER node`). |
| **Uso de `npm install` en producción:** El comando puede descargar versiones de dependencias distintas a las probadas en desarrollo si cambian en el registro de npm, rompiendo la repetibilidad. | `packages/api/Dockerfile` y `packages/web/Dockerfile` | **Medio** | Reemplazar `npm install` por `npm ci`, lo que garantiza una instalación exacta, limpia y reproducible basada estrictamente en el archivo `package-lock.json`. |
| **Ausencia de archivo `.dockerignore`:** El contexto de construcción copia directorios locales pesados y archivos de configuración sensibles de desarrollo al contenedor de forma innecesaria. | Raíz del proyecto (Falta el archivo al lado del `docker-compose.yml`) | **Medio** | Crear un archivo `.dockerignore` en la raíz que excluya explícitamente `node_modules`, `.git`, carpetas de compilación como `dist`, y archivos `.env`. |
| **Frontend servido con servidor de desarrollo:** Se utiliza el comando de desarrollo de Vite (`npm run dev`), el cual no está optimizado para entornos productivos ni maneja compresión o caché. | `packages/web/Dockerfile` | **Alto** | Cambiar el enfoque: ejecutar `vite build` en una etapa de compilación y usar **Nginx** en la etapa final para servir los archivos estáticos optimizados. |

---
## 1.2. Investigación de OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

**OpenTelemetry** es un framework de código abierto estandarizado por la CNCF que provee un conjunto de APIs, SDKs y herramientas diseñadas para generar, recolectar y exportar datos de telemetría desde las aplicaciones de forma independiente al proveedor utilizado. Cabe destacar que OpenTelemetry no se encarga del almacenamiento ni de la visualización de estos datos, sino únicamente de la instrumentación del código fuente.

Por otro lado, **Prometheus** es un sistema de monitoreo y base de datos de series temporales que se especializa en almacenar, indexar y permitir la consulta de métricas mediante el lenguaje PromQL, utilizando un modelo de recolección basado en "pull" (scrapeo).

**diferencia principal** radica en sus responsabilidades: OpenTelemetry funciona como el agente recolector dentro de nuestra API (Alentapp), estandarizando la captura de datos, mientras que Prometheus actúa como el motor de almacenamiento centralizado que consume dichas métricas para su posterior análisis.

### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares fundamentales de la observabilidad en sistemas distribuidos son:

1. **Métricas:** Datos numéricos agregados que se miden a lo largo del tiempo (como el uso de CPU, cantidad de solicitudes o tasas de error) que permiten entender el estado de salud general del sistema.
2. **Trazas (Traces):** El registro del recorrido de una petición a través de los distintos componentes y servicios del sistema, permitiendo identificar latencias y cuellos de botella exactos en flujos distribuidos.
3. **Logs:** Registros de texto con marca de tiempo sobre eventos específicos y detallados que ocurren en la aplicación, esenciales para el debugging y análisis de causas raíz de fallas específicas.

OpenTelemetry es un proyecto diseñado para abordar **los tres pilares en su totalidad**, ofreciendo una solución unificada para métricas, trazas y logs bajo un mismo estándar, evitando tener que instalar agentes o librerías diferentes para cada tipo de dato.

---
### Expliquen el concepto de métricas RED (Rate, Errors, Duration). ¿Para qué sirve cada una?

El Método RED es una metodología de monitoreo diseñada específicamente para servicios basados en solicitudes (como nuestra API de Fastify), enfocada en medir el rendimiento desde la perspectiva del usuario o cliente del sistema. Se compone de tres métricas fundamentales:

1. **Rate (Tasa de peticiones):** Mide la cantidad de solicitudes HTTP que está recibiendo el servidor por segundo. Sirve para entender el volumen de tráfico actual del sistema, identificar picos de uso en el club y dimensionar la infraestructura necesaria frente a la demanda masiva de usuarios.
2. **Errors (Tasa de errores):** Mide la cantidad de peticiones que fallan, habitualmente segmentadas por códigos de estado HTTP erróneos (como respuestas de la familia 4xx y 5xx). Su utilidad es clave para detectar anomalías inmediatas tras un despliegue, caídas de la base de datos o fallas críticas que impacten directamente en la experiencia del usuario.
3. **Duration (Duración / Latencia):** Mide la cantidad de tiempo que toma procesar y resolver las solicitudes HTTP, comúnmente analizada a través de percentiles (como p95 o p99) en lugar de promedios simples. Sirve para evaluar la performance percibida por el usuario e identificar qué endpoints específicos actúan como cuellos de botella lentos dentro del backend.

---
### ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

OTLP es el protocolo de red nativo de OpenTelemetry diseñado para la transmisión de datos de telemetría (métricas, logs y trazas) de forma eficiente bajo los estándares gRPC y HTTP/Protobuf. 

La ventaja principal de utilizar OTLP en lugar de exportar directamente en un formato específico de Prometheus es el desacoplamiento técnico que ofrece. Si la API exporta los datos usando OTLP hacia un recolector centralizado (Collector), la aplicación se vuelve agnóstica de las herramientas finales de monitoreo. Esto permite que el día de mañana podamos cambiar Prometheus por Datadog, Dynatrace o New Relic simplemente modificando la configuración del colector, sin necesidad de alterar una sola línea de código fuente ni reinstalar librerías dentro del backend de nuestra aplicación.

### ¿Cómo se relaciona OpenTelemetry con Grafana?

La relación es de complementariedad dentro de la arquitectura de observabilidad del sistema: OpenTelemetry cumple el rol de motor de recolección de datos e instrumentación dentro de la API, mientras que Grafana actúa exclusivamente como la capa de visualización e interfaz de usuario. 

OpenTelemetry captura las métricas RED y las expone para que sean almacenadas por un motor de base de datos de series temporales (como Prometheus). Luego, Grafana se conecta a Prometheus como origen de datos (Data Source) para consultar esa información mediante PromQL y plasmarla en dashboards gráficos e interactivos en tiempo real.

---