// Common Units of Measurement for Inventory Management

export const UOM_CATEGORIES = {
  WEIGHT: 'Weight',
  VOLUME: 'Volume',
  QUANTITY: 'Quantity',
} as const;

export interface UOMOption {
  value: string;
  label: string;
  category: string;
  symbol: string;
}

export const COMMON_UOMS: UOMOption[] = [
  // Weight / Mass
  { value: 'kg', label: 'Kilogram', category: UOM_CATEGORIES.WEIGHT, symbol: 'kg' },
  { value: 'g', label: 'Gram', category: UOM_CATEGORIES.WEIGHT, symbol: 'g' },
  { value: 'mg', label: 'Milligram', category: UOM_CATEGORIES.WEIGHT, symbol: 'mg' },
  { value: 'ton', label: 'Ton', category: UOM_CATEGORIES.WEIGHT, symbol: 'ton' },
  { value: 'lb', label: 'Pound', category: UOM_CATEGORIES.WEIGHT, symbol: 'lb' },
  { value: 'oz', label: 'Ounce', category: UOM_CATEGORIES.WEIGHT, symbol: 'oz' },
  { value: 'quintal', label: 'Quintal', category: UOM_CATEGORIES.WEIGHT, symbol: 'qtl' },

  // Volume / Capacity
  { value: 'l', label: 'Liter', category: UOM_CATEGORIES.VOLUME, symbol: 'L' },
  { value: 'ml', label: 'Milliliter', category: UOM_CATEGORIES.VOLUME, symbol: 'mL' },
  { value: 'gal', label: 'Gallon', category: UOM_CATEGORIES.VOLUME, symbol: 'gal' },
  { value: 'qt', label: 'Quart', category: UOM_CATEGORIES.VOLUME, symbol: 'qt' },
  { value: 'pt', label: 'Pint', category: UOM_CATEGORIES.VOLUME, symbol: 'pt' },
  { value: 'cup', label: 'Cup', category: UOM_CATEGORIES.VOLUME, symbol: 'cup' },
  { value: 'fl-oz', label: 'Fluid Ounce', category: UOM_CATEGORIES.VOLUME, symbol: 'fl oz' },

  // Quantity / Count
  { value: 'pcs', label: 'Pieces', category: UOM_CATEGORIES.QUANTITY, symbol: 'pcs' },
  { value: 'unit', label: 'Unit', category: UOM_CATEGORIES.QUANTITY, symbol: 'unit' },
  { value: 'dozen', label: 'Dozen', category: UOM_CATEGORIES.QUANTITY, symbol: 'doz' },
  { value: 'pair', label: 'Pair', category: UOM_CATEGORIES.QUANTITY, symbol: 'pair' },
  { value: 'set', label: 'Set', category: UOM_CATEGORIES.QUANTITY, symbol: 'set' },
  { value: 'pack', label: 'Pack', category: UOM_CATEGORIES.QUANTITY, symbol: 'pack' },
  { value: 'box', label: 'Box', category: UOM_CATEGORIES.QUANTITY, symbol: 'box' },
  { value: 'carton', label: 'Carton', category: UOM_CATEGORIES.QUANTITY, symbol: 'ctn' },
  { value: 'bag', label: 'Bag', category: UOM_CATEGORIES.QUANTITY, symbol: 'bag' },
  { value: 'bottle', label: 'Bottle', category: UOM_CATEGORIES.QUANTITY, symbol: 'btl' },
  { value: 'can', label: 'Can', category: UOM_CATEGORIES.QUANTITY, symbol: 'can' },
  { value: 'jar', label: 'Jar', category: UOM_CATEGORIES.QUANTITY, symbol: 'jar' },
  { value: 'bundle', label: 'Bundle', category: UOM_CATEGORIES.QUANTITY, symbol: 'bdl' },
  { value: 'roll', label: 'Roll', category: UOM_CATEGORIES.QUANTITY, symbol: 'roll' },
];

// Get UOMs by category
export const getUOMsByCategory = (category: string): UOMOption[] => {
  return COMMON_UOMS.filter(uom => uom.category === category);
};

// Get UOM label by value
export const getUOMLabel = (value: string): string => {
  const uom = COMMON_UOMS.find(u => u.value === value);
  return uom ? uom.label : value;
};

// Get UOM symbol by value
export const getUOMSymbol = (value: string): string => {
  const uom = COMMON_UOMS.find(u => u.value === value);
  return uom ? uom.symbol : value;
};

// Most commonly used UOMs for quick access
export const POPULAR_UOMS = [
  'kg',
  'g',
  'l',
  'ml',
  'pcs',
  'unit',
  'dozen',
  'box',
  'pack',
  'bag',
  'bottle',
];

// Get popular UOMs
export const getPopularUOMs = (): UOMOption[] => {
  return COMMON_UOMS.filter(uom => POPULAR_UOMS.includes(uom.value));
};

// Search UOMs
export const searchUOMs = (query: string): UOMOption[] => {
  const lowerQuery = query.toLowerCase();
  return COMMON_UOMS.filter(
    uom =>
      uom.label.toLowerCase().includes(lowerQuery) ||
      uom.value.toLowerCase().includes(lowerQuery) ||
      uom.symbol.toLowerCase().includes(lowerQuery)
  );
};

// Basic conversion factors (for common conversions)
export const CONVERSION_FACTORS: Record<string, Record<string, number>> = {
  // Weight conversions (to grams)
  weight: {
    kg: 1000,
    g: 1,
    mg: 0.001,
    ton: 1000000,
    lb: 453.592,
    oz: 28.3495,
    quintal: 100000,
  },
  // Volume conversions (to milliliters)
  volume: {
    l: 1000,
    ml: 1,
    gal: 3785.41,
    qt: 946.353,
    pt: 473.176,
    cup: 236.588,
    'fl-oz': 29.5735,
  },
  // Quantity conversions (to pieces)
  quantity: {
    pcs: 1,
    unit: 1,
    dozen: 12,
    pair: 2,
  },
};

// Simple conversion function
export const convertUOM = (
  value: number,
  fromUOM: string,
  toUOM: string
): number | null => {
  // Find which category the UOMs belong to
  for (const [category, factors] of Object.entries(CONVERSION_FACTORS)) {
    if (factors[fromUOM] && factors[toUOM]) {
      // Convert to base unit, then to target unit
      const baseValue = value * factors[fromUOM];
      return baseValue / factors[toUOM];
    }
  }
  // If conversion not possible, return null
  return null;
};

// Format UOM display
export const formatUOMDisplay = (value: number, uom: string): string => {
  const symbol = getUOMSymbol(uom);
  return `${value} ${symbol}`;
};
