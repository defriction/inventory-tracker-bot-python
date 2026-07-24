"""
SQLAlchemy models — clients, remisiones, remision_items.
Coexists with raw-sqlite tables (products, movements, etc.).
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database_sa import Base


def _uid():
    return str(uuid.uuid4())[:8].upper()


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    contact = Column(String(200), default="")
    phone = Column(String(50), default="")
    email = Column(String(200), default="")
    address = Column(Text, default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    remisiones = relationship("Remision", back_populates="client")


class Remision(Base):
    __tablename__ = "remisiones"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uid = Column(String(12), unique=True, default=_uid)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    created_by = Column(String(200), default="")
    notes = Column(Text, default="")
    total_amount = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="remisiones")
    items = relationship("RemisionItem", back_populates="remision", cascade="all, delete-orphan")


class RemisionItem(Base):
    __tablename__ = "remision_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    remision_id = Column(Integer, ForeignKey("remisiones.id"), nullable=False)
    product_sku = Column(String(50), nullable=False)
    product_name = Column(String(200), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit = Column(String(20), default="UND")
    unit_price = Column(Float, default=0)
    subtotal = Column(Float, default=0)

    remision = relationship("Remision", back_populates="items")
