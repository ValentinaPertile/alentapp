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