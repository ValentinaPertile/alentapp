# Fase 1: Analizar y proponer - Infraestructura y Observabilidad
**Estudiante:** Valentina Pértile de la Vega (valentinapertile)  
**Fecha:** Junio 2026
 
## 1.1. Análisis de la Infraestructura Docker Actual
 
A continuación se detallan los 5 problemas críticos identificados en los archivos Docker actuales del proyecto respecto a las buenas prácticas de entornos productivos:
 
| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
| :--- | :--- | :---: | :--- |
| **Variables de entorno hardcodeadas:** Las credenciales de la base de datos están escritas en texto plano dentro del archivo de configuración de servicios. | `docker-compose.yml` línea 21: `DATABASE_URL=postgres://admin:password123@db:5432/alentapp_db` | **Alto** | Crear un archivo `.env` con las variables sensibles y referenciarlas desde el Compose con sintaxis `${VARIABLE}`. Agregar `.env` al `.gitignore` para que nunca se suba al repositorio. |
| **Ausencia de límites de CPU y memoria:** Ningún servicio tiene restricciones de recursos; en producción un solo contenedor podría consumir todo el host y afectar a los demás. | `docker-compose.yml`  servicios `api` (línea 14), `web` (línea 36) y `db` (línea 3): ninguno tiene sección `deploy.resources` | **Alto** | Agregar la clave `deploy.resources.limits` en cada servicio con valores de `cpus` y `memory` acordes al perfil de carga esperado. |
| **Healthcheck ausente en API y Web:** La base de datos sí tiene healthcheck, pero la API y el frontend no. Docker no puede detectar si esos contenedores están colgados y los mantiene como `running` aunque no respondan. | `docker-compose.yml`  servicio `api` (línea 14) y servicio `web` (línea 36): sin clave `healthcheck`. `packages/api/Dockerfile` línea 1 y `packages/web/Dockerfile` línea 1: sin directiva `HEALTHCHECK` | **Medio** | Agregar `HEALTHCHECK` en ambos Dockerfiles apuntando a un endpoint liviano (ej: `GET /health` en la API, `GET /` en nginx), y la clave `healthcheck` equivalente en el Compose. |
| **Imagen base con Node.js completo sin multi-stage build:** Ambos Dockerfiles parten de `node:20-alpine` y copian todo el código fuente al contenedor final, incluyendo herramientas de desarrollo (`npm`, `tsc`, código fuente TypeScript) que no se necesitan en producción. | `packages/api/Dockerfile` línea 1: `FROM node:20-alpine`. `packages/web/Dockerfile` línea 1: `FROM node:20-alpine`. En ambos, el `CMD` ejecuta directamente el servidor de desarrollo. | **Alto** | Implementar un *multi-stage build* con etapas `deps`, `build` y `runtime`. La imagen final solo copia el artefacto compilado y las dependencias de producción, descartando compilador y código fuente. |
| **Frontend servido con servidor de desarrollo de Vite:** El contenedor del frontend ejecuta `npm run dev` con flag `--host 0.0.0.0`, exponiendo el servidor de desarrollo de Vite en producción sin optimizaciones, sin compresión ni cabeceras de seguridad HTTP. | `packages/web/Dockerfile` línea 11: `CMD ["npm", "run", "dev", "-w", "packages/web", "--", "--host", "0.0.0.0"]` y `docker-compose.yml` línea 47: `command: npm run dev -w packages/web -- --host 0.0.0.0` | **Alto** | Usar un *multi-stage build*: ejecutar `vite build` en una etapa de construcción y luego usar **Nginx** (`nginx:stable-alpine`) en la etapa final para servir los archivos estáticos con compresión gzip, caché de assets y *security headers*. |
 
---

 1.2. Investigación de OpenTelemetry
¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?
OpenTelemetry es un framework de código abierto que provee APIs, SDKs y herramientas para generar, recolectar y exportar datos de telemetría (métricas, trazas y logs) desde las aplicaciones de forma independiente al proveedor de monitoreo elegido. Me parece importante aclarar que OpenTelemetry no almacena ni visualiza los datos: su rol es instrumentar el código fuente y transmitir la información.

