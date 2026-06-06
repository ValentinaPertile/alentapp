| Métrica | Antes (desarrollo) | Después (producción) | Mejora |
| :--- | :--- | :--- | :--- |
| **Tamaño imagen API** | ~1GB | 164 MB | Reducción del ~84% |
| **Tamaño imagen Web** | ~570MB | 26.3 MB | Reducción del ~95% |
| **Tiempo de startup API** | ~4.5s | 1.48s | Arranque ~3 veces más rápido |
| **Memoria API (idle)** | ~120 MB | 43.31 MB | Reducción del ~64% en consumo RAM |
| **Endpoints accesibles** | Sí (`:3000/...`) | Sí (`:3000/...`) | N/A |
| **Frontend vía nginx** | No | Sí (`:8080/`) | N/A |

## 4.2. Verificación de seguridad
Se ha comprobado que se cumpla:
- [x] La API corre con usuario no-root (`appuser`). Confirmado mediante el comando `whoami` dentro del contenedor.
- [x] No hay `npm`/`tsc` en la imagen final. Confirmado comprobando la ausencia de los binarios con `which node tsc npm python`.
- [x] Read-only filesystem activo. Confirmado al intentar ejecutar `touch /test`, resultando en error de sistema de archivos de solo lectura.
- [x] Capabilities mínimas. Se eliminaron privilegios de red innecesarios y se comprobó que el contenedor no tiene capacidad de realizar escaneos externos.
- [x] Variables sensibles vía `.env`, no hardcodeadas.
- [x] Healthchecks funcionando. Confirmado con `docker ps`, mostrando estado `(healthy)` en la API y la Base de Datos.

## 4.3. Verificación de observabilidad
- [x] OpenTelemetry exporta métricas en el puerto `9464/metrics`.
- [x] Prometheus scrapea correctamente el endpoint OTLP.
- [x] Grafana tiene al menos un datasource Prometheus configurado.
- [x] El dashboard RED tiene 6 paneles funcionales.
- [x] Los gráficos responden al tráfico generado con el script de bash.
- [x] Las métricas de error reflejan los 4xx/5xx forzados.

## 4.4. Documentación de decisiones

### Arquitectura final
El sistema en producción quedó estructurado sobre una red interna aislada tipo bridge (`alentapp_alentapp-prod`). Está compuesto por cinco contenedores principales:
* **Frontend:** Servido a través de Nginx (`alentapp-web`), que entrega únicamente los archivos estáticos pre-compilados, exponiendo la interfaz en el puerto 80 del host.
* **Backend:** Una API en Node.js (`alentapp-api`) que se conecta a una base de datos PostgreSQL (`alentapp-db-prod`). La API corre bajo el usuario sin privilegios `appuser` y expone un endpoint OTLP.
* **Observabilidad:** Un contenedor de Prometheus recolecta las métricas directamente del backend usando la resolución DNS interna de Docker, y Grafana las consume para visualizarlas en un dashboard RED accesible en el puerto 3001.

### Decisiones técnicas
* **Multi-stage builds:** Adoptamos este enfoque en el `Dockerfile.prod` para separar el entorno de compilación del de ejecución. Esto nos permitió reducir drásticamente el tamaño de la imagen de la API (de ~1GB a 164MB) y eliminar vulnerabilidades de seguridad al no incluir herramientas de desarrollo como `npm`, `tsc` o el código fuente original en la imagen final.
* **Nginx para el Frontend:** En lugar de usar el servidor de desarrollo de Vite, compilamos los assets y usamos Nginx, ya que es extremadamente ligero y está optimizado para servir archivos estáticos en producción de forma concurrente, logrando una imagen final de apenas 26.3MB.
* **Seguridad estricta (Capabilities y Read-Only):** Aplicamos `cap_drop: [ALL]` y un sistema de archivos de solo lectura para aplicar el principio de menor privilegio. Si un atacante lograra vulnerar la aplicación web, no podría escribir archivos maliciosos ni realizar escaneos de red.
* **OpenTelemetry (OTLP):** Elegimos este estándar para instrumentar la API porque evita el "vendor lock-in", permitiéndonos unificar la recolección de métricas, trazas y logs bajo un formato único que Prometheus puede leer nativamente.

### Problemas encontrados y resolución
Durante la migración a producción nos enfrentamos a:

1. **Gestión de memoria en WSL:** Al ejecutar el comando `npm ci` en la etapa de dependencias, el consumo de recursos colapsó la máquina virtual de Linux en Windows, desconectando el servidor de VS Code (`Wsl/Service/CreateInstance/E_FAIL`). Lo solucionamos liberando memoria mediante un reinicio forzado (`wsl --shutdown`) y ejecutando la compilación en una terminal externa independiente.
2. **Rutas en el Monorepo (Prisma y TypeScript):** El paso a multi-stage build rompió temporalmente la compilación con un error `Missing script: "build"`. Además, tuvimos problemas copiando las carpetas generadas por Prisma y TypeScript (`dist` vs `dist-prod`). Lo solucionamos ajustando las rutas de los comandos `COPY` entre etapas y declarando correctamente los *workspaces* en el comando de instalación.
3. **Conflictos del Puerto 80:** Al levantar el frontend web, Docker falló con `address already in use` en el puerto 0.0.0.0:80. Investigamos el host y descubrimos procesos nativos de Windows (como el servicio W3SVC/IIS) reteniendo el puerto. Lo liberamos deteniendo los servicios conflictivos desde una consola de administrador en el host.
4. **Permisos de red en Alpine (El "ping" residual):** A pesar de aplicar `cap_drop: [ALL]`, el contenedor seguía permitiendo hacer pings externos debido a la configuración por defecto de rangos IPv4 en Docker. Para garantizar la máxima seguridad, lo resolvimos inyectando un comando `rm -f /bin/ping` en la etapa de ejecución del Dockerfile.
5. **Comunicación de Prometheus:** Al principio, Prometheus no lograba registrar la API y devolvía `activeTargets: []`. Comprendimos que `host.docker.internal` no aplicaba para una red bridge de producción. Lo solucionamos actualizando el `prometheus.yml` para apuntar a la IP interna del contenedor mediante el DNS de Docker (`alentapp-api:3000`).
