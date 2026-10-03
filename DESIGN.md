# ¿Ganamos o perdimos? — Interfaz editorial

## Intención

Una herramienta cotidiana para entender si los salarios le ganaron a los precios.
La respuesta es el centro de la pantalla. El formulario lleva de tres elecciones
explícitas a un resultado comprensible, sin requerir conocimientos de economía.

## Lenguaje visual

- Fondo papel `#f4f3ed`, tinta `#20231f`, líneas finas y espacio sin contenedores decorativos.
- Acción principal en terracota `#c13b20`; ganancia `#236547`, pérdida `#b63825`.
- Arial/Helvetica del sistema: carga inmediata, letras contundentes, números tabulares.
- Titular grande, alineado a la izquierda. Bordes rectos. Sin gradientes, sombras,
  cristales, emojis decorativos ni tarjetas repetidas.
- El color acompaña palabras y signos; nunca comunica un resultado por sí solo.

## Recorrido

1. Elegir clase social. La ayuda para estimarla es opcional.
2. Elegir sector laboral o promedio general.
3. Elegir mes de inicio y presionar «Ver resultado».
4. Leer «Ganamos», «Perdimos» o «Quedamos a mano» y el porcentaje de cambio real.
5. Consultar aumentos de salarios/precios, evolución mensual, datos y canasta.

Cambiar un filtro retira el resultado anterior y cancela consultas pendientes.
La aplicación espera una confirmación explícita para consultar nuevamente.
No mueve el scroll al cambiar un filtro. Después de calcular, en móvil lleva
al resultado; respeta la preferencia de movimiento reducido.

## Jerarquía y rigor

- Resultado principal = ISR − 100, mostrado como porcentaje con una cifra decimal.
- El ISR original y las otras series siguen visibles en la tabla y el gráfico.
- Las palabras de ganancia/empate/pérdida coinciden con la precisión mostrada.
- Las fechas corresponden al período real de datos compartidos, nunca a «hoy».
- Se explica que los datos representan el sector, no el sueldo exacto del usuario.
- Sueldos y precios comparten una escala en su propia vista. No hay doble eje.
- La ayuda de clase conserva los umbrales originales con datos cargados; elimina
  cifras de confianza sin fundamento y umbrales de respaldo desactualizados.
- La metodología distingue las series del INDEC de las ponderaciones del proyecto.

## Accesibilidad y adaptación

Radios nativos agrupados con fieldset/legend, etiquetas visibles, foco contrastante,
link para saltar al formulario, diálogo nativo con Escape y retorno de foco,
estados de carga/error anunciados, tabla equivalente al gráfico y colores con texto.
A partir de 760 px la disposición pasa a una columna. El formulario funciona desde
320 px. Las vistas del gráfico y la descarga de PNG no dependen de servicios externos.

## Archivos

- `public/index.html`: contenido y estructura semántica.
- `public/styles.css`: sistema visual y responsive.
- `public/app.js`: estado de interfaz, consultas, SVG, descarga y eventos.
- `api/index.py`: cálculo original, sin modificaciones.
- `ponderaciones.xlsx`: ponderaciones originales, sin modificaciones.

## Verificación

`tests/ui.cjs` verifica las combinaciones de clase/sector, estados de resultado,
fechas válidas, ayuda de clase, teclado, exportación, reintentos, consultas obsoletas,
almacenamiento bloqueado y anchos entre 320 y 1440 px. Usa respuestas sintéticas
solo para pruebas; la aplicación no incluye resultados de ejemplo ni datos inventados.
