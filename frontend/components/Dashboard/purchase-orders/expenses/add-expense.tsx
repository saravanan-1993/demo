"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { expenseCategoryService } from "@/services/expenseCategoryService";
import { expenseService } from "@/services/expenseService";
import { supplierService } from "@/services/purchaseService";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, X, Edit2 } from "lucide-react";
import { format } from "date-fns";
import FileUpload from "@/components/ui/file-upload";

interface ExpenseData {
  expenseNumber?: string;
  categoryId: string;
  expense: string;
  description: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  supplierId?: string;
  supplierName?: string;
  receiptUrl?: string;
  status: string;
  notes: string;
}

interface AddExpenseProps {
  expense?: ExpenseData | null;
  onSubmit: (data: ExpenseData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function AddExpense({
  expense,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AddExpenseProps) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [explicitlyClosing, setExplicitlyClosing] = useState(false);

  // Supplier dropdown states
  const [showOtherSupplierInput, setShowOtherSupplierInput] = useState(false);
  const [otherSupplierName, setOtherSupplierName] = useState("");

  // Receipt upload states
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);

  const [formData, setFormData] = useState<ExpenseData>({
    expenseNumber: "",
    categoryId: "",
    expense: "",
    description: "",
    amount: 0,
    expenseDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Cash",
    supplierId: "",
    supplierName: "",
    receiptUrl: "",
    status: "pending",
    notes: "",
  });

  // Fetch expense number from backend
  const fetchExpenseNumber = async (): Promise<string> => {
    try {
      const expenseNumber = await expenseService.getNextExpenseNumber();
      return expenseNumber;
    } catch (error) {
      toast.error("Failed to generate expense number");
      return "";
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesData, suppliersData] = await Promise.all([
          expenseCategoryService.getCategoryNames(),
          supplierService.getAll(),
        ]);

        setCategories(categoriesData);
        setSuppliers(suppliersData.map((s) => ({ id: s.id, name: s.name })));

        // Fetch expense number if not editing
        if (!expense) {
          const expenseNumber = await fetchExpenseNumber();
          setFormData((prev) => ({ ...prev, expenseNumber }));
        }
      } catch (error) {
        toast.error("Failed to load form data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [expense]);

  useEffect(() => {
    if (expense) {
      setFormData({
        expenseNumber: expense.expenseNumber || "",
        categoryId: expense.categoryId || "",
        expense: expense.expense || "",
        description: expense.description || "",
        amount: expense.amount || 0,
        expenseDate:
          expense.expenseDate || new Date().toISOString().split("T")[0],
        paymentMethod: expense.paymentMethod || "Cash",
        supplierId: expense.supplierId || "",
        supplierName: expense.supplierName || "",
        receiptUrl: expense.receiptUrl || "",
        status: expense.status || "pending",
        notes: expense.notes || "",
      });

      // Check if it's a manual supplier (not in the list)
      if (expense.supplierName && expense.supplierId) {
        const supplierExists = suppliers.find(
          (s) => s.id === expense.supplierId
        );
        if (!supplierExists) {
          setShowOtherSupplierInput(true);
          setOtherSupplierName(expense.supplierName);
          setFormData((prev) => ({ ...prev, supplierId: "other" }));
        }
      }
    }
  }, [expense, suppliers]);

  const handleChange = (field: keyof ExpenseData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const response = await expenseCategoryService.create({
        name: newCategoryName.trim(),
        description: "",
        isActive: true,
      });

      const newCategory = {
        id: response.data.id,
        name: newCategoryName.trim(),
      };
      setCategories((prev) => [...prev, newCategory]);

      setFormData((prev) => ({
        ...prev,
        categoryId: response.data.id,
      }));

      setNewCategoryName("");
      setShowAddCategory(false);
      setCategoryDropdownOpen(false);
      setExplicitlyClosing(true);

      toast.success("Expense category created successfully");
    } catch (error) {
      toast.error("Failed to create expense category");
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) return;

    try {
      await expenseCategoryService.update(editingCategory.id, {
        name: editCategoryName.trim(),
        isActive: true,
      });

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === editingCategory.id
            ? { ...cat, name: editCategoryName.trim() }
            : cat
        )
      );
      setEditingCategory(null);
      setEditCategoryName("");
      setCategoryDropdownOpen(false);
      setExplicitlyClosing(true);

      toast.success("Expense category updated successfully");
    } catch (error) {
      console.error("Error editing category:", error);
      toast.error("Failed to update expense category");
    }
  };

