# ¿Ganamos o perdimos?

Compara la evolución salarial en Argentina con la inflación de una canasta de
consumo por clase social. Responde cuánto poder de compra ganó o perdió el sector
elegido desde un mes de referencia.

## Estructura

- `public/`: interfaz HTML, CSS y JavaScript, sin framework ni proceso de build.
- `api/index.py`: API Python para Vercel; descarga series del INDEC vía datos.gob.ar.
- `ponderaciones.xlsx`: pesos de cada rubro de consumo por clase.
- `server.py`: servidor local que sirve la interfaz y reproduce la API.
- `app_inflacion.py`: prototipo previo en Streamlit.
- `PRODUCT.md`: propósito del producto; `DESIGN.md`: criterios de interfaz.

## Cálculo

Se ponderan los índices de precios por clase y se normalizan, junto con los
salarios del sector elegido, a 100 en el mes inicial. El salario real es:

`ISR = índice salarial / índice de precios ponderado × 100`

El resultado destacado es `ISR − 100`, en porcentaje. El período se corta al
último mes compartido por precios y salarios. La interfaz usa la API original:

- `GET /api/index`: fechas, canasta de referencia y ponderaciones.
- `GET /api/index?clase=Media&salario=privado&fecha=2023-12-01`: series y resultado.

Es una comparación del sector y de una canasta representativa, no una medición
del sueldo ni de los gastos exactos de una persona. Los pesos de las canastas
son los definidos por el proyecto. La sugerencia de clase es orientativa.

## Desarrollo local

```sh
python -m pip install -r requirements.txt
python server.py
```

Abrir `http://localhost:3000`. Se necesita acceso a datos.gob.ar para calcular.
No hace falta Node para ejecutar la aplicación. La interfaz no carga fuentes
ni librerías de gráficos desde un CDN.

## Verificación de interfaz

Con Playwright y Chromium instalados, ejecutar en otra terminal:

```sh
node tests/ui.cjs
```

El servidor local debe estar encendido. Si Playwright está instalado fuera del
proyecto, usar `NODE_PATH` para indicar su carpeta `node_modules`. Las respuestas
sintéticas de prueba se interceptan en el navegador y nunca se usan en producción.

La configuración de Vercel existente sigue sirviendo `public/` y `api/index.py`.
