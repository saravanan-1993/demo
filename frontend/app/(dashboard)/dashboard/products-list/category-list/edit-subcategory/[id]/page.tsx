import { SubcategoryForm } from "@/components/Dashboard/products/category/subcategory-form";

export default async function EditSubcategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="p-5">
      <SubcategoryForm id={id} />
    </div>
  );
}
