"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { DashboardShell } from "./dashboard-shell";
import { Icon } from "./dashboard-icon";
import { templateDetailUrl } from "./template-utils";


const categoryImageVersion = "2";

const featuredCategories = [
  { name: "Business", image: `/categories/cat-business.png?v=${categoryImageVersion}` },
  { name: "Design", image: `/categories/cat-design.png?v=${categoryImageVersion}` },
  { name: "Education", image: `/categories/cat-education.png?v=${categoryImageVersion}` },
  { name: "Engineering", image: `/categories/cat-engineering.png?v=${categoryImageVersion}` },
  { name: "Marketing", image: `/categories/cat-marketing.png?v=${categoryImageVersion}` },
  { name: "Project Management", image: `/categories/cat-project-management.png?v=${categoryImageVersion}` },
  { name: "Remote Work", image: `/categories/cat-remote-work.png?v=${categoryImageVersion}` },
];

const newAndNotable = [
  { title: "My Tasks | Trello", author: "Trello Team", desc: "Track all your to-dos in your own, private Trello board.", uses: "3K", views: "4" },
  { title: "New Hire Onboarding", author: "Trello Team", desc: "Help new employees start strong with this onboarding template.", uses: "16.5K", views: "158.5K", cover: "/board-cover-studio.png" },
  { title: "Tier List", author: "Trello Engineering Team", desc: "Use this template to create a tier list for anything you want.", uses: "5.5K", views: "55.5K", cover: "/board-cover-coast.png" }
];

const templateSections = [
  {
    category: "Business",
    templates: [
      { title: "A Lead Management Pipeline", author: "Crmble", desc: "Use this board to manage inventory or away requests.", uses: "53.8K", views: "385.6K", cover: "/board-cover-mountain.png" },
      { title: "Lean Canvas", author: "Symphonic Ahmed", desc: "Lean Canvas is a 1-page business plan template.", uses: "34.6K", views: "160.2K", cover: "/board-cover-coast.png" },
      { title: "Nonprofit Project Management", author: "Atlassian", desc: "Turn big dreams into bigger results. Use this Trello template...", uses: "2.1K", views: "13.8K", cover: "/board-cover-studio.png" }
    ]
  },
  {
    category: "Design",
    templates: [
      { title: "Design Project Template", author: "Trello Team", desc: "An easy to use template for planning and monitoring your branding.", uses: "19.7K", views: "176.8K", cover: "/board-cover-studio.png" },
      { title: "Design System Checklist", author: "Sam Juli", desc: "A design system unites product teams around a common visual language.", uses: "25.9K", views: "123.3K", cover: "/board-cover-mountain.png" },
      { title: "Freelance Branding Project", author: "Trello Team", desc: "Use this template to run your next branding project.", uses: "27.3K", views: "181.6K", cover: "/board-cover-coast.png" }
    ]
  }
];

function CategoryIcon({ name, image }: { name: string; image: string }) {
  const slug = name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-");
  return (
    <Link
      href={`/templates/${slug}`}
      className="group flex min-w-0 flex-col items-center gap-1 text-center text-xs text-[#44546f] transition hover:-translate-y-0.5 focus:outline-none dark:text-[#b6c2cf]"
    >
      <span className="relative block aspect-square w-full overflow-hidden rounded shadow-sm ring-offset-2 group-focus:ring-2 group-focus:ring-[#4c9aff] dark:ring-offset-[#1d1f21]">
        <Image src={image} alt="" fill unoptimized sizes="115px" className="object-cover object-top transition group-hover:brightness-95" />
      </span>
      <span className="min-h-8 leading-4">{name}</span>
    </Link>
  );
}

type TemplateCardProps = {
  title: string;
  author: string;
  desc: string;
  uses: string;
  views: string;
  cover?: string;
};

