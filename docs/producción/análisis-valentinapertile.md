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