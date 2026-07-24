import { create } from 'zustand';
import { Supplier } from '@/types';
import {
  getSuppliers, createSupplier as apiCreateSupplier,
  updateSupplier as apiUpdateSupplier, deleteSupplier as apiDeleteSupplier,
} from '@/lib/api';
import toast from 'react-hot-toast';

interface SupplierState {
  suppliers: Supplier[];
  loading: boolean;

  fetchSuppliers: (token: string, jwt?: string) => Promise<void>;
  createSupplier: (token: string, data: Partial<Supplier>, jwt?: string) => Promise<void>;
  updateSupplier: (token: string, id: number, data: Partial<Supplier>, jwt?: string) => Promise<void>;
  deleteSupplier: (token: string, id: number, name: string, jwt?: string) => Promise<void>;
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
  suppliers: [],
  loading: true,

  fetchSuppliers: async (token, jwt) => {
    set({ loading: true });
    try {
      const data = await getSuppliers(token, jwt);
      set({ suppliers: data.suppliers, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createSupplier: async (token, data, jwt) => {
    // Optimistic
    const temp: Supplier = {
      id: Date.now(),
      name: data.name || '',
      contact: data.contact || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      notes: data.notes || '',
      created_at: new Date().toISOString(),
    };
    set(state => ({ suppliers: [temp, ...state.suppliers] }));

    try {
      await apiCreateSupplier(token, data, jwt);
      await get().fetchSuppliers(token, jwt);
      toast.success('Proveedor creado');
    } catch {
      set(state => ({ suppliers: state.suppliers.filter(s => s.id !== temp.id) }));
      toast.error('Error al crear');
    }
  },

  updateSupplier: async (token, id, data, jwt) => {
    set(state => ({
      suppliers: state.suppliers.map(s =>
        s.id === id ? { ...s, ...data } : s
      ),
    }));

    try {
      await apiUpdateSupplier(token, id, data, jwt);
      toast.success('Proveedor actualizado');
    } catch {
      await get().fetchSuppliers(token, jwt);
      toast.error('Error al actualizar');
    }
  },

  deleteSupplier: async (token, id, name, jwt) => {
    set(state => ({ suppliers: state.suppliers.filter(s => s.id !== id) }));

    try {
      await apiDeleteSupplier(token, id, jwt);
      toast.success(`${name} eliminado`);
    } catch {
      await get().fetchSuppliers(token, jwt);
      toast.error('Error al eliminar');
    }
  },
}));
