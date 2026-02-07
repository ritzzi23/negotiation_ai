import { api } from './client';
import type { ProductListResponse } from '../types';

export async function searchProducts(query: string, limit = 8): Promise<ProductListResponse> {
  return api.get<ProductListResponse>('/api/v1/products', {
    params: {
      query,
      limit: String(limit),
    },
  });
}