function TemplateCard({ title, author, desc, uses, views, cover, category }: TemplateCardProps & { category: string }) {
  return (
    <Link href={templateDetailUrl({ category, title, author, desc, uses, views, cover })} title={`Open ${title}`} className="flex min-w-0 flex-col text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#4c9aff]">
      <div className="relative h-[146px] w-full overflow-visible rounded bg-gradient-to-br from-[#f04b37] to-[#ff9f43]">
        {cover ? (
          <Image src={cover} alt="" fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#a6c6fb] to-[#dab9ff]" />
        )}
        <div className="absolute -bottom-4 left-3 flex h-[52px] w-[52px] items-center justify-center rounded border-4 border-[#172b4d] bg-[#454b52] text-white shadow-md dark:border-[#101214]">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-[#0c66e4]"><Icon name="tasks" size={17} /></span>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-8">
        <h3 className="text-base font-semibold text-[#172b4d] dark:text-[#f1f2f4]">{title}</h3>
        <p className="mt-1 text-xs text-[#5e6c84] dark:text-[#b6c2cf]">by {author}</p>
        <p className="mt-1 line-clamp-2 flex-1 text-xs text-[#172b4d] dark:text-[#f1f2f4]">{desc}</p>
        <div className="mt-4 flex items-center gap-4 text-xs text-[#5e6c84] dark:text-[#b6c2cf]">
          <span className="flex items-center gap-1"><Icon name="grid" size={14} /> {uses}</span>
          <span className="flex items-center gap-1"><Icon name="search" size={14} /> {views}</span>
        </div>
      </div>
    </Link>
  );
}

export function TemplatesOverview({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCategories = featuredCategories.filter((category) => category.name.toLowerCase().includes(normalizedQuery));
  const filteredNotable = newAndNotable.filter((template) => template.title.toLowerCase().includes(normalizedQuery) || template.desc.toLowerCase().includes(normalizedQuery));
  const filteredSections = templateSections.map((section) => ({ ...section, templates: section.templates.filter((template) => template.title.toLowerCase().includes(normalizedQuery) || template.desc.toLowerCase().includes(normalizedQuery)) })).filter((section) => section.templates.length > 0);

  return (
    <DashboardShell active="Templates">
      <div className="mx-auto max-w-[908px] pb-12 animate-page">
        
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-[23px] font-semibold text-[#172b4d] dark:text-[#f1f2f4]">Featured categories</h1>
          <div className="relative">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="text" 
              placeholder="Find template" 
              className="w-full rounded sm:w-[264px] border border-[#dfe1e6] bg-[#fafbfc] py-2.5 pl-4 pr-10 text-sm text-[#172b4d] placeholder-[#6b778c] focus:border-[#4c9aff] focus:outline-none focus:ring-1 focus:ring-[#4c9aff] dark:border-[#3d4145] dark:bg-[#22272b] dark:text-[#f1f2f4] dark:placeholder:text-[#8c9bab]" 
            />
            <Icon name="search" size={16} className="absolute right-3 top-2.5 text-[#6b778c]" />
          </div>
        </div>

        {/* Categories Grid */}
        <div className="mb-8 grid grid-cols-2 gap-[17px] sm:grid-cols-4 md:grid-cols-7 stagger">
          {filteredCategories.map(cat => (
            <CategoryIcon key={cat.name} name={cat.name} image={cat.image} />
          ))}
        </div>

        {/* New and Notable */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-[#ffab00] text-white"><Icon name="grid" size={14} /></span>
            <h2 className="text-[23px] font-semibold text-[#172b4d] dark:text-[#f1f2f4]">New and notable templates</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 stagger">
            {filteredNotable.map(tmpl => (
              <TemplateCard key={tmpl.title} {...tmpl} category="featured" />
            ))}
          </div>
        </section>

        {/* Category Sections */}
        {filteredSections.map(section => (
          <section key={section.category} className="mb-12">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-[#0052cc] text-white"><Icon name="grid" size={14} /></span>
                <h2 className="text-[20px] font-semibold text-[#172b4d] dark:text-[#f1f2f4]">{section.category}</h2>
              </div>
              <Link href={`/templates/${section.category.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`} className="rounded bg-[#091e420f] px-3 py-1.5 text-sm font-medium text-[#42526e] hover:bg-[#091e4214] transition">
                More templates for {section.category}
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {section.templates.map(tmpl => (
                <TemplateCard key={tmpl.title} {...tmpl} category={section.category.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")} />
              ))}
            </div>
          </section>
        ))}
      {normalizedQuery && filteredCategories.length === 0 && filteredNotable.length === 0 && filteredSections.length === 0 ? <p className="rounded-lg border border-[#dfe1e6] bg-white p-8 text-center text-sm text-[#5e6c84] dark:border-[#454f59] dark:bg-[#22272b] dark:text-[#b6c2cf]">No templates match &quot;{query.trim()}&quot;.</p> : null}

      </div>
    </DashboardShell>
  );
}

