import { api } from './client';
import type { Product, ProductListResponse } from '../types';

export async function searchProducts(query: string, limit = 8): Promise<ProductListResponse> {
  return api.get<ProductListResponse>('/api/v1/products', {
    params: {
      query,
      limit: String(limit),
    },
  });
}

export async function listProducts(query = '', limit = 50): Promise<ProductListResponse> {
  return api.get<ProductListResponse>('/api/v1/products', {
    params: {
      query,
      limit: String(limit),
      offset: '0',
    },
  });
}

export async function createProduct(product: {
  name: string;
  id?: string;
  sku?: string;
  variant?: string;
  size_value?: number;
  size_unit?: string;
  category?: string;
  description?: string;
  image_url?: string;
}): Promise<Product> {
  return api.post<Product>('/api/v1/products', product);
}

export async function updateProduct(
  productId: string,
  updates: Partial<{
    name: string;
    sku: string;
    variant: string;
    size_value: number;
    size_unit: string;
    category: string;
    description: string;
    image_url: string;
  }>
): Promise<Product> {
  return api.patch<Product>(`/api/v1/products/${productId}`, updates);
}

export async function deleteProduct(productId: string): Promise<{ deleted: boolean; product_id: string }> {
  return api.delete(`/api/v1/products/${productId}`);
}
