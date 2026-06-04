# Fase 1: Analizar y proponer - Infraestructura y Observabilidad

**Estudiante:** María Luana Suárez Pavicich
**Fecha:** Junio 2026

## 1.1. Análisis de la Infraestructura Docker Actual

En esta fase se analizó la configuración Docker actual del proyecto Alentapp con foco en buenas prácticas para entornos productivos. El análisis se centró principalmente en aspectos relacionados con optimización del proceso de build, seguridad del contenedor, manejo de migraciones y reducción de superficie de ataque.

A continuación se presentan cinco problemas identificados, junto con su impacto y una propuesta de mejora.

| Problema                                                                                                                                                 | ¿Dónde ocurre?                                                                                                          |  Impacto  | Solución propuesta                                                                                                                |
| :------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :-------: | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Caché de capas mal ordenada:** La organización de las instrucciones del Dockerfile no aprovecha completamente el sistema de caché de Docker.           | `packages/api/Dockerfile`. La copia del código fuente no está separada correctamente de la instalación de dependencias. | **Medio** | Copiar primero únicamente `package.json` y `package-lock.json`, instalar dependencias, y luego copiar el código fuente.           |
| **Uso de `prisma migrate dev` en lugar de `migrate deploy`:** Se utiliza un comando pensado para desarrollo dentro del flujo de arranque del contenedor. | `docker-compose.yml`, en el comando de inicialización de la API.                                                        |  **Alto** | Reemplazar `npx prisma migrate dev` por `npx prisma migrate deploy` para producción.                                              |
| **Montaje completo del código fuente mediante volúmenes:** El contenedor recibe el proyecto completo desde el host.                                      | `docker-compose.yml`, sección `volumes`, por ejemplo `.:/app`.                                                          | **Medio** | En producción no montar el código fuente completo. Utilizar imágenes autocontenidas con artefactos ya compilados.                 |
| **Sistema de archivos del contenedor sin modo read-only:** Los servicios pueden escribir libremente dentro del filesystem del contenedor.                | `docker-compose.yml`, no se define `read_only: true` en los servicios.                                                  | **Medio** | Agregar `read_only: true` y utilizar `tmpfs` o volúmenes específicos solo para directorios que requieran escritura.               |
| **Linux capabilities innecesarias:** Los contenedores mantienen las capabilities por defecto de Docker.                                                  | `docker-compose.yml`, no se define `cap_drop`.                                                                          | **Medio** | Agregar `cap_drop: ALL` y habilitar únicamente las capabilities estrictamente necesarias, como `NET_BIND_SERVICE` si corresponde. |

---

### 1. Caché de capas mal ordenada

Docker construye imágenes utilizando un sistema de capas. Cada instrucción del Dockerfile genera una capa que puede ser reutilizada en futuras construcciones si no cambió su contenido.

Cuando el orden de las instrucciones no está optimizado, pequeños cambios en el código fuente pueden invalidar capas costosas, como la instalación de dependencias. Esto genera builds más lentos y menos eficientes.

En un entorno productivo o de integración continua, este problema puede impactar en:

* Mayor tiempo de construcción de imágenes.
* Mayor consumo de recursos durante el pipeline.
* Menor eficiencia en despliegues frecuentes.

La solución recomendada es copiar primero los archivos que definen las dependencias:

```dockerfile
COPY package*.json ./
RUN npm ci
```

Luego, recién después, copiar el resto del código fuente:

```dockerfile
COPY . .
```

De esta manera, si cambia el código pero no cambian las dependencias, Docker puede reutilizar la capa de instalación.

---

### 2. Uso de `prisma migrate dev` en lugar de `prisma migrate deploy`

El comando `prisma migrate dev` está diseñado para entornos de desarrollo. Su objetivo es ayudar al desarrollador a crear, modificar y aplicar migraciones durante la evolución local del esquema de base de datos.

En un entorno productivo no es recomendable utilizarlo, ya que puede ejecutar validaciones y comportamientos pensados para desarrollo. Además, puede requerir interacción o generar efectos no deseados si detecta diferencias entre el esquema y las migraciones.

En producción debe utilizarse:

```bash
npx prisma migrate deploy
```

Este comando aplica únicamente migraciones ya existentes, previamente generadas y versionadas en el repositorio. Esto permite un despliegue más seguro, controlado y reproducible.

El impacto de mantener `migrate dev` en producción es alto porque afecta directamente a la base de datos, que es uno de los componentes más críticos del sistema.

---

### 3. Montaje completo del código fuente mediante volúmenes

En la configuración actual se monta el proyecto completo dentro del contenedor mediante un volumen, por ejemplo:

```yaml
volumes:
  - .:/app
```

Esta práctica es útil durante el desarrollo porque permite modificar archivos en el host y ver los cambios reflejados dentro del contenedor sin reconstruir la imagen.

Sin embargo, en producción representa un problema porque expone dentro del contenedor archivos que no deberían estar disponibles, como:

* Código fuente completo.
* Tests.
* Archivos de configuración local.
* Directorios internos como `.git`.
* Archivos de desarrollo.

En producción, el contenedor debería ejecutar una imagen ya construida que contenga únicamente los artefactos necesarios para funcionar. Esto reduce el tamaño, mejora la seguridad y evita diferencias entre lo que se probó y lo que realmente se despliega.

---

### 4. Sistema de archivos sin modo `read_only`

Actualmente los contenedores pueden escribir libremente en su sistema de archivos interno. Esto no suele notarse durante el desarrollo, pero en producción aumenta el riesgo ante una posible vulnerabilidad.

Si un atacante logra ejecutar código dentro del contenedor, podría intentar:

