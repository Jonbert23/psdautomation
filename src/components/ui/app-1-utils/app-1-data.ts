import type { ChartConfig } from "@/components/ui/chart"

const portrait = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=200&h=200&crop=faces`

export const app1User = {
  name: "Alex Morgan",
  initials: "AM",
  avatar: portrait("photo-1500648767791-00dcc994a43e"),
}

const people = {
  alex: app1User,
  jordan: {
    name: "Jordan Lee",
    initials: "JL",
    avatar: portrait("photo-1494790108377-be9c29b29330"),
  },
  sam: {
    name: "Sam Patel",
    initials: "SP",
    avatar: portrait("photo-1438761681033-6461ffad8d80"),
  },
  riley: {
    name: "Riley Chen",
    initials: "RC",
    avatar: portrait("photo-1472099645785-5658abf4ff4e"),
  },
  morgan: {
    name: "Morgan Blake",
    initials: "MB",
    avatar: portrait("photo-1507003211169-0a1dd7228f2d"),
  },
}

export const app1Chart = [
  { week: "W1", opened: 38, completed: 24 },
  { week: "W2", opened: 44, completed: 31 },
  { week: "W3", opened: 41, completed: 36 },
  { week: "W4", opened: 52, completed: 40 },
  { week: "W5", opened: 47, completed: 45 },
  { week: "W6", opened: 55, completed: 48 },
  { week: "W7", opened: 49, completed: 51 },
  { week: "W8", opened: 58, completed: 54 },
]

export const app1ChartConfig = {
  opened: {
    label: "Opened",
    color: "hsl(var(--chart-1))",
  },
  completed: {
    label: "Completed",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export const app1Projects = [
  {
    id: "brand-refresh",
    name: "Brand refresh",
    status: "In progress" as const,
    description: "New identity system for the spring campaign",
    progress: 72,
    dueDate: "Nov 4",
    team: [people.jordan, people.sam, people.riley],
  },
  {
    id: "client-portal",
    name: "Client portal",
    status: "In review" as const,
    description: "Handoff screens for approvals and comments",
    progress: 90,
    dueDate: "Oct 28",
    team: [people.alex, people.morgan],
  },
  {
    id: "onboarding",
    name: "Onboarding kit",
    status: "Planning" as const,
    description: "Welcome sequence for new team members",
    progress: 28,
    dueDate: "Nov 18",
    team: [people.sam, people.jordan],
  },
]

export const app1Activity = [
  {
    id: "a1",
    person: people.jordan,
    action: "moved Brand refresh into review",
    time: "2 hours ago",
  },
  {
    id: "a2",
    person: people.riley,
    action: "completed 6 tasks on Client portal",
    time: "5 hours ago",
  },
  {
    id: "a3",
    person: people.sam,
    action: "commented on the onboarding outline",
    time: "Yesterday",
  },
  {
    id: "a4",
    person: people.morgan,
    action: "added two new tasks to Brand refresh",
    time: "Yesterday",
  },
]
