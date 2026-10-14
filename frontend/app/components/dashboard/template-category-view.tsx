"use client";

import { DashboardShell } from "./dashboard-shell";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "./dashboard-icon";
import { templateDetailUrl } from "./template-utils";

const categories = [
  "Business", "Design", "Education", "Engineering", "Marketing",
  "HR & Operations", "Personal", "Productivity", "Product management",
  "Project management", "Remote work", "Sales", "Support", "Team management",
];

const categoryIcons: Record<string, string> = {
  business: "/categories/cat-business.png",
  design: "/categories/cat-design.png",
  education: "/categories/cat-education.png",
  engineering: "/categories/cat-engineering.png",
  marketing: "/categories/cat-marketing.png",
  "hr-operations": "/categories/cat-business.png",
  personal: "/categories/cat-design.png",
  productivity: "/categories/cat-engineering.png",
  "product-management": "/categories/cat-project-management.png",
  "project-management": "/categories/cat-project-management.png",
  "remote-work": "/categories/cat-remote-work.png",
  sales: "/categories/cat-business.png",
  support: "/categories/cat-remote-work.png",
  "team-management": "/categories/cat-business.png",
};

const templateCovers = [
  "/board-cover-studio.png",
  "/board-cover-mountain.png",
  "/board-cover-coast.png",
];

