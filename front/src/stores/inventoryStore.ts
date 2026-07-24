import { create } from 'zustand';
import { Product, CustomColumn } from '@/types';
import {
  getInventory, updateProduct as apiUpdateProduct,
  deleteProduct as apiDeleteProduct, createProduct as apiCreateProduct,
} from '@/lib/api';
import toast from 'react-hot-toast';

interface InventoryState {
  products: Product[];
  customColumns: CustomColumn[];
  loading: boolean;
  error: string;
  highlightSku: string;

  fetchProducts: (token: string, jwt?: string) => Promise<void>;
  createProduct: (token: string, data: Partial<Product>, jwt?: string) => Promise<void>;
  updateProduct: (token: string, sku: string, data: Partial<Product>, jwt?: string) => Promise<void>;
  deleteProduct: (token: string, sku: string, name: string, jwt?: string) => Promise<void>;
  setHighlight: (sku: string) => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  customColumns: [],
  loading: true,
  error: '',
  highlightSku: '',

  fetchProducts: async (token, jwt) => {
    set({ loading: true, error: '' });
    try {
      const data = await getInventory(token, jwt);
      set({ products: data.products, customColumns: data.custom_columns || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createProduct: async (token, data, jwt) => {
    const tempSku = (data.sku as string) || 'NUEVO-' + Date.now().toString(36);
    const optimistic: Product = {
      uuid: 'temp-' + Date.now(),
      sku: tempSku,
      name: (data.name as string) || '',
      category: (data.category as string) || 'General',
      stock: (data.stock as number) || 0,
      unit: (data.unit as string) || 'UND',
      cost: (data.cost as number) || 0,
      price: (data.price as number) || 0,
      expiration_date: (data.expiration_date as string) || '',
      location: (data.location as string) || '',
      invima: (data.invima as string) || '',
      lote: (data.lote as string) || '',
    };

    // Optimistic insert
    set(state => ({ products: [optimistic, ...state.products], highlightSku: tempSku }));
    setTimeout(() => set({ highlightSku: '' }), 2000);

    try {
      const result = await apiCreateProduct(token, data, jwt);
      // Replace optimistic with server product (has real UUID + SKU)
      set(state => ({
        products: state.products.map(p =>
          p.sku === tempSku ? result.product : p
        ),
      }));
      toast.success('Producto creado');
    } catch {
      // Rollback
      set(state => ({ products: state.products.filter(p => p.sku !== tempSku) }));
      toast.error('Error al crear');
    }
  },

  updateProduct: async (token, sku, data, jwt) => {
    // Optimistic update
    set(state => ({
      products: state.products.map(p =>
        p.sku === sku ? { ...p, ...data } : p
      ),
    }));

    try {
      await apiUpdateProduct(token, { sku, ...data }, jwt);
      toast.success('Producto actualizado');
    } catch {
      // Rollback
      await get().fetchProducts(token, jwt);
      toast.error('Error al guardar');
    }
  },

  deleteProduct: async (token, sku, name, jwt) => {
    // Optimistic delete
    set(state => ({ products: state.products.filter(p => p.sku !== sku) }));

    try {
      await apiDeleteProduct(token, sku, jwt);
      toast.success(`${name} eliminado`);
    } catch {
      // Rollback
      await get().fetchProducts(token, jwt);
      toast.error('Error al eliminar');
    }
  },

  setHighlight: (sku) => {
    set({ highlightSku: sku });
    setTimeout(() => set({ highlightSku: '' }), 2000);
  },
}));
