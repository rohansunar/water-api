export interface Product {
  id: string;
  vendorId: string;
  name: string;
  description?: string;
  category: ProductCategory;
  size: ProductSize;
  price: number;
  depositAmount: number;
  hasDeposit: boolean;
  stockQuantity: number;
  isActive: boolean;
  images: string[];
  specifications: ProductSpecification;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductSpecification {
  capacity: number; // in liters
  material: string;
  brand?: string;
  weight?: number; // in kg
  dimensions?: {
    height: number;
    diameter: number;
  };
}

export enum ProductCategory {
  WATER_JAR = 'water_jar',
  DISPENSER = 'dispenser',
  ACCESSORIES = 'accessories',
}

export enum ProductSize {
  SMALL = '10L',
  MEDIUM = '20L',
  LARGE = '25L',
  EXTRA_LARGE = '30L',
}
