# Revisión del rediseño

Verificado el 3 de octubre de 2026.

## Interfaz

La prueba `tests/ui.cjs` pasó en Chromium:

- 12 combinaciones de las tres clases y los cuatro sectores.
- Ganancia, pérdida y empate; porcentajes, parámetros y fecha enviados a la API.
- Meses disponibles en los años inicial y final de la serie.
- Ayuda de clase, confirmación, Escape y navegación con teclado en el diálogo.
- Ambas vistas del gráfico, tabla de datos y descarga de PNG.
- Recuperación ante errores de metadatos y de análisis.
- Cancelación de consultas anteriores cuando cambia una elección.
- Funcionamiento con localStorage bloqueado.
- Ausencia de desbordamiento horizontal en 320, 390, 768 y 1440 px.
- Sin errores JavaScript de página durante esos recorridos.

Las pruebas de estados usan series sintéticas interceptadas exclusivamente por
Playwright. El frontend publicado consulta la API del proyecto.

## Datos reales y revisión visual

También se ejecutó `python server.py` y se hizo el recorrido completo en Chromium
sin interceptar las peticiones. El servidor consultó las series externas y el
cálculo original. La selección fue clase Media, sector privado, desde diciembre
de 2023. La API devolvió un ISR de 102,55, con datos compartidos hasta julio de
2026. El redondeo del porcentaje visible es +2,6%.

Las capturas de este directorio corresponden a ese recorrido real:

- `ui-inicio.png`: primera pantalla.
- `ui-escritorio.png`: resultado en escritorio, viewport de 1440 px.
- `ui-movil.png`: resultado en móvil, viewport de 390 px.

Se revisaron visualmente las capturas, el diálogo móvil y la imagen PNG exportada.
Las capturas son ejemplos fechados, no resultados actuales garantizados.

## Alcance

No se modificaron `api/index.py`, `server.py`, `app_inflacion.py`,
`ponderaciones.xlsx`, `requirements.txt` ni `vercel.json`. El cálculo conserva
sus fuentes, ponderaciones, normalización, relleno de huecos y corte temporal.

La UI elimina la confianza porcentual sin fundamento del orientador y conserva
sus umbrales con los datos cargados. No ofrece una sugerencia si falta la fuente.
No se realizó una auditoría formal WCAG ni pruebas en dispositivos físicos o Safari.

## Integración con cambios concurrentes

Se conservan las instrucciones AGENTS, Makefile, ignores y documentación de
arranque incorporados por `72e4b90`. Se resolvió la documentación de la UI y se
extendió `scripts/check.py` para que `make check` también valide el JavaScript
externo de `public/app.js`, además de cualquier script inline.