const categoryTemplates: Record<string, { title: string; author: string; desc: string; uses: string; views: string }[]> = {
  business: [
    { title: "Business Plan", author: "Trello Team", desc: "Outline your company goals, strategies, and execution plans in one organized board.", uses: "43k uses", views: "120k views" },
    { title: "Company OKRs", author: "Atlassian", desc: "Set objectives and key results for each quarter and track progress across teams.", uses: "28k uses", views: "90k views" },
    { title: "Meeting Agenda", author: "Trello Team", desc: "Keep meetings focused and productive with a structured agenda board.", uses: "61k uses", views: "200k views" },
  ],
  design: [
    { title: "Design Sprint", author: "Google Ventures", desc: "Run a 5-day design sprint to solve critical business challenges through prototyping.", uses: "19k uses", views: "74k views" },
    { title: "UI Component Library", author: "Figma Team", desc: "Track your design system components, states, and documentation.", uses: "33k uses", views: "105k views" },
    { title: "Brand Guidelines", author: "Trello Team", desc: "Document your brand colors, typography, and usage guidelines in one place.", uses: "14k uses", views: "52k views" },
  ],
  education: [
    { title: "Lesson Planner", author: "Trello Team", desc: "Plan weekly lessons, learning goals, and classroom activities.", uses: "22k uses", views: "67k views" },
    { title: "Student Research", author: "Atlassian", desc: "Organize your research topics, sources, and notes for academic projects.", uses: "11k uses", views: "39k views" },
    { title: "Course Curriculum", author: "Kanvero Education", desc: "Build a complete course outline with modules, resources, and assessment milestones.", uses: "17k uses", views: "55k views" },
  ],
  engineering: [
    { title: "Sprint Planning", author: "Atlassian", desc: "Plan and track your development sprint from backlog to deployment.", uses: "55k uses", views: "180k views" },
    { title: "Bug Tracker", author: "Trello Team", desc: "Log, prioritize and assign bugs to your engineering team.", uses: "47k uses", views: "155k views" },
    { title: "Tech Roadmap", author: "Trello Team", desc: "Map out your technical roadmap across quarters and teams.", uses: "31k uses", views: "98k views" },
  ],
  marketing: [
    { title: "Content Calendar", author: "Trello Team", desc: "Plan and schedule blog posts, social media, and campaign content.", uses: "72k uses", views: "230k views" },
    { title: "Campaign Workflow", author: "HubSpot", desc: "Track your marketing campaigns from ideation to launch.", uses: "38k uses", views: "119k views" },
    { title: "Social Media Planner", author: "Kanvero Team", desc: "Coordinate posts, creative assets, approvals, and publishing across every channel.", uses: "45k uses", views: "142k views" },
  ],
  "hr-operations": [
    { title: "Employee Onboarding", author: "Trello Team", desc: "Guide new hires through their first 90 days with a structured onboarding plan.", uses: "41k uses", views: "133k views" },
    { title: "HR Policy Tracker", author: "Atlassian", desc: "Document, version, and distribute company HR policies.", uses: "18k uses", views: "60k views" },
    { title: "Recruiting Pipeline", author: "Kanvero People", desc: "Move candidates from application to offer with a clear collaborative hiring workflow.", uses: "34k uses", views: "108k views" },
  ],
  personal: [
    { title: "Personal Goals", author: "Trello Team", desc: "Track your personal goals and habits with a simple Kanban board.", uses: "89k uses", views: "280k views" },
    { title: "Weekly Planner", author: "Trello Team", desc: "Plan your week across work, personal life, and self-care.", uses: "63k uses", views: "195k views" },
    { title: "Home Organization", author: "Kanvero Team", desc: "Organize household projects, errands, recurring tasks, and important reminders.", uses: "32k uses", views: "101k views" },
  ],
  productivity: [
    { title: "Getting Things Done", author: "David Allen Co.", desc: "Implement the GTD methodology to clear your mind and focus on what matters.", uses: "50k uses", views: "165k views" },
    { title: "Daily Standup", author: "Trello Team", desc: "Track your team's daily progress, blockers, and plans.", uses: "36k uses", views: "112k views" },
    { title: "Priority Matrix", author: "Kanvero Team", desc: "Sort work by urgency and impact so your team always knows what comes next.", uses: "29k uses", views: "94k views" },
  ],
  "product-management": [
    { title: "Product Roadmap", author: "Trello Team", desc: "Visualize your product strategy and communicate priorities across your organization.", uses: "68k uses", views: "215k views" },
    { title: "Feature Requests", author: "Atlassian", desc: "Collect, prioritize, and track feature requests from customers and stakeholders.", uses: "44k uses", views: "138k views" },
    { title: "Product Discovery", author: "Kanvero Product", desc: "Turn customer insights into validated problems, experiments, and product opportunities.", uses: "35k uses", views: "111k views" },
  ],
  "project-management": [
    { title: "Project Tracker", author: "Trello Team", desc: "Keep all your projects on track with milestones, tasks, and deadlines.", uses: "81k uses", views: "255k views" },
    { title: "Agile Board", author: "Atlassian", desc: "Run agile projects with a simple and powerful Kanban or Scrum board.", uses: "59k uses", views: "190k views" },
    { title: "Project Launch", author: "Kanvero Team", desc: "Coordinate scope, owners, risks, milestones, and launch activities in one board.", uses: "48k uses", views: "151k views" },
  ],
  "remote-work": [
    { title: "Remote Team Hub", author: "Trello Team", desc: "Keep your distributed team aligned with a central hub for communication and tasks.", uses: "37k uses", views: "118k views" },
    { title: "Async Standup", author: "Atlassian", desc: "Run daily standups asynchronously so your global team stays in sync.", uses: "25k uses", views: "80k views" },
    { title: "Virtual Office", author: "Kanvero Team", desc: "Share updates, team rituals, useful links, and decisions across time zones.", uses: "21k uses", views: "69k views" },
  ],
  sales: [
    { title: "Sales Pipeline", author: "Trello Team", desc: "Track leads, deals, and customers through every stage of your sales funnel.", uses: "54k uses", views: "170k views" },
    { title: "Account Management", author: "Salesforce", desc: "Manage client relationships and track account health in one place.", uses: "29k uses", views: "93k views" },
    { title: "Sales Enablement", author: "Kanvero Sales", desc: "Give sellers one place for playbooks, collateral, coaching, and deal support.", uses: "26k uses", views: "84k views" },
  ],
  support: [
    { title: "Customer Support Queue", author: "Trello Team", desc: "Triage, assign, and resolve support tickets efficiently with your team.", uses: "46k uses", views: "148k views" },
    { title: "Knowledge Base", author: "Atlassian", desc: "Build and maintain a searchable knowledge base for your support team.", uses: "21k uses", views: "68k views" },
    { title: "Customer Feedback", author: "Kanvero Support", desc: "Capture recurring feedback, identify trends, and close the loop with customers.", uses: "24k uses", views: "77k views" },
  ],
  "team-management": [
    { title: "Team Goals", author: "Trello Team", desc: "Align your team around shared goals and track progress throughout the quarter.", uses: "39k uses", views: "125k views" },
    { title: "1-on-1 Meeting", author: "Atlassian", desc: "Structure productive 1-on-1 meetings with recurring agenda items and action items.", uses: "27k uses", views: "87k views" },
    { title: "Team Health Monitor", author: "Kanvero Team", desc: "Review team health, discuss friction, and turn improvement ideas into action.", uses: "20k uses", views: "64k views" },
  ],
};

