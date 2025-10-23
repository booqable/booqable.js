/**
 * Common resource type definitions
 * These can be extended as needed for type safety
 */

export interface BaseResource {
  id: string;
  type: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Order extends BaseResource {
  type: 'orders';
  number?: number;
  status?: string;
  starts_at?: Date;
  stops_at?: Date;
  total_in_cents?: number;
  grand_total_in_cents?: number;
  discount_in_cents?: number;
  tax_in_cents?: number;
  customer?: Customer;
  items?: Item[];
  lines?: Line[];
}

export interface Customer extends BaseResource {
  type: 'customers';
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  tax_region_id?: string;
  properties?: Record<string, any>;
}

export interface Product extends BaseResource {
  type: 'products';
  name?: string;
  slug?: string;
  sku?: string;
  description?: string;
  excerpt?: string;
  show_in_store?: boolean;
  sorting_weight?: number;
  base_price_in_cents?: number;
  price_type?: string;
  price_period?: string;
  product_group_id?: string;
  photo_id?: string;
  tax_category_id?: string;
  collection_id?: string;
  bundle?: boolean;
  trackable?: boolean;
  product_group?: ProductGroup;
  photo?: Photo;
}

export interface ProductGroup extends BaseResource {
  type: 'product_groups';
  name?: string;
  slug?: string;
  sku?: string;
  excerpt?: string;
  show_in_store?: boolean;
  sorting_weight?: number;
  collection_id?: string;
  photo_id?: string;
  tax_category_id?: string;
  products?: Product[];
}

export interface Item extends BaseResource {
  type: 'items';
  identifier?: string;
  from?: Date;
  till?: Date;
  quantity?: number;
  product_id?: string;
  order_id?: string;
  stock_item_id?: string;
  planning_id?: string;
  product?: Product;
  stock_item?: StockItem;
}

export interface StockItem extends BaseResource {
  type: 'stock_items';
  identifier?: string;
  status?: string;
  from?: Date;
  till?: Date;
  product_id?: string;
  location_id?: string;
  properties?: Record<string, any>;
  product?: Product;
}

export interface Line extends BaseResource {
  type: 'lines';
  title?: string;
  quantity?: number;
  planning_quantity?: number;
  price_in_cents?: number;
  total_in_cents?: number;
  taxable?: boolean;
  line_type?: string;
  order_id?: string;
  planning_id?: string;
  product_id?: string;
  tax_category_id?: string;
  product?: Product;
}

export interface Planning extends BaseResource {
  type: 'plannings';
  starts_at?: Date;
  stops_at?: Date;
  quantity?: number;
  reserved?: boolean;
  started?: boolean;
  stopped?: boolean;
  location_type?: string;
  product_id?: string;
  order_id?: string;
  stock_item_ids?: string[];
  product?: Product;
  order?: Order;
  stock_items?: StockItem[];
}

export interface Location extends BaseResource {
  type: 'locations';
  name?: string;
  code?: string;
  location_type?: string;
  address_line_1?: string;
  address_line_2?: string;
  zipcode?: string;
  city?: string;
  region?: string;
  country?: string;
  main?: boolean;
  pickup_enabled?: boolean;
  fulfillment_enabled?: boolean;
  cluster_id?: string;
}

export interface Employee extends BaseResource {
  type: 'employees';
  name?: string;
  email?: string;
  active?: boolean;
  owner?: boolean;
  large_avatar_url?: string;
  avatar_url?: string;
  user_id?: string;
}

export interface Company extends BaseResource {
  type: 'companies';
  name?: string;
  slug?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_line_1?: string;
  address_line_2?: string;
  zipcode?: string;
  city?: string;
  region?: string;
  country?: string;
  market?: string;
  use_billing_address?: boolean;
  billing_address_line_1?: string;
  billing_address_line_2?: string;
  billing_zipcode?: string;
  billing_city?: string;
  billing_region?: string;
  billing_country?: string;
}

export interface Payment extends BaseResource {
  type: 'payments';
  status?: string;
  amount_in_cents?: number;
  deposit_in_cents?: number;
  payment_method_id?: string;
  order_id?: string;
  order?: Order;
}

export interface Document extends BaseResource {
  type: 'documents';
  number?: number;
  document_type?: string;
  status?: string;
  date?: Date;
  due_date?: Date;
  total_in_cents?: number;
  grand_total_in_cents?: number;
  tax_in_cents?: number;
  discount_in_cents?: number;
  deposit_in_cents?: number;
  order_id?: string;
  customer_id?: string;
  order?: Order;
  customer?: Customer;
}

export interface Photo extends BaseResource {
  type: 'photos';
  original_url?: string;
  large_url?: string;
  xlarge_url?: string;
  coordinates?: {
    x?: number;
    y?: number;
  };
  preview?: string;
  position?: number;
  photo_id?: string;
  owner_id?: string;
  owner_type?: string;
}

export interface TaxRate extends BaseResource {
  type: 'tax_rates';
  name?: string;
  value?: number;
  position?: number;
  owner_id?: string;
  owner_type?: string;
}

export interface Property extends BaseResource {
  type: 'properties';
  name?: string;
  identifier?: string;
  position?: number;
  property_type?: string;
  show_on?: string[];
  validation_required?: boolean;
  owner_type?: string;
  default_property_id?: string;
  select_options?: string[];
}

export interface EmailTemplate extends BaseResource {
  type: 'email_templates';
  name?: string;
  identifier?: string;
  subject?: string;
  context?: string;
  body?: string;
  default?: boolean;
}

export interface Setting extends BaseResource {
  type: 'settings';
  currency?: string;
  timezone?: string;
  tax_system?: string;
  tax_strategy?: string;
  financial_year_start?: string;
  period_type?: string;
  date_format?: string;
  time_format?: string;
}