Prometheus, en cambio, es un sistema de monitoreo y base de datos de series temporales. Se especializa en almacenar métricas numéricas y exponerlas para consulta mediante su lenguaje PromQL. Utiliza un modelo de recolección basado en pull (consulta activa a los endpoints /metrics de los servicios).

La diferencia principal es de responsabilidades: OpenTelemetry actúa como el agente de instrumentación dentro de nuestra aplicación, estandarizando cómo se capturan los datos; mientras que Prometheus actúa como el motor de almacenamiento centralizado que los consume y los persiste para poder analizarlos.

---
 
### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?
 
Los tres pilares fundamentales de la observabilidad son:
 
1. **Métricas:** Datos numéricos y agregados que se miden a lo largo del tiempo (como la tasa de solicitudes, uso de CPU o cantidad de errores). Permiten entender el estado de salud general del sistema.
2. **Trazas (Traces):** Registro del recorrido completo de una petición a través de los distintos componentes del sistema. Son esenciales para identificar latencias y cuellos de botella en flujos distribuidos donde intervienen múltiples servicios.
3. **Logs:** Registros de texto con marca de tiempo sobre eventos puntuales y detallados que ocurren en la aplicación. Son la herramienta principal para el debugging y el análisis de causas raíz ante fallas específicas.

OpenTelemetry está diseñado para abordar los tres, estableciendo una solución estándar sin necesidad de instalar librerías distintas para cada tipo de dato.
 
---

### Expliquen el concepto de métricas RED (Rate, Errors, Duration). ¿Para qué sirve cada una?
 
El Método RED es una metodología de monitoreo diseñada para servicios orientados a solicitudes, como una API REST. Mide el rendimiento desde la perspectiva del cliente del sistema y se compone de tres métricas:
 
1. **Rate (Tasa de peticiones):** Mide cuántas solicitudes HTTP recibe el servidor por unidad de tiempo (por segundo). Sirve para entender el volumen de tráfico actual, detectar picos de uso y dimensionar correctamente la infraestructura frente a la demanda.
2. **Errors (Tasa de errores):** Mide la proporción de solicitudes que terminan en falla, generalmente filtradas por códigos de estado HTTP 4 o 5. Es clave para detectar anomalías inmediatamente después de un despliegue, identificar caídas de servicios dependientes o fallas críticas en la experiencia de usuario.
3. **Duration (Duración / Latencia):** Mide cuánto tiempo tarda el servidor en procesar y responder cada solicitud. Se analiza mediante percentiles en lugar de promedios, para capturar la experiencia del peor caso. Sirve para evaluar la performance percibida por el usuario final e identificar qué endpoints actúan como cuellos de botella dentro del backend.

---

### ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?
 
**OTLP** es el protocolo de red de OpenTelemetry para la transmisión de datos de telemetría (métricas, trazas y logs) de forma eficiente. Está basado en gRPC y HTTP/Protobuf y es el estándar recomendado para comunicar aplicaciones instrumentadas con un colector centralizado.
 
La ventaja principal de usar OTLP en lugar de exportar directamente en formato Prometheus es el desacoplamiento entre la aplicación y las herramientas de observabilidad. Si la API envía sus datos mediante OTLP a un colector intermedio, la aplicación se vuelve agnóstica del destino final. Esto permite que, si en el futuro se decide reemplazar Prometheus por otro backend, el cambio se realiza únicamente en la configuración del colector, sin tocar ni una línea del código ni reinstalar dependencias.
 
---
 
### ¿Cómo se relaciona OpenTelemetry con Grafana?
 
La relación es de complementariedad dentro de la arquitectura de observabilidad: cada herramienta cumple un rol diferente y se necesitan mutuamente para tener un sistema de monitoreo.
 
OpenTelemetry actúa como el motor de recolección dentro de la API: captura las métricas RED y las expone para que sean almacenadas por Prometheus. Luego, Grafana se conecta a Prometheus como fuente de datos y consulta esa información mediante PromQL para plasmarla en dashboards. Grafana es únicamente la capa de visualización, es decir, no recolecta ni almacena datos por sí misma.
 
Mini esquema que me sirve para visualizar el flujo: OpenTelemetry instrumenta -> Prometheus almacena -> Grafana visualiza
 
---