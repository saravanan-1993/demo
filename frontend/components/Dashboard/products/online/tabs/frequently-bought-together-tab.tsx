"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { MultipleSelect, MultipleSelectContent, MultipleSelectItem } from "@/components/ui/multiple-select";
import { ProductFormState, FrequentlyBoughtTogetherItem } from "@/types/product";
import { ShoppingBag, Plus, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import axiosInstance from "@/lib/axios";

interface FrequentlyBoughtTogetherTabProps {
  formData: ProductFormState;
  onChange: (field: keyof ProductFormState, value: FrequentlyBoughtTogetherItem[]) => void;
}

interface ProductOption {
  id: string;
  name: string;
  label: string;
  value: string;
  image?: string;
  variants: Array<{
    variantIndex: number;
    variantName: string;
    displayName: string;
    variantSellingPrice: number;
    variantMRP: number;
    variantStockQuantity: number;
  }>;
}

export function FrequentlyBoughtTogetherTab({
  formData,
  onChange,
}: FrequentlyBoughtTogetherTabProps) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]); // Keep all products for reference
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<React.Key>>(new Set());
  const [addons, setAddons] = useState<FrequentlyBoughtTogetherItem[]>(
    formData.frequentlyBoughtTogether || []
  );

  // Fetch all active products
  useEffect(() => {
    fetchProducts();
  }, []);

  // Re-fetch products when addons change to update the filter
  useEffect(() => {
    if (products.length > 0) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addons.length]);

  // Sync addons with formData - only when addons actually change
  useEffect(() => {
    const currentAddons = JSON.stringify(formData.frequentlyBoughtTogether || []);
    const newAddons = JSON.stringify(addons);
    
    if (currentAddons !== newAddons) {
      onChange("frequentlyBoughtTogether", addons);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addons]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/api/online/online-products", {
        params: {
          status: "active",
          limit: 100,
        },
      });

      if (response.data.success) {
        const allProductOptions: ProductOption[] = response.data.data
          .filter((product: {
            id: string;
            itemType?: string;
          }) => {
            // Filter out variant products - only show parent products
            const isParentProduct = !product.itemType || product.itemType !== "Variant";
            // Filter out current product being edited
            const isNotCurrentProduct = product.id !== formData.id;
            
            return isParentProduct && isNotCurrentProduct;
          })
          .map((product: {
            id: string;
            shortDescription: string;
            brand?: string;
            variants: Array<{
              variantName: string;
              displayName?: string;
              variantSellingPrice: number;
              variantMRP: number;
              variantStockQuantity: number;
              variantImages?: string[];
            }>;
          }) => {
            const firstVariant = product.variants[0];
            const variantDisplayName = firstVariant?.displayName || firstVariant?.variantName || product.shortDescription;
            
            return {
              id: product.id,
              name: variantDisplayName,
              label: variantDisplayName,
              value: product.id,
              image: firstVariant?.variantImages?.[0],
              variants: product.variants.map((variant, index: number) => ({
                variantIndex: index,
                variantName: variant.variantName,
                displayName: variant.displayName || variant.variantName,
                variantSellingPrice: variant.variantSellingPrice,
                variantMRP: variant.variantMRP,
                variantStockQuantity: variant.variantStockQuantity,
              })),
            };
          });

        // Store all products for reference
        setAllProducts(allProductOptions);

        // Filter out products that already have addons for the dropdown
        const availableProducts = allProductOptions.filter(
          product => !addons.some(addon => addon.productId === product.id)
        );
        
        setProducts(availableProducts);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVariant = (productId: string, variantIndex: number) => {
    const existingAddon = addons.find(
      (addon) => addon.productId === productId && addon.variantIndex === variantIndex
    );

    if (existingAddon) {
      toast.error("This variant is already added");
      return;
    }

    const newAddon: FrequentlyBoughtTogetherItem = {
      productId,
      variantIndex,
      isDefaultSelected: true, // Default to selected
    };

    setAddons([...addons, newAddon]);
    toast.success("Add-on added successfully");
  };

  const handleRemoveAddon = (productId: string, variantIndex: number) => {
    setAddons(addons.filter(
      (addon) => !(addon.productId === productId && addon.variantIndex === variantIndex)
    ));
    toast.success("Add-on removed");
  };

  const handleToggleDefaultSelected = (productId: string, variantIndex: number) => {
    setAddons(
      addons.map((addon) =>
        addon.productId === productId && addon.variantIndex === variantIndex
          ? { ...addon, isDefaultSelected: !addon.isDefaultSelected }
          : addon
      )
    );
  };

  const getProductDetails = (productId: string) => {
    return allProducts.find((p) => p.id === productId);
  };

  const getVariantDetails = (productId: string, variantIndex: number) => {
    const product = getProductDetails(productId);
    return product?.variants[variantIndex];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-blue-900">Frequently Bought Together</h3>
          <p className="text-sm text-blue-700 mt-1">
            Add complementary products that customers often buy together with this item. 
            These will be displayed on the product detail page with checkboxes, allowing 
            customers to easily add multiple items to their cart at once.
          </p>
        </div>
      </div>

      {/* Product Selection */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Select Add-on Products
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Choose products to display as &quot;Frequently Bought Together&quot;
            </p>
          </div>

          {/* IntentUI MultipleSelect */}
          <MultipleSelect
            className="w-full"
            placeholder="Search and select products..."
            aria-label="Select products"
            selectedKeys={selectedProductIds}
            onSelectionChange={(keys) => {
              console.log('Selection changed:', keys);
              console.log('Keys type:', typeof keys, keys instanceof Set);
              setSelectedProductIds(keys as Set<React.Key>);
            }}
            isDisabled={isLoading}
          >
            <MultipleSelectContent items={products}>
              {(item) => (
                <MultipleSelectItem id={item.id} textValue={item.name}>
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm">{item.name}</span>
                  </div>
                </MultipleSelectItem>
              )}
            </MultipleSelectContent>
          </MultipleSelect>

          {/* Debug info */}
          <div className="text-xs text-gray-500 mt-2">
            Selected: {selectedProductIds.size} products | 
            Total products: {products.length} | 
            Addons: {addons.length}
          </div>

          {/* Selected Products with Variants */}
          {selectedProductIds.size > 0 && (
            <div className="mt-6 space-y-4">
              <Label className="text-sm font-medium">
                Select specific variants to add ({selectedProductIds.size} product(s) selected):
              </Label>
              {Array.from(selectedProductIds).map((productId) => {
                const product = products.find(p => p.id === productId);
                if (!product) {
                  console.log('Product not found:', productId);
                  return null;
                }

                return (
                  <Card key={productId as string} className="p-4 border-2">
                    <div className="flex items-center gap-3 mb-3">
                      {product.image && (
                        <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                          <Image
                            src={product.image}
                            alt={product.label}
                            width={48}
                            height={48}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-1">{product.label}</h4>
                        <p className="text-xs text-gray-500">{product.variants.length} variant(s)</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {product.variants.map((variant) => {
                        const isAdded = addons.some(
                          (addon) =>
                            addon.productId === product.id &&
                            addon.variantIndex === variant.variantIndex
                        );

                        return (
                          <div
                            key={variant.variantIndex}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">{variant.displayName}</p>
                              <p className="text-xs text-gray-600">
                                ₹{variant.variantSellingPrice.toFixed(0)} • Stock: {variant.variantStockQuantity}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant={isAdded ? "destructive" : "default"}
                              onClick={() =>
                                isAdded
                                  ? handleRemoveAddon(product.id, variant.variantIndex)
                                  : handleAddVariant(product.id, variant.variantIndex)
                              }
                            >
                              {isAdded ? (
                                <>
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Remove
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Added Add-ons List */}
      {addons.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">
                Added Add-ons ({addons.length})
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                These products will be shown as &quot;Frequently Bought Together&quot;
              </p>
            </div>

            <div className="space-y-3">
              {addons.map((addon) => {
                const product = getProductDetails(addon.productId);
                const variant = getVariantDetails(addon.productId, addon.variantIndex);

                if (!product || !variant) return null;

                return (
                  <div
                    key={`${addon.productId}-${addon.variantIndex}`}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    {product.image && (
                      <div className="w-16 h-16 bg-white rounded-md overflow-hidden flex-shrink-0">
                        <Image
                          src={product.image}
                          alt={product.label}
                          width={64}
                          height={64}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1">{product.label}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">{variant.displayName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        ₹{variant.variantSellingPrice.toFixed(0)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={addon.isDefaultSelected}
                          onCheckedChange={() =>
                            handleToggleDefaultSelected(addon.productId, addon.variantIndex)
                          }
                        />
                        <Label className="text-xs text-gray-600">
                          {addon.isDefaultSelected ? "Pre-selected" : "Not pre-selected"}
                        </Label>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveAddon(addon.productId, addon.variantIndex)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {addons.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm">No add-ons added yet</p>
          <p className="text-xs mt-1">Select products above to add them as frequently bought together items</p>
        </div>
      )}
    </div>
  );
}
