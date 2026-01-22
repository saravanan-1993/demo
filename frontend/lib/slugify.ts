/**
 * Generate SEO-friendly URL slug from product details
 * Example: "Samsung Galaxy S21 5G 128GB Black" -> "samsung-galaxy-s21-5g-128gb-black"
 */
export function generateProductSlug(product: {
  brand?: string;
  shortDescription: string;
  category?: string;
}): string {
  // Combine brand and description for the slug
  const text = `${product.brand || ""} ${product.shortDescription}`.trim();
  
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 100); // Limit length to 100 characters
}

/**
 * Generate full product URL with slug, ID, and optional variant parameter
 * Example: /products/samsung-galaxy-s21-5g-128gb-black/6936cd96a2781014067e1272?variant=abc123
 */
export function generateProductUrl(product: {
  id: string;
  brand?: string;
  shortDescription: string;
  category?: string;
  variants?: Array<{ 
    inventoryProductId?: string | null; 
    variantName?: string; 
    displayName?: string;
    isDefault?: boolean;
  }>;
}): string {
  // Find the default variant, fallback to first variant
  const defaultVariant = product.variants?.find(v => v.isDefault) || product.variants?.[0];
  
  // Generate slug using displayName (preferred) or variantName as fallback
  const slug = generateProductSlug({
    brand: product.brand,
    shortDescription: defaultVariant?.displayName || defaultVariant?.variantName || "",
    category: product.category,
  });
  
  // Add variant parameter if inventory product ID exists
  const variantParam = defaultVariant?.inventoryProductId 
    ? `?variant=${defaultVariant.inventoryProductId}`
    : '';
  
  return `/products/${slug}/${product.id}${variantParam}`;
}

/**
 * Extract product ID from URL
 * Works with both old format (/products/ID) and new format (/products/slug/ID)
 */
export function extractProductId(url: string): string {
  const parts = url.split("/").filter(Boolean);
  // Return the last part (which is always the ID)
  return parts[parts.length - 1];
}

/**
 * Generate SEO-friendly URL slug from category name
 * Example: "Fruits & Vegetables" -> "fruits-vegetables"
 */
export function generateCategorySlug(categoryName: string): string {
  return categoryName
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 100); // Limit length to 100 characters
}

/**
 * Generate full category URL with slug and ID
 * Example: /category/fruits-vegetables/6936cd96a2781014067e1272
 */
export function generateCategoryUrl(category: {
  id: string;
  name: string;
}): string {
  const slug = generateCategorySlug(category.name);
  return `/category/${slug}/${category.id}`;
}

/**
 * Generate subcategory URL with category and subcategory in path (BigBasket style)
 * Example: /category/meat/fish/6936cd96a2781014067e1272
 */
export function generateSubcategoryUrl(
  category: { id: string; name: string },
  subcategory: { id: string; name: string }
): string {
  const categorySlug = generateCategorySlug(category.name);
  const subcategorySlug = generateCategorySlug(subcategory.name);
  return `/category/${categorySlug}/${subcategorySlug}/${subcategory.id}`;
}

/**
 * Extract category ID from URL
 * Works with both old format (/category/ID) and new format (/category/slug/ID)
 */
export function extractCategoryId(url: string): string {
  const parts = url.split("/").filter(Boolean);
  // Return the last part (which is always the ID)
  return parts[parts.length - 1];
}
