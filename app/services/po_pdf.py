"""
Purchase Order Builder — uses current inventory data to suggest reorders
and generate PDF purchase orders with reportlab.
"""

import datetime
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def generate_po_pdf(
    supplier: str,
    items: list[dict],
    order_number: str = "",
    notes: str = "",
) -> bytes:
    """
    Generate a professional PDF purchase order.
    items: [{name, sku, quantity, unit, unit_price}]
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.lib.colors import HexColor
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        )
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm)
        styles = getSampleStyleSheet()
        elements = []

        # Colors
        INDIGO = HexColor("#4f46e5")
        GRAY = HexColor("#6b7280")
        LIGHT_GRAY = HexColor("#f3f4f6")

        # Header
        title_style = ParagraphStyle('Title2', parent=styles['Title'], fontSize=18, textColor=INDIGO, spaceAfter=2)
        elements.append(Paragraph("Orden de Compra", title_style))
        elements.append(Paragraph(f"<b>#{order_number or 'S/N'}</b>", ParagraphStyle('sub', parent=styles['Normal'], fontSize=10, textColor=GRAY)))
        elements.append(Spacer(1, 8*mm))

        # Supplier + date
        info_data = [
            [Paragraph("<b>Proveedor:</b>", styles['Normal']), Paragraph(supplier, styles['Normal'])],
            [Paragraph("<b>Fecha:</b>", styles['Normal']), Paragraph(datetime.date.today().strftime("%d/%m/%Y"), styles['Normal'])],
        ]
        info_table = Table(info_data, colWidths=[30*mm, 100*mm])
        info_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
        elements.append(info_table)
        elements.append(Spacer(1, 6*mm))

        # Table header
        table_data = [[
            Paragraph("<b>SKU</b>", styles['Normal']),
            Paragraph("<b>Producto</b>", styles['Normal']),
            Paragraph("<b>Cant.</b>", styles['Normal']),
            Paragraph("<b>Unidad</b>", styles['Normal']),
            Paragraph("<b>Precio Unit.</b>", styles['Normal']),
            Paragraph("<b>Total</b>", styles['Normal']),
        ]]

        total = 0
        for item in items:
            qty = item.get("quantity", 1)
            price = item.get("unit_price", 0)
            line_total = qty * price
            total += line_total
            table_data.append([
                Paragraph(str(item.get("sku", "")), styles['Normal']),
                Paragraph(str(item.get("name", "")), styles['Normal']),
                Paragraph(str(qty), ParagraphStyle('r', parent=styles['Normal'], alignment=TA_CENTER)),
                Paragraph(str(item.get("unit", "UND")), ParagraphStyle('r', parent=styles['Normal'], alignment=TA_CENTER)),
                Paragraph(f"${price:,.0f}", ParagraphStyle('r', parent=styles['Normal'], alignment=TA_RIGHT)),
                Paragraph(f"${line_total:,.0f}", ParagraphStyle('r', parent=styles['Normal'], alignment=TA_RIGHT)),
            ])

        # Total row
        table_data.append([
            Paragraph("", styles['Normal']), Paragraph("", styles['Normal']), Paragraph("", styles['Normal']),
            Paragraph("", styles['Normal']),
            Paragraph("<b>TOTAL</b>", ParagraphStyle('r', parent=styles['Normal'], alignment=TA_RIGHT, textColor=INDIGO)),
            Paragraph(f"<b>${total:,.0f}</b>", ParagraphStyle('r', parent=styles['Normal'], alignment=TA_RIGHT, textColor=INDIGO)),
        ])

        col_widths = [22*mm, 55*mm, 15*mm, 15*mm, 25*mm, 25*mm]
        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('TEXTCOLOR', (0, 0), (-1, 0), INDIGO),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -2), 0.5, GRAY),
            ('LINEBELOW', (0, -1), (-1, -1), 1.5, INDIGO),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(table)

        # Notes
        if notes:
            elements.append(Spacer(1, 8*mm))
            elements.append(Paragraph(f"<b>Notas:</b> {notes}", ParagraphStyle('notes', parent=styles['Normal'], fontSize=9, textColor=GRAY)))

        doc.build(elements)
        return buffer.getvalue()

    except ImportError:
        logger.error("reportlab not installed")
        raise
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise
