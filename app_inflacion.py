import pandas as pd
import matplotlib.pyplot as plt
import requests
import yfinance as yf
import streamlit as st

st.set_page_config(page_title="¿Ganamos o Perdimos?", page_icon="📊", layout="wide")

@st.cache_data
def pond():
  try:
    df_pond = pd.read_excel('ponderaciones.xlsx')
    df_pond.set_index("Rubro", inplace=True)
    return df_pond
  except Exception:
    return pd.DataFrame({
      'Alta': {'Alimentos y bebidas no alcohólicas': 0.199, 'Bebidas alcohólicas y tabaco': 0.026, 'Prendas de vestir y calzado': 0.06, 'Vivienda, agua, electricidad, gas y otros combustibles': 0.15, 'Equipamiento y mantenimiento del hogar': 0.062, 'Salud': 0.075, 'Transporte': 0.177, 'Comunicaciones': 0.045, 'Recreación y cultura': 0.046, 'Educación': 0.057, 'Restaurantes y hoteles': 0.057, 'Bienes y servicios varios': 0.046},
      'Media': {'Alimentos y bebidas no alcohólicas': 0.242, 'Bebidas alcohólicas y tabaco': 0.031, 'Prendas de vestir y calzado': 0.0695, 'Vivienda, agua, electricidad, gas y otros combustibles': 0.162, 'Equipamiento y mantenimiento del hogar': 0.053, 'Salud': 0.064, 'Transporte': 0.167, 'Comunicaciones': 0.043, 'Recreación y cultura': 0.039, 'Educación': 0.0355, 'Restaurantes y hoteles': 0.048, 'Bienes y servicios varios': 0.046},
      'Baja': {'Alimentos y bebidas no alcohólicas': 0.297, 'Bebidas alcohólicas y tabaco': 0.038, 'Prendas de vestir y calzado': 0.081, 'Vivienda, agua, electricidad, gas y otros combustibles': 0.1635, 'Equipamiento y mantenimiento del hogar': 0.045, 'Salud': 0.043, 'Transporte': 0.146, 'Comunicaciones': 0.038, 'Recreación y cultura': 0.035, 'Educación': 0.024, 'Restaurantes y hoteles': 0.043, 'Bienes y servicios varios': 0.0465}
    })

@st.cache_data(ttl=3600)
def load_all():
  api_all = f"https://apis.datos.gob.ar/series/api/series/?ids=145.3_INGNACNAL_DICI_M_15,149.1_TL_INDIIOS_OCTU_0_21,150.1_CSTA_BATAL_0_D_20,146.3_IALIMENNAL_DICI_M_45,146.3_IBEBIDANAL_DICI_M_39,146.3_IPRENDANAL_DICI_M_35,146.3_IVIVIENNAL_DICI_M_52,146.3_IEQUIPANAL_DICI_M_46,146.3_ISALUDNAL_DICI_M_18,146.3_ITRANSPNAL_DICI_M_23,146.3_ICOMUNINAL_DICI_M_27,146.3_IRECREANAL_DICI_M_31,146.3_IEDUCACNAL_DICI_M_22,146.3_IRESTAUNAL_DICI_M_33,146.3_IBIENESNAL_DICI_M_36,149.1_SOR_PRIADO_OCTU_0_25,149.1_SOR_PUBICO_OCTU_0_14,149.1_SOR_PRIADO_OCTU_0_28&limit=5000&start_date=2016-12-01&format=json"
  try:
    resp_all = requests.get(api_all, timeout=15)
    resp_all.raise_for_status()
    datos_all = resp_all.json()
  except Exception as e:
    st.error(f"Error al conectar con la API de INDEC: {e}")
    st.stop()

  columnas_all = [
    'fecha',
    'Indice_IPC',
    'Indice_Salarial',
    'Costo_Canasta',
    'Alimentos y bebidas no alcohólicas', # [cite: 149]
    'Bebidas alcohólicas y tabaco',       # [cite: 150]
    'Prendas de vestir y calzado',        # [cite: 149]
    'Vivienda, agua, electricidad, gas y otros combustibles',
    'Equipamiento y mantenimiento del hogar',
    'Salud',                              # [cite: 169]
    'Transporte',                         # [cite: 172]
    'Comunicaciones',                     # [cite: 174]
    'Recreación y cultura',
    'Educación',                          # [cite: 170]
    'Restaurantes y hoteles',             # [cite: 173]
    'Bienes y servicios varios',          # [cite: 175]
    'Privado',
    'Público',
    'Informal'
  ]
  df_all = pd.DataFrame(datos_all['data'], columns=columnas_all)
  df_all.set_index('fecha', inplace=True)
  df_all.index = pd.to_datetime(df_all.index)
  df_all.astype(float)
  return df_all

