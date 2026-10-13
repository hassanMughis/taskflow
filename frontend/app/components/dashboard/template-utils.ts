export function templateKeyFromTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function templateCreateUrl(title: string, cover = "/board-cover-studio.png") {
  const params = new URLSearchParams({
    create: "1",
    title,
    cover,
    template: templateKeyFromTitle(title),
  });
  return `/dashboard?${params.toString()}`;
}

export function templateDetailUrl({ category, title, author, desc, uses, views, cover = "/board-cover-studio.png" }: { category: string; title: string; author: string; desc: string; uses: string; views: string; cover?: string }) {
  const params = new URLSearchParams({ title, author, desc, uses, views, cover });
  return `/templates/${category}/${templateKeyFromTitle(title)}?${params.toString()}`;
}
