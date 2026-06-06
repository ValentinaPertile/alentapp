## 4.1. Verificación técnica

| Métrica | Antes (desarrollo) | Después (producción) | Mejora |
|---|---:|---:|---|
| Tamaño imagen API | 1.77 GB | 783 MB | -56% |
| Tamaño imagen Web | 979 MB | 93.7 MB | -90% |
| Tiempo de startup API | 29.777 s | 27.644 s | -7% |
| Memoria API idle | 28.49 MiB | 45.76 MiB | +60% (overhead de OpenTelemetry) |
| Endpoints accesibles | curl :3000/ → 200 OK | curl :3000/ → 200 OK | Estable |
| Frontend vía Nginx | Vite dev server | curl :80/ → 200 OK | Migrado a Nginx |
