import { TemplateDetailView } from "../../../components/dashboard/template-detail-view";

type TemplateDetailPageProps = {
  params: Promise<{ category: string; templateSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function value(input: string | string[] | undefined, fallback: string) {
  return typeof input === "string" && input.trim() ? input : fallback;
}

export default async function TemplateDetailPage({ params, searchParams }: TemplateDetailPageProps) {
  const { category, templateSlug } = await params;
  const query = await searchParams;
  const fallbackTitle = templateSlug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <TemplateDetailView
      category={category}
      templateKey={templateSlug}
      title={value(query.title, fallbackTitle)}
      author={value(query.author, "Kanvero Team")}
      description={value(query.desc, "Use this ready-made workflow to organize work, collaborate with your team, and move projects forward.")}
      uses={value(query.uses, "1K")}
      views={value(query.views, "10K")}
      cover={value(query.cover, "/board-cover-studio.png")}
    />
  );
}
