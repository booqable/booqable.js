/**
 * All Booqable API resources, kept in sync with booqable.rb's resources.json.
 *
 * A string entry defines a resource of that name; an object entry maps a
 * resource name to an alias (e.g. app_carriers is also available as carriers).
 */
export type ResourceDefinition = string | Record<string, string>

export const RESOURCES: ResourceDefinition[] = [
  {"app_carriers":"carriers"},
  {"app_subscriptions":"subscriptions"},
  {"app_payment_options":"payment_options"},
  {"app_issues":"issues"},
  "authentication_methods",
  "barcodes",
  "bundles",
  "bundle_items",
  "clusters",
  "collections",
  "collection_items",
  "collection_trees",
  "companies",
  "countries",
  "coupons",
  "customers",
  "default_properties",
  "delivery_distance_calculations",
  "deposit_holds",
  "documents",
  "emails",
  "email_templates",
  "employees",
  "employee_invitations",
  "inventory_breakdowns",
  "inventory_levels",
  "invoice_finalizations",
  "invoice_revisions",
  "item_prices",
  "items",
  "lines",
  "line_charge_suggestions",
  "locations",
  "notes",
  "orders",
  "order_delivery_rate_recalculations",
  "order_delivery_rates",
  "order_fulfillments",
  "order_price_recalculations",
  "order_status_transitions",
  "payments",
  "payment_authorizations",
  "payment_charges",
  "payment_methods",
  "payment_refunds",
  "photos",
  "plannings",
  "price_rules",
  "price_rulesets",
  "price_structures",
  "price_tiles",
  "products",
  "product_groups",
  "properties",
  "provinces",
  "settings",
  "signatures",
  "sortings",
  "stock_adjustments",
  "stock_items",
  "stock_item_archivations",
  "stock_item_plannings",
  "stock_item_suggestions",
  "tags",
  "tax_categories",
  "tax_rates",
  "tax_regions",
  "tax_values",
  "transfers",
  "user_invitations",
  "users",
  "webhook_endpoints",
  "webhooks",
]

/** Resource name (and alias) pairs: [methodName, resourceName]. */
export function resourceMethods(): Array<[string, string]> {
  const methods: Array<[string, string]> = []
  for (const resource of RESOURCES) {
    if (typeof resource === 'string') {
      methods.push([resource, resource])
    } else {
      const [name, alias] = Object.entries(resource)[0]
      methods.push([name, name])
      methods.push([alias, name])
    }
  }
  return methods
}
