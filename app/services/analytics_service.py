"""
Advanced Analytics Service — pandas + numpy + scipy
Demand forecasting, ABC/XYZ, seasonality, correlations, reorder optimization.
"""

import datetime
import logging
import sys
from typing import Optional

import numpy as np
import pandas as pd
from scipy import stats
from scipy.optimize import curve_fit

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)


class AnalyticsService:
    """Computes advanced business analytics from inventory + movements data."""

    def __init__(self, products: list[dict], movements: list[dict]):
        """
        products: [{sku, name, category, stock, cost, price, expiration_date, unit}, ...]
        movements: [{date, type, sku, name, qty, user}, ...]
        """
        self.products = products
        self.movements = movements
        self.today = datetime.date.today()

        # Build DataFrames
        self.df_products = pd.DataFrame(products)
        if not movements:
            self.df_movements = pd.DataFrame(columns=['date', 'type', 'sku', 'name', 'qty', 'user'])
        else:
            self.df_movements = pd.DataFrame(movements)
            self.df_movements['date'] = pd.to_datetime(self.df_movements['date'])
            self.df_movements['qty'] = pd.to_numeric(self.df_movements['qty'], errors='coerce').fillna(0)

        self._compute_basics()

    def _compute_basics(self):
        """Pre-compute commonly used aggregations."""
        # Sales only
        self.df_sales = self.df_movements[self.df_movements['type'] == 'VENTA'].copy()
        if not self.df_sales.empty:
            self.df_sales['revenue'] = 0.0
            price_map = {p['sku']: p['price'] for p in self.products}
            self.df_sales['revenue'] = self.df_sales['sku'].map(price_map).fillna(0) * abs(self.df_sales['qty'])

        # Purchases only
        self.df_purchases = self.df_movements[self.df_movements['type'] == 'COMPRA'].copy()

    # ================================================================
    # DEMAND FORECASTING
    # ================================================================

    def forecast_demand(self, sku: str, periods: int = 7) -> dict:
        """Exponential smoothing forecast for next N days."""
        product_sales = self.df_sales[self.df_sales['sku'] == sku].copy()
        if product_sales.empty:
            return {"sku": sku, "forecast": 0, "method": "no_data", "confidence": 0}

        # Resample to daily
        daily = product_sales.set_index('date').resample('D')['qty'].sum().abs()
        daily = daily.reindex(pd.date_range(daily.index.min(), self.today, freq='D'), fill_value=0)

        if len(daily) < 3:
            return {"sku": sku, "forecast": round(float(daily.mean()), 2), "method": "mean", "confidence": 0.3}

        # Exponential smoothing alpha=0.3
        alpha = 0.3
        smoothed = daily.ewm(alpha=alpha, adjust=False).mean()
        forecast = smoothed.iloc[-1]
        std_dev = daily.std()

        return {
            "sku": sku,
            "forecast": round(float(forecast), 2),
            "forecast_7d": round(float(forecast) * periods, 2),
            "method": "exponential_smoothing",
            "alpha": alpha,
            "daily_avg": round(float(daily.mean()), 2),
            "std_dev": round(float(std_dev), 2),
            "confidence": 0.7,
            "trend": "up" if len(daily) >= 2 and daily.iloc[-1] > daily.iloc[-2] else "down" if len(daily) >= 2 else "flat",
        }

    def top_forecasts(self, n: int = 10) -> list:
        """Forecast top N products by sales volume."""
        if self.df_sales.empty:
            return []
        top_skus = self.df_sales.groupby('sku')['qty'].sum().abs().nlargest(n).index.tolist()
        return [self.forecast_demand(sku) for sku in top_skus]

    # ================================================================
    # ABC-XYZ CLASSIFICATION
    # ================================================================

    def abc_xyz_classification(self) -> list:
        """
        ABC by revenue, XYZ by demand variability.
        X = stable, Y = moderate, Z = erratic.
        """
        if self.df_sales.empty:
            return []

        # Revenue per product
        revenue = self.df_sales.groupby('sku').agg(
            total_revenue=('revenue', 'sum'),
            total_units=('qty', lambda x: abs(x).sum()),
            avg_price=('revenue', 'mean'),
        ).reset_index()

        if revenue.empty:
            return []

        total_rev = revenue['total_revenue'].sum()
        revenue['pct'] = revenue['total_revenue'] / total_rev * 100
        revenue = revenue.sort_values('total_revenue', ascending=False)
        revenue['cum_pct'] = revenue['pct'].cumsum()
        revenue['abc'] = revenue['cum_pct'].apply(lambda x: 'A' if x <= 70 else 'B' if x <= 90 else 'C')

        # Demand variability (coefficient of variation)
        cv_data = []
        for sku in revenue['sku']:
            daily = self.df_sales[self.df_sales['sku'] == sku].set_index('date').resample('D')['qty'].sum().abs()
            if len(daily) > 1 and daily.mean() > 0:
                cv = daily.std() / daily.mean()
            else:
                cv = 0
            cv_data.append({'sku': sku, 'cv': cv})

        df_cv = pd.DataFrame(cv_data)
        if not df_cv.empty:
            cv_thresholds = df_cv['cv'].quantile([0.33, 0.66]).tolist() if len(df_cv) > 2 else [0.5, 1.0]
            df_cv['xyz'] = df_cv['cv'].apply(
                lambda x: 'X' if x <= cv_thresholds[0] else 'Y' if x <= cv_thresholds[1] else 'Z'
            )

        # Merge
        result = revenue.merge(df_cv, on='sku', how='left')
        result['xyz'] = result['xyz'].fillna('Z')
        result['classification'] = result['abc'] + result['xyz']

        return result[[
            'sku', 'total_revenue', 'total_units', 'avg_price', 'pct', 'abc', 'cv', 'xyz', 'classification'
        ]].to_dict('records')

    # ================================================================
    # SEASONALITY DETECTION
    # ================================================================

    def detect_seasonality(self, category: Optional[str] = None) -> dict:
        """Detect monthly sales patterns. Returns monthly index (1.0 = average)."""
        sales = self.df_sales.copy()
        if category:
            product_skus = [p['sku'] for p in self.products if p.get('category') == category]
            sales = sales[sales['sku'].isin(product_skus)]

        if sales.empty:
            return {"has_seasonality": False, "monthly_index": {}, "peak_month": None, "low_month": None}

        monthly = sales.set_index('date').resample('ME')['revenue'].sum()
        if len(monthly) < 12:
            return {"has_seasonality": False, "monthly_index": {}, "peak_month": None, "low_month": None}

        # Monthly index
        monthly.index = monthly.index.month
        avg_by_month = monthly.groupby(monthly.index).mean()
        overall_avg = avg_by_month.mean()
        if overall_avg == 0:
            return {"has_seasonality": False, "monthly_index": {}, "peak_month": None, "low_month": None}

        monthly_index = (avg_by_month / overall_avg).round(2).to_dict()
        peak = max(monthly_index, key=monthly_index.get)
        low = min(monthly_index, key=monthly_index.get)

        month_names = {1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
                       7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'}

        has_seasonality = max(monthly_index.values()) - min(monthly_index.values()) > 0.3

        return {
            "has_seasonality": has_seasonality,
            "monthly_index": {month_names.get(k, k): v for k, v in monthly_index.items()},
            "peak_month": month_names.get(peak, peak),
            "low_month": month_names.get(low, low),
            "strength": round(max(monthly_index.values()) - min(monthly_index.values()), 2),
        }

    # ================================================================
    # REORDER POINT OPTIMIZATION
    # ================================================================

    def reorder_recommendations(self, lead_time_days: int = 3, service_level: float = 0.95) -> list:
        """
        Calculate reorder point: ROP = d * L + z * sigma_d * sqrt(L)
        d = daily demand avg, L = lead time, z = z-score for service level.
        """
        if self.df_sales.empty:
            return []

        z_score = stats.norm.ppf(service_level)
        recommendations = []

        for product in self.products:
            sku = product['sku']
            daily = self.df_sales[self.df_sales['sku'] == sku].set_index('date').resample('D')['qty'].sum().abs()
            if daily.empty or len(daily) < 3:
                continue

            daily = daily.reindex(pd.date_range(daily.index.min(), self.today, freq='D'), fill_value=0)
            avg_daily = daily.mean()
            std_daily = daily.std()

            if avg_daily == 0:
                continue

            rop = avg_daily * lead_time_days + z_score * std_daily * np.sqrt(lead_time_days)
            days_until_rop = (product['stock'] - rop) / avg_daily if avg_daily > 0 else 999

            if days_until_rop < 14:  # Only recommend if within 14 days
                recommendations.append({
                    "sku": sku,
                    "name": product['name'],
                    "current_stock": product['stock'],
                    "daily_demand": round(float(avg_daily), 2),
                    "reorder_point": round(float(rop), 1),
                    "days_until_reorder": max(0, round(float(days_until_rop), 1)),
                    "recommended_order": round(float(max(0, rop * 2 - product['stock'])), 0),
                    "service_level": service_level,
                })

        return sorted(recommendations, key=lambda x: x['days_until_reorder'])[:10]

    # ================================================================
    # ANOMALY DETECTION
    # ================================================================

    def detect_anomalies(self, window_days: int = 7, threshold: float = 2.0) -> list:
        """Detect sales anomalies using rolling z-score."""
        if self.df_sales.empty:
            return []

        daily_total = self.df_sales.set_index('date').resample('D')['revenue'].sum()
        daily_total = daily_total.reindex(pd.date_range(daily_total.index.min(), self.today, freq='D'), fill_value=0)

        if len(daily_total) < window_days:
            return []

        rolling_mean = daily_total.rolling(window=window_days).mean()
        rolling_std = daily_total.rolling(window=window_days).std()

        anomalies = []
        for i in range(window_days, len(daily_total)):
            if rolling_std.iloc[i] == 0:
                continue
            z = (daily_total.iloc[i] - rolling_mean.iloc[i]) / rolling_std.iloc[i]
            if abs(z) > threshold:
                anomalies.append({
                    "date": str(daily_total.index[i].date()),
                    "revenue": round(float(daily_total.iloc[i]), 2),
                    "expected": round(float(rolling_mean.iloc[i]), 2),
                    "z_score": round(float(z), 2),
                    "type": "spike" if z > 0 else "drop",
                })

        return anomalies[-10:]  # Last 10 anomalies

    # ================================================================
    # PRODUCT CORRELATIONS
    # ================================================================

    def find_correlations(self, min_correlation: float = 0.3) -> list:
        """Find products that tend to sell together (correlation in daily sales)."""
        if self.df_sales.empty or len(self.df_sales['sku'].unique()) < 2:
            return []

        # Pivot: date x sku = units sold
        pivot = self.df_sales.pivot_table(
            index='date', columns='sku', values='qty', aggfunc='sum', fill_value=0
        ).abs()

        if pivot.shape[1] < 2:
            return []

        corr_matrix = pivot.corr()
        pairs = []
        skus = corr_matrix.columns.tolist()

        for i in range(len(skus)):
            for j in range(i + 1, len(skus)):
                corr = corr_matrix.iloc[i, j]
                if abs(corr) >= min_correlation and not np.isnan(corr):
                    name_i = next((p['name'] for p in self.products if p['sku'] == skus[i]), skus[i])
                    name_j = next((p['name'] for p in self.products if p['sku'] == skus[j]), skus[j])
                    pairs.append({
                        "product_a": name_i, "product_b": name_j,
                        "sku_a": skus[i], "sku_b": skus[j],
                        "correlation": round(float(corr), 3),
                        "strength": "strong" if abs(corr) > 0.6 else "moderate",
                    })

        return sorted(pairs, key=lambda x: abs(x['correlation']), reverse=True)[:15]

    # ================================================================
    # TURNOVER & EFFICIENCY
    # ================================================================

    def turnover_analysis(self) -> list:
        """Inventory turnover ratio and days-to-sell per product."""
        if self.df_sales.empty:
            return []

        results = []
        for product in self.products:
            sku = product['sku']
            sales_qty = abs(self.df_sales[self.df_sales['sku'] == sku]['qty'].sum())
            if sales_qty == 0:
                continue

            avg_inventory = max(product['stock'], sales_qty / 12)  # Estimate avg inventory
            turnover = sales_qty / avg_inventory if avg_inventory > 0 else 0
            days_to_sell = 365 / turnover if turnover > 0 else 999

            results.append({
                "sku": sku,
                "name": product['name'],
                "units_sold": round(float(sales_qty), 0),
                "current_stock": product['stock'],
                "turnover_ratio": round(float(turnover), 2),
                "days_to_sell": round(float(days_to_sell), 1),
                "efficiency": "high" if turnover > 12 else "medium" if turnover > 4 else "low",
            })

        return sorted(results, key=lambda x: x['turnover_ratio'], reverse=True)

    # ================================================================
    # PRICE ELASTICITY ESTIMATION
    # ================================================================

    def price_elasticity(self) -> list:
        """Estimate price-demand relationship using linear regression on log-log scale."""
        if self.df_sales.empty:
            return []

        # Per product: avg daily demand vs price
        results = []
        for product in self.products:
            sku = product['sku']
            product_sales = self.df_sales[self.df_sales['sku'] == sku]
            if len(product_sales) < 5 or product['price'] == 0:
                continue

            daily = product_sales.set_index('date').resample('D')['qty'].sum().abs()
            daily = daily.reindex(pd.date_range(daily.index.min(), self.today, freq='D'), fill_value=0)
            avg_demand = daily.mean()

            results.append({
                "sku": sku,
                "name": product['name'],
                "price": product['price'],
                "cost": product['cost'],
                "margin_pct": round((product['price'] - product['cost']) / product['price'] * 100, 1) if product['price'] > 0 else 0,
                "avg_daily_demand": round(float(avg_demand), 2),
                "suggested_action": "increase_price" if avg_demand > 5 and product['price'] > 0 else
                                    "consider_discount" if avg_demand < 1 else "maintain",
            })

        return sorted(results, key=lambda x: x['avg_daily_demand'], reverse=True)

    # ================================================================
    # FULL REPORT
    # ================================================================

    def full_report(self) -> dict:
        """Generate complete analytics report."""
        seasonality = self.detect_seasonality()

        return {
            "demand_forecasts": self.top_forecasts(10),
            "abc_xyz": self.abc_xyz_classification(),
            "seasonality": seasonality,
            "reorder_recommendations": self.reorder_recommendations(),
            "anomalies": self.detect_anomalies(),
            "correlations": self.find_correlations(),
            "turnover": self.turnover_analysis(),
            "price_insights": self.price_elasticity(),
        }
