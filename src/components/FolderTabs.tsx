import React from "react";
import {
  BarChart3,
  Brain,
  ClipboardCheck,
  Clock3,
  FileCheck2,
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
  instructions2: FileCheck2,
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
    bg: "linear-gradient(180deg, #ffffff 0%, #eef6ff 100%)",
    activeBg: "linear-gradient(180deg, #ffffff 0%, #f5fbff 100%)",
    border: "#bfdbfe",
    accent: "#60a5fa",
    text: "#2563eb",
    icon: "#60a5fa",
  },
  students: {
    bg: "linear-gradient(180deg, #fffdf4 0%, #fff1c8 100%)",
    activeBg: "linear-gradient(180deg, #fffefa 0%, #fff7d7 100%)",
    border: "#fde68a",
    accent: "#eab308",
    text: "#854d0e",
    icon: "#a16207",
  },
  scores: {
    bg: "linear-gradient(180deg, #fbfff7 0%, #dff3d2 100%)",
    activeBg: "linear-gradient(180deg, #ffffff 0%, #ecf9e7 100%)",
    border: "#bbf7d0",
    accent: "#22c55e",
    text: "#166534",
    icon: "#16a34a",
  },
  attributes1_4: {
    bg: "linear-gradient(180deg, #ffffff 0%, #f4f7ff 100%)",
    activeBg: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
    border: "#bfdbfe",
    accent: "#2563eb",
    text: "#1d4ed8",
    icon: "#2563eb",
  },
  attributes5_8: {
    bg: "linear-gradient(180deg, #fffaff 0%, #f4ddff 100%)",
    activeBg: "linear-gradient(180deg, #ffffff 0%, #fbf5ff 100%)",
    border: "#e9d5ff",
    accent: "#8b5cf6",
    text: "#6d28d9",
    icon: "#7c3aed",
  },
  analytical: {
    bg: "linear-gradient(180deg, #fff8fb 0%, #ffd6e1 100%)",
    activeBg: "linear-gradient(180deg, #ffffff 0%, #fff1f5 100%)",
    border: "#fecdd3",
    accent: "#e11d48",
    text: "#be123c",
    icon: "#be123c",
  },
  indicators: {
    bg: "linear-gradient(180deg, #fffaf5 0%, #fed7b0 100%)",
    activeBg: "linear-gradient(180deg, #ffffff 0%, #fff4e8 100%)",
    border: "#fed7aa",
    accent: "#f97316",
    text: "#9a3412",
    icon: "#c2410c",
  },
  instructions1: {
    bg: "linear-gradient(180deg, #f8feff 0%, #c8f3f4 100%)",
    activeBg: "linear-gradient(180deg, #ffffff 0%, #ecfeff 100%)",
    border: "#a5f3fc",
    accent: "#06b6d4",
    text: "#0e7490",
    icon: "#0891b2",
  },
  instructions2: {
    bg: "linear-gradient(180deg, #ffffff 0%, #edf2f7 100%)",
    activeBg: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
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
