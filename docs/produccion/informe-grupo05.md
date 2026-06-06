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