  const handleCancelAdd = () => {
    setShowAddCategory(false);
    setNewCategoryName("");
    setExplicitlyClosing(true);
    setCategoryDropdownOpen(false);
  };

  // Supplier handlers
  const handleSupplierChange = (value: string) => {
    if (value === "other") {
      // Show input field for manual entry
      setShowOtherSupplierInput(true);
      setOtherSupplierName("");
      setFormData((prev) => ({
        ...prev,
        supplierId: "other",
        supplierName: "",
      }));
    } else if (value === "none") {
      // Clear supplier selection
      setShowOtherSupplierInput(false);
      setOtherSupplierName("");
      setFormData((prev) => ({
        ...prev,
        supplierId: "",
        supplierName: "",
      }));
    } else {
      // Select existing supplier
      setShowOtherSupplierInput(false);
      setOtherSupplierName("");
      const selectedSupplier = suppliers.find((s) => s.id === value);
      setFormData((prev) => ({
        ...prev,
        supplierId: value,
        supplierName: selectedSupplier?.name || "",
      }));
    }
  };

  const handleOtherSupplierNameChange = (value: string) => {
    setOtherSupplierName(value);
    setFormData((prev) => ({
      ...prev,
      supplierName: value,
    }));
  };

  // Handle receipt file selection (don't upload yet)
  const handleReceiptSelect = (file: File) => {
    setReceiptFile(file);
    setRemoveExistingReceipt(false);
  };

  // Handle receipt remove
  const handleReceiptRemove = () => {
    setReceiptFile(null);
    setRemoveExistingReceipt(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryId) {
      toast.error("Please select an expense category");
      return;
    }

    if (!formData.expense) {
      toast.error("Please enter expense name");
      return;
    }

    try {
      const finalFormData = { ...formData };

      // Upload receipt if a new file is selected
      if (receiptFile) {
        const result = await expenseService.uploadReceipt(receiptFile);
        finalFormData.receiptUrl = result.receiptUrl;
      } else if (removeExistingReceipt) {
        // Mark for removal
        finalFormData.receiptUrl = "";
      }

      onSubmit(finalFormData);
    } catch (error) {
      toast.error("Failed to upload receipt");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Basic Information */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Basic Information
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Expense Number */}
          <div className="space-y-1.5">
            <Label htmlFor="expenseNumber" className="text-xs">
              Expense Number
            </Label>
            <Input
              id="expenseNumber"
              value={formData.expenseNumber}
              readOnly
              className="h-9 text-sm font-medium bg-muted/50 cursor-not-allowed"
              placeholder="EXP-2025-001"
            />
          </div>

          {/* Expense Category */}
          <div className="space-y-1.5">
            <Label htmlFor="categoryId" className="text-xs">
              Expense Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => {
                if (value === "add_new_category") {
                  setEditingCategory(null);
                  setEditCategoryName("");
                  setShowAddCategory(true);
                  setNewCategoryName("");
                  setCategoryDropdownOpen(true);
                } else {
                  handleChange("categoryId", value);
                  setCategoryDropdownOpen(false);
                }
              }}
              open={categoryDropdownOpen}
              onOpenChange={(open) => {
                if (
                  !open &&
                  (editingCategory || showAddCategory) &&
                  !explicitlyClosing
                ) {
                  setCategoryDropdownOpen(true);
                  return;
                }
                setCategoryDropdownOpen(open);
                if (explicitlyClosing) {
                  setExplicitlyClosing(false);
                }
                if (!open && !explicitlyClosing) {
                  setShowAddCategory(false);
                  setEditingCategory(null);
                  setNewCategoryName("");
                  setEditCategoryName("");
                }
              }}
            >
              <SelectTrigger id="categoryId" className="h-9 cursor-pointer">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="z-50">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between group"
                  >
                    <SelectItem
                      value={category.id}
                      className="flex-1 cursor-pointer"
                    >
                      {category.name}
                    </SelectItem>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 cursor-pointer p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAddCategory(false);
                          setNewCategoryName("");
                          setEditingCategory({
                            id: category.id,
                            name: category.name,
                          });
                          setEditCategoryName(category.name);
                          setCategoryDropdownOpen(true);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1.5 text-sm flex items-center text-gray-900 dark:text-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setEditingCategory(null);
                    setEditCategoryName("");
                    setShowAddCategory(true);
                    setNewCategoryName("");
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Category
                </div>

