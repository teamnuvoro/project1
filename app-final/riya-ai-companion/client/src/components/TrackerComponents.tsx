import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

/**
 * SummaryCard Props
 */
export interface SummaryCardProps {
  title: string;
  content: string | undefined | null;
  icon: string;
  color: string;
  borderColor: string;
}

/**
 * SummaryCard Component (Memoized)
 * Displays a colored card with icon, title, and content
 */
export const SummaryCard = memo(function SummaryCard({ 
  title, 
  content, 
  icon, 
  color, 
  borderColor 
}: SummaryCardProps) {
  return (
    <Card 
      className={`${color} ${borderColor} border-l-4 shadow-sm`}
      data-testid={`summary-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-4">
        <div className="text-3xl mb-2">{icon}</div>
        <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">
          {title}
        </h3>
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {content || "Not yet determined"}
        </p>
      </CardContent>
    </Card>
  );
});

/**
 * Tag Props
 */
export interface TagProps {
  label: string;
  color: "purple" | "blue" | "green" | "orange" | "pink" | "teal";
  icon: string;
}

/**
 * Color mapping for Tag component
 */
const tagColorMap = {
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800",
};

/**
 * Tag Component (Memoized)
 * Displays a pill-shaped badge with icon and label
 */
export const Tag = memo(function Tag({ label, color, icon }: TagProps) {
  const colorClasses = tagColorMap[color] || tagColorMap.purple;
  
  return (
    <Badge 
      className={`${colorClasses} px-3 py-1.5 text-sm font-medium border`}
      data-testid={`tag-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <span className="mr-1.5">{icon}</span>
      {label}
    </Badge>
  );
});

/**
 * TagList Props
 */
export interface TagListProps {
  items: string[] | null | undefined;
  color: "purple" | "blue" | "green" | "orange" | "pink" | "teal";
  icon: string;
  testIdPrefix?: string;
}

/**
 * TagList Component (Memoized)
 * Displays a list of tags with consistent styling
 */
export const TagList = memo(function TagList({ items, color, icon, testIdPrefix = "tag" }: TagListProps) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
        No data available yet
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, idx) => (
        <Tag 
          key={idx} 
          label={item} 
          color={color} 
          icon={icon}
        />
      ))}
    </div>
  );
});

/**
 * ExplorationBox Props
 */
export interface ExplorationBoxProps {
  title: string;
  items: string[] | null | undefined;
  icon: string;
  gradientFrom?: string;
  gradientTo?: string;
}

/**
 * ExplorationBox Component (Memoized)
 * Container with gradient background showing list of items
 */
export const ExplorationBox = memo(function ExplorationBox({ 
  title, 
  items, 
  icon,
  gradientFrom = "from-purple-50",
  gradientTo = "to-blue-50"
}: ExplorationBoxProps) {
  const hasItems = items && items.length > 0;

  return (
    <div 
      className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4`}
      data-testid={`exploration-box-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
          {title}
        </h3>
      </div>
      
      {hasItems ? (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div 
              key={idx} 
              className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
              data-testid={`exploration-item-${idx}`}
            >
              <ChevronRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
          Keep chatting to discover more topics to explore
        </p>
      )}
    </div>
  );
});

/**
 * StatBox Props
 */
export interface StatBoxProps {
  label: string;
  value: string | number | null | undefined;
  gradient?: string;
}

/**
 * StatBox Component (Memoized)
 * Colorful gradient box with large value and small label
 */
export const StatBox = memo(function StatBox({ 
  label, 
  value,
  gradient = "from-blue-500 to-purple-500"
}: StatBoxProps) {
  const displayValue = value ?? "—";

  return (
    <div 
      className={`bg-gradient-to-br ${gradient} rounded-xl p-4 text-center shadow-md`}
      data-testid={`stat-box-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <p className="text-2xl md:text-3xl font-bold text-white mb-1">
        {displayValue}
      </p>
      <p className="text-xs text-white/80 font-medium uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
});

/**
 * StatBoxSmall Props - for inline stats
 */
export interface StatBoxSmallProps {
  label: string;
  value: string | number | null | undefined;
  icon?: string;
}

/**
 * StatBoxSmall Component (Memoized)
 * Smaller version of StatBox for grid layouts
 */
export const StatBoxSmall = memo(function StatBoxSmall({ label, value, icon }: StatBoxSmallProps) {
  const displayValue = value ?? "—";

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardContent className="p-3 text-center">
        {icon && <span className="text-lg mb-1 block">{icon}</span>}
        <p className="text-xl font-bold text-gray-900 dark:text-white">
          {displayValue}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {label}
        </p>
      </CardContent>
    </Card>
  );
});

/**
 * ProgressRing Props
 */
export interface ProgressRingProps {
  value: number;
  maxValue?: number;
  size?: "sm" | "md" | "lg";
  gradientId?: string;
  showLabel?: boolean;
}

/**
 * Size mapping for ProgressRing
 */
const ringSizeMap = {
  sm: { container: "w-20 h-20", text: "text-lg", subtext: "text-[10px]" },
  md: { container: "w-28 h-28", text: "text-2xl", subtext: "text-xs" },
  lg: { container: "w-36 h-36", text: "text-3xl", subtext: "text-sm" },
};

/**
 * ProgressRing Component (Memoized)
 * Circular progress indicator with gradient
 */
export const ProgressRing = memo(function ProgressRing({ 
  value, 
  maxValue = 75, 
  size = "md",
  gradientId = "progressRingGradient",
  showLabel = true
}: ProgressRingProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const strokeDasharray = percentage * 2.64;
  const sizeClasses = ringSizeMap[size];

  return (
    <div className={`relative ${sizeClasses.container} flex-shrink-0`}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-purple-100 dark:text-purple-900/50"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke={`url(#${gradientId})`}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${strokeDasharray} 264`}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${sizeClasses.text} font-bold text-gray-900 dark:text-white`}>
            {Math.round(value)}%
          </span>
          <span className={`${sizeClasses.subtext} text-gray-500 dark:text-gray-400`}>
            of {maxValue}%
          </span>
        </div>
      )}
    </div>
  );
});

/**
 * SectionHeader Props
 */
export interface SectionHeaderProps {
  title: string;
  icon: string;
  subtitle?: string;
}

/**
 * SectionHeader Component (Memoized)
 * Consistent section header with icon and optional subtitle
 */
export const SectionHeader = memo(function SectionHeader({ title, icon, subtitle }: SectionHeaderProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h2 className="font-bold text-lg text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">
          {subtitle}
        </p>
      )}
    </div>
  );
});

/**
 * EmptyState Props
 */
export interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
}

/**
 * EmptyState Component (Memoized)
 * Placeholder when no data is available
 */
export const EmptyState = memo(function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-8 text-center"
      data-testid="empty-state"
    >
      <span className="text-4xl mb-3 opacity-50">{icon}</span>
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        {description}
      </p>
    </div>
  );
});

/**
 * TrackerSkeleton Component
 * Loading skeleton for the tracker page
 */
export function TrackerSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-28 h-28 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