function slugToTitle(slug: string): string {
  return categories.find(
    (c) => c.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-") === slug
  ) ?? (slug ?? "").replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function TemplateCard({ title, author, desc, uses, views, cover, category }: { title: string; author: string; desc: string; uses: string; views: string; cover?: string; category: string }) {
  const href = templateDetailUrl({ category, title, author, desc, uses, views, cover });
  const initials = author.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Link href={href} title={`Open ${title}`} className="group min-w-0 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#4c9aff]">
      <div className="relative h-[146px] w-full overflow-visible rounded">
        {cover ? <Image src={cover} alt="" fill sizes="291px" className="rounded object-cover" /> : null}
        <span className="absolute -bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-br from-[#ff9f43] to-[#c9372c] text-xs font-bold text-white shadow dark:border-[#1d1f21]">{initials}</span>
      </div>
      <div className="px-3 pb-3 pt-8">
        <h3 className="text-base font-semibold text-[#172b4d] dark:text-[#f1f2f4]">{title}</h3>
        <p className="mt-1 text-sm text-[#44546f] dark:text-[#b6c2cf]">by {author}</p>
        <p className="mt-1 text-sm leading-[22px] text-[#172b4d] dark:text-[#f1f2f4]">{desc}</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-[#626f86] dark:text-[#8c9bab]">
          <span className="flex items-center gap-1"><Icon name="grid" size={15} />{uses}</span>
          <span className="flex items-center gap-1"><Icon name="search" size={15} />{views}</span>
        </div>
      </div>
    </Link>
  );
}

export function TemplateCategoryView({ categorySlug }: { categorySlug: string }) {
  const [query, setQuery] = useState("");
  const title = slugToTitle(categorySlug);
  const items = categoryTemplates[categorySlug] ?? [];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = items.filter((item) => item.title.toLowerCase().includes(normalizedQuery) || item.desc.toLowerCase().includes(normalizedQuery));
  const categoryIcon = categoryIcons[categorySlug] ?? "/categories/cat-business.png";

  return (
    <DashboardShell active="Templates">
      <div className="mx-auto max-w-[895px] animate-page">
        {/* Breadcrumb */}
        <div className="mb-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-[#44546f] dark:text-[#b6c2cf]">
            <Link href="/templates" className="hover:text-[#0c66e4] hover:underline">Template gallery</Link>
            <span>/</span>
            <span className="font-medium text-[#172b4d] dark:text-[#f1f2f4]">{title}</span>
          </div>
          <label className="relative hidden sm:block">
            <span className="sr-only">Find template</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Find template" className="h-11 w-[264px] rounded border border-[#dcdfe4] bg-white px-4 pr-10 text-sm text-[#172b4d] outline-none focus:border-[#0c66e4] dark:border-[#3d4145] dark:bg-[#22272b] dark:text-[#f1f2f4]" />
            <Icon name="search" size={17} className="absolute right-3 top-3 text-[#626f86] dark:text-[#9fadbc]" />
          </label>
        </div>

        {/* Header */}
        <div className="mb-[34px] flex items-center gap-3">
          <span className="relative h-[53px] w-[53px] shrink-0 overflow-hidden rounded"><Image src={categoryIcon} alt="" fill sizes="53px" className="object-cover object-top" /></span>
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-[#172b4d] dark:text-[#f1f2f4]">{title} templates</h1>
          </div>
        </div>

        {/* Templates Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger">
            {filteredItems.map((t, index) => (
              <TemplateCard key={t.title} {...t} category={categorySlug} cover={templateCovers[index % templateCovers.length]} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center text-[#626f86] dark:text-[#9fadbc]">
            <Icon name="tasks" size={40} />
            <p className="mt-4 text-lg font-medium">No templates found</p>
            <p className="mt-1 text-sm">Try a different search in {title}.</p>
          </div>
        )}

        {/* Back link */}
        <div className="mt-12">
          <Link href="/templates" className="text-sm font-medium text-[#0c66e4] hover:underline">
            ← Browse all templates
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}