* Crear archivos maliciosos.
* Modificar archivos existentes.
* Guardar scripts o herramientas.
* Alterar configuraciones internas.

Una forma de reducir este riesgo es configurar los servicios con:

```yaml
read_only: true
```

Con esta configuración, el filesystem principal del contenedor queda en modo solo lectura. En caso de que alguna parte de la aplicación necesite escribir temporalmente, se pueden utilizar mecanismos más controlados como:

```yaml
tmpfs:
  - /tmp
```

o volúmenes específicos para rutas puntuales.

Esta medida no reemplaza otras prácticas de seguridad, pero limita el impacto de una intrusión.

---

### 5. Linux capabilities innecesarias

Docker asigna por defecto un conjunto de Linux capabilities a los contenedores. Estas capabilities son permisos especiales del kernel que permiten realizar operaciones privilegiadas.

Muchas aplicaciones web, como una API Node.js o un frontend estático, no necesitan la mayoría de estas capacidades para funcionar.

Si se mantienen habilitadas capacidades innecesarias, el contenedor conserva más permisos de los requeridos. Esto aumenta el impacto potencial de una vulnerabilidad.

La solución recomendada es aplicar el principio de mínimo privilegio:

```yaml
cap_drop:
  - ALL
```

Luego, solo si el servicio realmente lo necesita, se puede agregar una capability específica:

```yaml
cap_add:
  - NET_BIND_SERVICE
```

De esta manera el contenedor opera con la menor cantidad de permisos posible, reduciendo la superficie de ataque.

---

## 1.2. Investigación de OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

OpenTelemetry es un estándar abierto para instrumentar aplicaciones y generar datos de observabilidad. Permite recolectar métricas, trazas y logs desde el código de una aplicación de forma unificada y con independencia de la herramienta final que se utilice para almacenar o visualizar esos datos.

Prometheus, en cambio, es una herramienta especializada en almacenar y consultar métricas de series temporales. Su funcionamiento se basa principalmente en consultar periódicamente endpoints de métricas expuestos por las aplicaciones.

La diferencia principal está en el rol que cumple cada herramienta:

* OpenTelemetry instrumenta la aplicación y genera datos de telemetría.
* Prometheus almacena y consulta métricas.
* Grafana visualiza esas métricas mediante dashboards.

Por lo tanto, OpenTelemetry y Prometheus no cumplen exactamente la misma función. En una arquitectura productiva suelen complementarse.

---

### ¿Cuáles son los tres pilares de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares de la observabilidad son:

1. **Métricas:** Valores numéricos medidos a lo largo del tiempo. Permiten conocer el estado general del sistema, como cantidad de requests, uso de memoria, latencia o errores.
2. **Logs:** Registros de eventos generados por la aplicación. Sirven para analizar comportamientos específicos y entender qué ocurrió ante un error.
3. **Trazas:** Representan el recorrido de una solicitud a través de uno o varios servicios. Ayudan a identificar cuellos de botella y problemas de rendimiento en sistemas distribuidos.

OpenTelemetry aborda los tres pilares. Su objetivo es brindar una forma estándar de generar y exportar métricas, logs y trazas sin depender de un proveedor específico.

---

### Métricas RED: Rate, Errors y Duration

El método RED se utiliza para monitorear servicios orientados a solicitudes, como una API REST.

Las tres métricas principales son:

#### Rate

Mide la cantidad de solicitudes procesadas por unidad de tiempo.

Sirve para conocer el nivel de tráfico que recibe la aplicación y detectar aumentos o caídas abruptas en el uso del sistema.

#### Errors

Mide la cantidad o proporción de solicitudes que finalizan con error.

Permite detectar fallas en endpoints, errores de validación, problemas internos o degradaciones luego de un despliegue.

#### Duration

Mide cuánto tarda la aplicación en responder una solicitud.

Es una métrica clave para evaluar la experiencia del usuario. Suele analizarse con percentiles como p95 o p99, ya que los promedios pueden ocultar casos lentos.

En conjunto, estas métricas permiten responder rápidamente tres preguntas importantes:

* ¿Cuánto tráfico recibe la API?
* ¿Cuántas solicitudes fallan?
* ¿Cuánto tarda en responder?

---

### ¿Qué es OTLP?

OTLP significa OpenTelemetry Protocol. Es el protocolo estándar utilizado por OpenTelemetry para enviar datos de telemetría, como métricas, logs y trazas.

Puede trabajar sobre HTTP o gRPC y permite desacoplar la aplicación de la herramienta final de monitoreo.

La principal ventaja frente a exportar directamente a Prometheus es que la aplicación no queda atada a un único destino. Si se utiliza OTLP, los datos pueden enviarse a un colector de OpenTelemetry y desde allí redirigirse a distintas herramientas, como Prometheus, Grafana Cloud, Datadog o New Relic.

Esto mejora la flexibilidad de la arquitectura y evita tener que modificar el código de la aplicación si en el futuro cambia la plataforma de observabilidad.

---

### ¿Cómo se relaciona OpenTelemetry con Grafana?

OpenTelemetry y Grafana se relacionan dentro de una arquitectura de observabilidad, pero cumplen roles diferentes.

OpenTelemetry se encarga de instrumentar la aplicación y generar datos de telemetría.

Grafana se encarga de visualizar esos datos mediante paneles y dashboards.

En el proyecto Alentapp, el flujo esperado sería:

```text
API Alentapp → OpenTelemetry → Prometheus → Grafana
```

La API genera métricas mediante OpenTelemetry. Prometheus las recolecta y almacena. Finalmente, Grafana consulta Prometheus y permite construir dashboards para visualizar el estado del sistema en tiempo real.

Esto permite observar métricas como requests por segundo, tasa de errores, latencia y consumo de recursos.

