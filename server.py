import os
import sys
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Ensure api directory is in python path
sys.path.insert(0, os.path.dirname(__file__))
from api.index import fetch_indec, load_ponderaciones, SALARIO_MAP, CLASES_VALIDAS, compute_isr, safe_round, pd

class LocalDevHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.join(os.path.dirname(__file__), "public"), **kwargs)

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api"):
            params = parse_qs(parsed.query)

            def p(key, default=None):
                return params.get(key, [default])[0]

            try:
                df_all = fetch_indec()
                df_pond = load_ponderaciones()

                canasta_max = float(df_all['Costo_Canasta'].dropna().max())
                fecha_min = df_all.index.min().strftime('%Y-%m-%d')
                fecha_max = df_all.index.max().strftime('%Y-%m-%d')

                clase = p('clase')
                salario_key = p('salario')
                fecha_str = p('fecha')

                if not clase or not salario_key or not fecha_str:
                    self.send_json({
                        'canasta_max': canasta_max,
                        'fecha_min': fecha_min,
                        'fecha_max': fecha_max,
                        'ponderaciones': {
                            col: df_pond[col].round(4).to_dict()
                            for col in df_pond.columns
                        },
                    })
                    return

                if clase not in CLASES_VALIDAS:
                    raise ValueError(f"Clase inválida: '{clase}'. Valores posibles: {sorted(CLASES_VALIDAS)}")

                salario_col = SALARIO_MAP.get(salario_key.lower())
                if not salario_col:
                    raise ValueError(f"Tipo de salario inválido: '{salario_key}'")

                fecha_ts = pd.Timestamp(fecha_str).replace(day=1)
                if fecha_ts < df_all.index.min():
                    fecha_ts = df_all.index.min()
                if fecha_ts > df_all.index.max():
                    raise ValueError("La fecha de inicio supera el último dato disponible.")

                df_isr = compute_isr(df_all, df_pond, clase, salario_col, fecha_ts)

                self.send_json({
                    'fechas': df_isr['fecha'].tolist(),
                    'isr': [safe_round(v) for v in df_isr['ISR']],
                    'ipc': [safe_round(v) for v in df_isr['IPC Clase']],
                    'isal': [safe_round(v) for v in df_isr['ISAL']],
                    'fecha_min': fecha_min,
                    'fecha_max': fecha_max,
                    'fecha_datos': df_isr['fecha'].iloc[-1],
                    'canasta_max': canasta_max,
                    'ultimo_isr': safe_round(df_isr['ISR'].iloc[-1]),
                    'clase': clase,
                    'salario_key': salario_key,
                })
            except Exception as exc:
                self.send_json({'error': str(exc)}, status=500)
            return

        super().do_GET()

    def do_OPTIONS(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api"):
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            return
        super().do_OPTIONS()

if __name__ == "__main__":
    port = 3000
    server = HTTPServer(("0.0.0.0", port), LocalDevHandler)
    print(f"Local Python dev server listening on http://localhost:{port}")
    server.serve_forever()
