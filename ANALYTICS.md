# Inventario Inteligente — Sistema de Analitica

## Stack

| Libreria | Uso |
|---|---|
| `pandas` | DataFrames, groupby, resample, rolling windows, ewm (exponential smoothing), corr (Pearson) |
| `numpy` | sqrt, operaciones vectoriales, estadistica base |
| `scipy.stats` | `norm.ppf()` — distribucion normal inversa para safety stock y z-scores |

## Endpoint

**`GET /api/analytics?token={TOKEN}`**

Retorna analitica basica + avanzada. El campo `advanced` contiene los resultados de las 8 tecnicas.

---

## Tecnicas Aplicadas

### 1. Prediccion de Demanda
**Metodo:** Exponential Smoothing (`pandas.ewm(alpha=0.3)`)

```python
# Serie diaria de ventas por producto
daily = df_sales.set_index('date').resample('D')['qty'].sum().abs()
smoothed = daily.ewm(alpha=0.3, adjust=False).mean()
forecast = smoothed.iloc[-1]  # Ultimo valor suavizado
```

- Forecast a 7 dias: `forecast × 7`
- Tendencia: compara ultimo vs penultimo valor
- Confianza basada en desviacion estandar

---

### 2. Clasificacion ABC-XYZ
**Metodo:** Pareto (ABC) + Coeficiente de Variacion (XYZ)

```python
# ABC: revenue acumulado
revenue = df_sales.groupby('sku')['revenue'].sum()
revenue['pct'] = revenue / revenue.sum() * 100
revenue['cum_pct'] = revenue.sort_values(ascending=False)['pct'].cumsum()
# A = cum_pct <= 70, B = cum_pct <= 90, C = resto

# XYZ: variabilidad de demanda
daily = df_sales.set_index('date').resample('D')['qty'].sum().abs()
cv = daily.std() / daily.mean()  # Coeficiente de variacion
# X = cv bajo (estable), Y = medio, Z = alto (erratico)
```

**Interpretacion:**
- **AX**: producto estrella — alto valor, demanda estable. Prioridad maxima.
- **CZ**: producto marginal — bajo valor, erratico. Candidato a descontinuar.

---

### 3. Punto de Reorden (ROP)
**Metodo:** Safety Stock con `scipy.stats.norm.ppf()`

```python
from scipy.stats import norm

z_score = norm.ppf(service_level)  # 95% -> 1.645
rop = avg_daily_demand * lead_time_days + z_score * std_daily * np.sqrt(lead_time_days)
```

**Formula completa:**
```
ROP = d̄ × L + z × σd × √L

Donde:
  d̄  = demanda diaria promedio
  L   = lead time (dias hasta recibir pedido)
  z   = z-score para nivel de servicio (95% = 1.645)
  σd  = desviacion estandar de demanda diaria
```

**Safety Stock:** `z × σd × √L` — inventario extra para absorber variabilidad.

---

### 4. Deteccion de Anomalias
**Metodo:** Rolling Z-Score (`pandas.rolling()`)

```python
rolling_mean = daily_total.rolling(window=7).mean()
rolling_std = daily_total.rolling(window=7).std()
z = (value - rolling_mean) / rolling_std
# |z| > 2.0 -> anomalia
```

- Ventana: 7 dias
- Umbral: |z| > 2.0
- Spike: z positivo (ventas inusualmente altas)
- Drop: z negativo (ventas inusualmente bajas)

---

### 5. Correlacion de Productos
**Metodo:** Pearson (`pandas.DataFrame.corr()`)

```python
pivot = df_sales.pivot_table(index='date', columns='sku', values='qty', aggfunc='sum')
corr_matrix = pivot.corr()  # Matriz de correlacion de Pearson
# |r| > 0.3 -> correlacion significativa
```

**Interpretacion:**
- r > 0.6: fuerte — los productos se venden juntos consistentemente
- r 0.3-0.6: moderada — alguna relacion
- r < 0.3: debil — sin patron claro

---

### 6. Estacionalidad
**Metodo:** Indice Mensual (`pandas.resample('ME')`)

```python
monthly = df_sales.set_index('date').resample('ME')['revenue'].sum()
avg_by_month = monthly.groupby(monthly.index.month).mean()
monthly_index = avg_by_month / avg_by_month.mean()
# > 1.0 = mes fuerte, < 1.0 = mes debil
```

- Amplitud > 0.3: hay estacionalidad significativa
- Pico: mes con mayor indice
- Valle: mes con menor indice

---

### 7. Rotacion de Inventario
**Metodo:** Turnover Ratio

```python
sales_qty = abs(df_sales[df_sales['sku'] == sku]['qty'].sum())
avg_inventory = max(current_stock, sales_qty / 12)
turnover = sales_qty / avg_inventory
days_to_sell = 365 / turnover
```

**Clasificacion:**
- Alta (>12x): producto saludable, rota mas de 1 vez al mes
- Media (4-12x): rotacion aceptable
- Baja (<4x): capital estancado, considerar promocion o descontinuacion

---

### 8. Analisis de Precios
**Metodo:** Relacion Precio-Demanda

```python
margin_pct = (price - cost) / price * 100
avg_daily_demand = daily_sales.mean()
```

**Sugerencias:**
- `increase_price`: alta demanda (>5 unid/dia) + margen bajo — espacio para subir
- `consider_discount`: baja demanda (<1 unid/dia) — necesita impulso
- `maintain`: equilibrio — no tocar

---

## Arquitectura

```
app/services/analytics_service.py   # Logica de analitica (pandas, numpy, scipy)
app/routers/api.py                  # GET /api/analytics (endpoint REST)
front/src/components/AnalyticsPanel.tsx  # Visualizacion (recharts)
```

**Flujo:**
1. Frontend llama `GET /api/analytics?token=X`
2. `api.py` carga datos de Google Sheets (INVENTARIO + MOVIMIENTOS)
3. Construye `AnalyticsService(products, movements)`
4. `full_report()` ejecuta las 8 tecnicas
5. Retorna JSON completo al frontend
6. `AnalyticsPanel` renderiza graficas con `recharts`

**Cero impacto en el bot:** la analitica solo se computa bajo demanda. El webhook de Telegram usa `InventoryService` e `ia_service`, completamente separados de `AnalyticsService`.
