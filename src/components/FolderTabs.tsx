import React from "react";
import {
  BarChart3,
  Brain,
  ClipboardCheck,
  Clock3,
  FileText,
  Home,
  Star,
} from "lucide-react";

export interface FolderTabItem {
  id: string;
  label: string;
  surface?: "document";
}

interface FolderTabsProps {
  menuItems: FolderTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}

const tabIcons = {
  general: Home,
  students: Clock3,
  scores: BarChart3,
  attributes1_4: Star,
  attributes5_8: Star,
  analytical: Brain,
  indicators: ClipboardCheck,
  instructions1: FileText,
  instructions2: FileText,
} as const;

const tabThemes: Record<
  string,
  {
    bg: string;
    activeBg?: string;
    border: string;
    accent: string;
    text: string;
    icon: string;
  }
> = {
  general: {
    bg: "#eef7ff",
    activeBg: "#ffffff",
    border: "#bfdbfe",
    accent: "#60a5fa",
    text: "#2563eb",
    icon: "#60a5fa",
  },
  students: {
    bg: "#fff3c9",
    activeBg: "#ffffff",
    border: "#fde68a",
    accent: "#eab308",
    text: "#854d0e",
    icon: "#a16207",
  },
  scores: {
    bg: "#ddf1d2",
    activeBg: "#ffffff",
    border: "#bbf7d0",
    accent: "#22c55e",
    text: "#166534",
    icon: "#16a34a",
  },
  attributes1_4: {
    bg: "#eef4ff",
    activeBg: "#ffffff",
    border: "#bfdbfe",
    accent: "#2563eb",
    text: "#1d4ed8",
    icon: "#2563eb",
  },
  attributes5_8: {
    bg: "#f2ddff",
    activeBg: "#ffffff",
    border: "#e9d5ff",
    accent: "#8b5cf6",
    text: "#6d28d9",
    icon: "#7c3aed",
  },
  analytical: {
    bg: "#ffd9e4",
    activeBg: "#ffffff",
    border: "#fecdd3",
    accent: "#e11d48",
    text: "#be123c",
    icon: "#be123c",
  },
  indicators: {
    bg: "#fed9b6",
    activeBg: "#ffffff",
    border: "#fed7aa",
    accent: "#f97316",
    text: "#9a3412",
    icon: "#c2410c",
  },
  instructions1: {
    bg: "#c9f3f4",
    activeBg: "#ffffff",
    border: "#a5f3fc",
    accent: "#06b6d4",
    text: "#0e7490",
    icon: "#0891b2",
  },
  instructions2: {
    bg: "#edf2f7",
    activeBg: "#ffffff",
    border: "#cbd5e1",
    accent: "#64748b",
    text: "#475569",
    icon: "#64748b",
  },
};

type FolderTabStyle = React.CSSProperties &
  Record<`--folder-tab-${string}`, string>;

export const FolderTabs: React.FC<FolderTabsProps> = ({
  menuItems,
  activeId,
  onChange,
  ariaLabel = "เมนูกรอก ปพ.5",
}) => {
  return (
    <div className="folder-tabs-shell">
      <nav className="folder-tabs-scroll hide-scrollbar" aria-label={ariaLabel}>
        <div className="folder-tabs-track" role="tablist">
          {menuItems.map((item, index) => {
            const selected = item.id === activeId;
            const theme = tabThemes[item.id] ?? tabThemes.instructions2;
            const Icon = tabIcons[item.id as keyof typeof tabIcons] ?? FileText;
            const style: FolderTabStyle = {
              zIndex: selected ? menuItems.length + 10 : menuItems.length - index,
              "--folder-tab-bg": theme.bg,
              "--folder-tab-active-bg": theme.activeBg ?? theme.bg,
              "--folder-tab-border": theme.border,
              "--folder-tab-accent": theme.accent,
              "--folder-tab-text": theme.text,
              "--folder-tab-icon": theme.icon,
            };

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-current={selected ? "page" : undefined}
                onClick={() => onChange(item.id)}
                className={`folder-tab ${
                  selected ? "folder-tab-active" : "folder-tab-inactive"
                } ${item.surface === "document" ? "folder-tab-document" : ""}`}
                style={style}
              >
                <span className="folder-tab-label">
                  <Icon className="folder-tab-icon" aria-hidden="true" />
                  <span className="folder-tab-text">{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