with st.spinner("Descargando datos oficiales del INDEC..."):
    df_all = load_all()
    df_pond = pond()
st.title("¿Ganamos o Perdimos?")
st.markdown(
    """
    <p style='margin-top: -15px; font-size: 1.1rem; color: #A0AAB2;'>
    Un análisis del poder adquisitivo según tu clase social y tu ingreso familiar.
    </p>
    """, 
    unsafe_allow_html=True
)
col_izq, col_der = st.columns([1,2])
with col_izq:
    st.subheader("Configurá tu Análisis")
    # input "asigned" social class
    clase_s = st.segmented_control("Clase Social", options = ['Alta', 'Media', 'Baja'], default=None)
    # creo variable vacía que guarde la elección
    clase_final = clase_s if clase_s is not None else ""

    salario_s = st.segmented_control("Origen de los Ingresos", options = ['Público', 'Privado', 'Informal','No sé'], default=None)
    # creo variable vacía que guarde la elección
    salario_final = ""
    # display the selected class
    if salario_s is None:
        pass
    elif salario_s == 'No sé':
        salario_final = 'Indice_Salarial'
    else:
        salario_final = salario_s

    if clase_final != "" and salario_final != "":

        st.divider()
        st.subheader(f"Período: Clase {clase_final}")
        fecha_minima = df_all.index.min()
        fecha_maxima = df_all.index.max()
        fecha_inicio = st.date_input(
            "Selecciona el mes de inicio del análisis (Base 100):",
            min_value=fecha_minima,
            value=fecha_minima,
            max_value=fecha_maxima
        )
        fecha_1 = fecha_inicio.replace(day=1)
        fecha_str = fecha_1.strftime('%Y-%m-%d')
        df_rubros = df_all.drop(columns=['Indice_IPC', 'Indice_Salarial', 'Costo_Canasta','Privado','Público','Informal'])
        df_rubros.index = pd.to_datetime(df_rubros.index)
        df_base = df_rubros[df_rubros.index >= fecha_str]
        df_clase = df_pond[clase_final]
        df_isr= df_base.dot(df_clase).to_frame('IPC Clase')
        df_isr['IPC Clase'] = df_isr['IPC Clase'] / df_isr.loc[fecha_str, 'IPC Clase'] * 100
        df_isr['ISAL'] = df_all.loc[fecha_str:, salario_final] / df_all.loc[fecha_str, salario_final] * 100
        df_isr['ISR'] = df_isr['ISAL'] / df_isr['IPC Clase'] * 100
    
        with col_der:
            fig, ax = plt.subplots(figsize=(7, 4))
          
            ax.plot(df_isr.index, df_isr['ISR'], label='Salario Real (Poder de Compra)', color='#1f77b4', linewidth=3)
            ax.axhline(100, color='red', linestyle='--', linewidth=1.5, label='Base 100')
            ax.set_title(f"Salarios vs. Inflación desde {fecha_str}", fontsize=14)
            ax.set_xlabel("Fecha", fontsize=12)
            ax.set_ylabel("Índice (Base 100)", fontsize=12)
            ax.legend(loc='best')
            ax.grid(True, linestyle='--', alpha=0.5)
            st.pyplot(fig, use_container_width=False)
