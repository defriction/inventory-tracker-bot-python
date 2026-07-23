# Inventario Inteligente — Sistema de Analitica

## Stack

| Libreria | Uso |
|---|---|
| `pandas` | DataFrames, groupby, resample, rolling windows, ewm (exponential smoothing), corr (Pearson) |
| `numpy` | sqrt, operaciones vectoriales, estadistica base |
| `scipy.stats` | `norm.ppf()` — distribucion normal inversa para safety stock y z-scores |

## Endpoint

**`GET /api/analytics?token={TOKEN}`**

Retorna analitica basica + avanzada. Cacheado 60s en Redis.

---

## Tecnicas Aplicadas (13 en total)

### 1. Prediccion de Demanda
**Metodo:** Exponential Smoothing (`pandas.ewm(alpha=0.3)`)

```python
daily = df_sales.set_index('date').resample('D')['qty'].sum().abs()
smoothed = daily.ewm(alpha=0.3, adjust=False).mean()
forecast = smoothed.iloc[-1]
```

### 2. Clasificacion ABC-XYZ
**Metodo:** Pareto (ABC) + Coeficiente de Variacion (XYZ)

```python
# ABC
revenue['cum_pct'] = revenue.sort_values('total_revenue', ascending=False)['pct'].cumsum()

# XYZ
cv = daily.std() / daily.mean()
```

### 3. Punto de Reorden (ROP)
**Metodo:** Safety Stock con `scipy.stats.norm.ppf()`

```
ROP = d × L + z × σd × √L
```

### 4. Deteccion de Anomalias
**Metodo:** Rolling Z-Score (`pandas.rolling(window=7)`)

```python
z = (value - rolling_mean) / rolling_std
# |z| > 2.0 -> anomalia
```

### 5. Correlacion de Productos
**Metodo:** Pearson (`pandas.DataFrame.corr()`)

```python
pivot = df_sales.pivot_table(index='date', columns='sku', values='qty')
corr_matrix = pivot.corr()
```

### 6. Estacionalidad
**Metodo:** Indice Mensual (`pandas.resample('ME')`)

```python
monthly = df_sales.set_index('date').resample('ME')['revenue'].sum()
monthly_index = avg_by_month / avg_by_month.mean()
```

### 7. Rotacion de Inventario
**Metodo:** Turnover Ratio

```python
turnover = units_sold / avg_inventory
days_to_sell = 365 / turnover
```

### 8. Analisis de Precios
**Metodo:** Relacion Precio-Demanda

```python
margin_pct = (price - cost) / price * 100
avg_daily_demand = daily_sales.mean()
```

### 9. Rendimiento por Usuario
**Metodo:** `pandas.groupby('user')`

Ventas totales, unidades, dias activo, productos unicos, ticket promedio por empleado.

### 10. Horas Pico
**Metodo:** `pandas.to_datetime().dt.hour`

Distribucion de ventas por franja horaria (0-23h).

### 11. Dias de Semana
**Metodo:** `pandas.to_datetime().dt.dayofweek`

Patrones de venta por dia (Lunes-Domingo).

### 12. Compras vs Ventas
**Metodo:** `pandas.resample('D')` en ventas y compras

Comparativa diaria para detectar desbalances de inventario.

### 13. Productos con Mas Ajustes
**Metodo:** `pandas.groupby('sku')` sobre movimientos AJUSTE/CREACION

Identifica productos con correcciones frecuentes (posibles errores o mermas).

---

## Arquitectura de Cache

```
Frontend (polling 120s) → FastAPI → Redis (60s TTL) → Google Sheets
                                                └→ Fallback: in-memory dict
```

- Todos los endpoints cacheados: inventory, stats, alerts, movements, analytics
- Redis compartido entre workers Uvicorn
- Invalidacion automatica al recibir pedidos (`POST /api/receive-order`)
- Sin Redis: fallback a diccionario en memoria
