# ¿Ganamos o Perdimos?

Aplicación web para comparar la evolución de los salarios argentinos con un índice de precios ponderado por clase social. Usa series oficiales obtenidas desde la API de Series de Tiempo de Datos Argentina y las ponderaciones de `ponderaciones.xlsx`. El propósito y el comportamiento del producto están en [PRODUCT.md](PRODUCT.md).

## Arrancar la web actual

Necesitás Python y acceso a internet para consultar los datos. Python 3.11 es la referencia del devcontainer; las dependencias actuales se instalan desde `requirements.txt`, sin versiones fijadas. La UI usa HTML, CSS, JavaScript y gráficos SVG nativos; no requiere fuentes ni librerías externas. La descarga de PNG se genera en el navegador.

Desde la raíz del repositorio, en macOS/Linux:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python server.py
```

Equivalente con Make: `make setup` y `make dev`. Podés elegir el intérprete de instalación con `make setup PYTHON=python3.11`.

En PowerShell, desde la raíz:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe server.py
```

Abrí `http://localhost:3000`. Detené el servidor con Ctrl+C. El servidor de desarrollo escucha en `0.0.0.0:3000`; el puerto está fijado en `server.py`. No hay variables de entorno de aplicación ni secretos que configurar para este flujo; no hace falta un `.env`.

## Mapa del repositorio

| Archivo/directorio | Función |
|---|---|
| `public/index.html` | Estructura y contenido semántico de la interfaz |
| `public/styles.css` | Diseño editorial y adaptación móvil |
| `public/app.js` | Consultas a `/api/index`, estado de interfaz, gráficos y exportación |
| `tests/ui.cjs` | Pruebas funcionales de interfaz con Playwright |
| `api/index.py` | Descarga de series, carga de ponderaciones, cálculo y handler serverless |
| `server.py` | Servidor local de estáticos y API; reutiliza los helpers económicos |
| `ponderaciones.xlsx` | Input del cálculo, leído desde la raíz por el API |
| `requirements.txt` | Dependencias de la web/API actual |
| `vercel.json` | Rutas y configuración de despliegue |
| `app_inflacion.py` | Prototipo Streamlit, distinto del punto de entrada de la web |
| `scripts/check.py` | Comprobaciones estáticas sin llamadas al proveedor de datos |
| `AGENTS.md` | Instrucciones operativas para agentes |

La estructura es deliberadamente pequeña. Las rutas del handler y del Excel están referenciadas por el servidor y el despliegue; verificá esas referencias antes de mover archivos.

## Datos y metodología existente

`api/index.py` define los IDs de las series en `API_INDEC`, las columnas y los sectores salariales. La consulta comienza en diciembre de 2016; la disponibilidad final depende del proveedor. El API devuelve metadatos cuando faltan parámetros, o series calculadas al recibir `clase`, `salario` y `fecha`.

El cálculo pondera los rubros de IPC según Alta/Media/Baja, normaliza IPC y salarios a base 100 desde la fecha seleccionada y calcula `ISR = ISAL / IPC Clase × 100`. Recorta al último período real común de IPC y salarios antes de rellenar huecos internos. `safe_round()` convierte valores no finitos en `null`. El frontend usa el costo de canasta para la estimación de clase cuando el usuario selecciona «No sé».

Estos párrafos describen el código actual; no validan ni sustituyen una revisión metodológica. Ponderaciones, series, umbrales, períodos y tratamiento de faltantes requieren una tarea económica explícita para cambiarse. Mantenerlos durante trabajos de documentación/estructura.

## Verificación

Desde la raíz:

```sh
make check
# Sin Make:
python3 scripts/check.py
git diff --check
```

El script parsea los archivos Python del producto y el propio check, valida `vercel.json`, comprueba que los assets/inputs principales existen y revisa la sintaxis del JavaScript inline y de los scripts locales referenciados por el HTML con `node --check` si Node está disponible. No escribe datos ni importa/ejecuta la aplicación. Si falta Node, informa que JavaScript quedó sin comprobar. `git diff --check` detecta problemas de whitespace del diff.

**No hay lint/formatter configurados ni comando de build local.** El check estático no equivale a una validación funcional. La suite de interfaz `tests/ui.cjs` se ejecuta por separado con Playwright y Chromium instalados: `node tests/ui.cjs`, manteniendo el servidor local encendido. Si Playwright está instalado fuera del proyecto, indicar su carpeta `node_modules` mediante `NODE_PATH`; `CHROMIUM_PATH` permite usar un binario de Chromium existente. La suite intercepta respuestas sintéticas exclusivamente en las pruebas; producción siempre consulta la API. El alcance y las pruebas realizadas están en [docs/VERIFICACION.md](docs/VERIFICACION.md). No se requiere un bundle frontend: Vercel sirve los estáticos y procesa la función Python. Un build/deploy de Vercel sólo debe declararse verificado si se ejecutó con su configuración y entorno reales.

Después de cambios de producto, comprobá también el arranque, metadatos y una consulta desde la UI. Un chequeo HTTP de lectura del servidor local es:

```sh
curl --fail http://localhost:3000/
curl --fail http://localhost:3000/api/index
```

La segunda consulta depende de Datos Argentina y puede fallar por red/proveedor; no atribuir ese fallo a un cambio local sin evidencia. Una respuesta estática válida no acredita por sí sola datos o gráficos correctos.

## Despliegue y documentos

`vercel.json` configura la función `api/index.py` y `public/**`: `/api/(.*)` apunta al handler y las demás rutas a `public/`. Conservá el contrato `/api/index`, sus parámetros y campos JSON. Mantener `ponderaciones.xlsx` disponible para la función. No se despliega automáticamente al ejecutar Make.

[DESIGN.md](DESIGN.md) documenta el rediseño editorial: fondo papel, tipografía fuerte, una selección de tres pasos y el porcentaje de poder de compra como resultado principal. El índice original sigue disponible en el gráfico y la tabla. La ayuda para elegir clase es opcional y orientativa; el resultado representa el sector y la canasta, no el sueldo exacto del usuario. El cálculo económico y sus ponderaciones se mantienen. `.claude/skills/impeccable/` y sus hooks son tooling existente; se mantienen en su ubicación.

## Prototipo y devcontainer

`app_inflacion.py` usa Streamlit, matplotlib y yfinance, además de las dependencias de la web. `requirements.txt` no describe un entorno completo para ese prototipo. `.devcontainer/devcontainer.json` arranca Streamlit en 8501 y deshabilita sus protecciones CORS/XSRF; ese flujo merece revisión antes de exponerlo. Para trabajar con la web actual, usá `server.py` y los comandos anteriores. No se elimina ni modifica el prototipo en esta estandarización.

Los siguientes trabajos quedan separados: tests unitarios del cálculo con datos controlados, lint/format consensuado, versiones reproducibles del entorno y revisión del flujo devcontainer. No versionar `.env`, credenciales, cachés ni configuración privada; los ejemplos futuros deben contener sólo placeholders y valores públicos seguros.
