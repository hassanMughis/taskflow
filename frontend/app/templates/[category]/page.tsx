import { TemplateCategoryView } from "../../components/dashboard/template-category-view";
import { DashboardGuard } from "../../components/auth/dashboard-guard";

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return <DashboardGuard><TemplateCategoryView categorySlug={category} /></DashboardGuard>;
}
