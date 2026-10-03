# Instrucciones para agentes

- Antes de editar, leé [README.md](README.md), [PRODUCT.md](PRODUCT.md) y la documentación pertinente. Para UI, contrastá [DESIGN.md](DESIGN.md) con `public/index.html`: hay diferencias visuales documentadas en README.
- Inspeccioná la implementación y sus referencias antes de inventar arquitectura. Respetá las convenciones locales y preservá cambios previos del usuario.
- Hacé cambios pequeños y justificados. No agregues dependencias, actualizaciones, refactors ni movimientos ajenos al objetivo.
- Nunca incluyas secretos, credenciales, sesiones ni datos personales en código, ejemplos, Git o logs.
- Actualizá la documentación si cambia comportamiento relevante, configuración o comandos. Enlazá los documentos existentes en lugar de copiarlos aquí.
- Ejecutá los checks apropiados después de modificar código; reportá comandos de test/build/lint y resultados, incluidos los que no existan o no puedas ejecutar. Diferenciá sintaxis, arranque y validación funcional.
- Compará con la revisión inicial para distinguir errores preexistentes de introducidos. Si no tenés evidencia suficiente para atribuirlos, indicá la incertidumbre.
- No hagas commits ni publiques/despliegues salvo instrucción expresa del usuario.

## Límites de este proyecto

- La web actual entra por `server.py` y `public/index.html`; `api/index.py` es el handler de producción. `app_inflacion.py` es un prototipo distinto: no lo uses como fuente de verdad del comportamiento desplegado.
- Conservá `/api/index`, parámetros, campos JSON y rutas de Vercel. Antes de mover/eliminar archivos, verificá imports, paths del Excel, scripts, configuración de despliegue y referencias documentales.
- En mantenimiento de estructura/documentación no cambies lógica económica: IDs/columnas de series, ponderaciones, base 100, umbrales de clase, períodos, corte común IPC/salarios, relleno de huecos ni redondeo/nulls. Un cambio metodológico requiere un objetivo explícito, su justificación y validación con datos controlados.
- `ponderaciones.xlsx` es un input necesario. No lo regeneres, sobrescribas ni retires como si fuera un build; preservá su procedencia y contenido.
- No inventes observaciones, fuentes o proyecciones para suplir una caída del proveedor. Distinguí fallos de red/datos de regresiones locales.
- Usá `make check` o los equivalentes del README. No hay actualmente tests funcionales ni lint/build local configurados; no afirmes que pasaron. Para cambios de producto, comprobá arranque y consultas relevantes sin desplegar ni modificar servicios externos.