                {showAddCategory && (
                  <div
                    className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Add New Category
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelAdd}
                        className="hover:bg-gray-200 cursor-pointer dark:hover:bg-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter category name"
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCategory();
                          }
                          e.stopPropagation();
                        }}
                      />
                      <Button
                        type="button"
                        onClick={handleAddCategory}
                        size="sm"
                        className="cursor-pointer"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                {editingCategory && (
                  <div
                    className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Edit Category
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCategory(null);
                          setEditCategoryName("");
                          setExplicitlyClosing(true);
                          setCategoryDropdownOpen(false);
                        }}
                        className="hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        placeholder="Enter category name"
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleEditCategory();
                          }
                          e.stopPropagation();
                        }}
                      />
                      <Button
                        type="button"
                        onClick={handleEditCategory}
                        size="sm"
                        className="cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Update
                      </Button>
                    </div>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Expense Date */}
          <div className="space-y-1.5">
            <Label htmlFor="expenseDate" className="text-xs">
              Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`h-9 w-full justify-start text-left font-normal text-sm ${
                    !formData.expenseDate && "text-muted-foreground"
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expenseDate
                    ? format(new Date(formData.expenseDate), "PPP")
                    : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    formData.expenseDate
                      ? new Date(formData.expenseDate)
                      : undefined
                  }
                  onSelect={(date) =>
                    handleChange(
                      "expenseDate",
                      date ? format(date, "yyyy-MM-dd") : ""
                    )
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Expense Name */}
          <div className="space-y-1.5">
            <Label htmlFor="expense" className="text-xs">
              Expense <span className="text-destructive">*</span>
            </Label>
            <Input
              id="expense"
              placeholder="Enter expense name"
              value={formData.expense}
              onChange={(e) => handleChange("expense", e.target.value)}
              required
              className="h-9 text-sm"
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs">
              Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) =>
                handleChange("amount", parseFloat(e.target.value) || 0)
              }
              required
              min="0"
              step="0.01"
              className="h-9 text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="description" className="text-xs">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Enter expense description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Payment Information
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {/* Supplier */}
          <div className="space-y-1.5">
            <Label htmlFor="supplierId" className="text-xs">
              Supplier
            </Label>
            <Select
              value={formData.supplierId || "none"}
              onValueChange={handleSupplierChange}
            >
              <SelectTrigger id="supplierId" className="h-9 cursor-pointer">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="none" className="cursor-pointer">
                  No Supplier
                </SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem
                    key={supplier.id}
                    value={supplier.id}
                    className="cursor-pointer"
                  >
                    {supplier.name}
                  </SelectItem>
                ))}
                <SelectItem value="other" className="cursor-pointer">
                  Other
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Show input field when "Other" is selected */}
            {showOtherSupplierInput && (
              <Input
                placeholder="Enter supplier name"
                value={otherSupplierName}
                onChange={(e) => handleOtherSupplierNameChange(e.target.value)}
                className="h-9 text-sm mt-1.5"
              />
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label htmlFor="paymentMethod" className="text-xs">
              Payment Method
            </Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => handleChange("paymentMethod", value)}
            >
              <SelectTrigger id="paymentMethod" className="h-9">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
                <SelectItem value="Debit Card">Debit Card</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="status" className="text-xs">
              Status <span className="text-destructive">*</span>
            </Label>
            <Select
              key={formData.status}
              value={formData.status}
              onValueChange={(value) => handleChange("status", value)}
            >
              <SelectTrigger id="status" className="h-9">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>

                <SelectItem value="paid">Paid</SelectItem>
                
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="notes" className="text-xs">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Additional notes (optional)"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        </div>
      </div>

      {/* Receipt Upload */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Receipt / Invoice
        </h3>
        <FileUpload
          onUploadSuccess={handleReceiptSelect}
          onUploadError={(error) => {
            toast.error(error.message);
          }}
          acceptedFileTypes={[
            "image/jpeg",
            "image/jpg",
            "image/png",
            "application/pdf",
          ]}
          maxFileSize={5 * 1024 * 1024}
          currentFile={receiptFile}
          existingImageUrl={!removeExistingReceipt ? formData.receiptUrl : ""}
          onFileRemove={handleReceiptRemove}
          uploadDelay={0}
          className="max-w-full"
        />
        <p className="text-xs text-muted-foreground">
          Upload receipt or invoice (JPG, PNG, PDF - Max 5MB)
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          size="sm"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || loading} size="sm">
          {isSubmitting
            ? "Saving..."
            : expense
            ? "Update Expense"
            : "Add Expense"}
        </Button>
      </div>
    </form>
  );
}
