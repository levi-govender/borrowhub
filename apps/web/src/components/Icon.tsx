import type { SVGProps } from "react";

/**
 * Hand-rolled 24px-grid stroke icons. Inline SVG keeps the bundle dependency
 * free and lets every glyph inherit `currentColor` from its container.
 */
const PATHS = {
  gauge: "M12 14l3.5-3.5M4.5 18a9 9 0 1 1 15 0",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  calendar: "M4 8h16M8 3v3m8-3v3M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  clock: "M12 7v5l3 2M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.1-4.1",
  reset: "M20 12a8 8 0 1 1-2.6-5.9M20 4v4h-4",
  plus: "M12 5v14M5 12h14",
  check: "M4.5 12.5l5 5 10-11",
  alert: "M12 9v4m0 3h.01M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z",
  info: "M12 11v5m0-8.5h.01M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0z",
  close: "M6 6l12 12M18 6 6 18",
  chevronDown: "M6 9.5l6 6 6-6",
  chevronRight: "M9.5 6l6 6-6 6",
  arrowRight: "M4 12h15m-6-6 6 6-6 6",
  sun: "M12 5V3m0 18v-2M5 12H3m18 0h-2M6.3 6.3 4.9 4.9m14.2 14.2-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0z",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z",
  logout: "M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h9",
  phone: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3 15h2",
  monitor: "M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm4 15h8m-4-4v4",
  adapter: "M7 4v5m10-5v5M5 9h14v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5V9zm7 8v4",
  camera: "M3 8h3l1.5-2h9L18 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zm9 3.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  box: "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 0v18m8-13.5L12 12 4 7.5",
  inbox: "M4 13h4l1.5 3h5l1.5-3h4M4 13 6.5 5h11L20 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6z",
  user: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4.5 20a7.5 7.5 0 0 1 15 0",
  shield: "M12 3l7.5 3v5.5c0 4.4-3.1 8.2-7.5 9.5-4.4-1.3-7.5-5.1-7.5-9.5V6L12 3zm-3 9 2.2 2.3L15.5 10",
  bolt: "M13.5 3 5 14h6l-1.5 7L18 10h-6l1.5-7z",
  tag: "M4 10V5a1 1 0 0 1 1-1h5l10 10-6 6L4 10zm3.5-3h.01",
} satisfies Record<string, string>;

export type IconName = keyof typeof PATHS;

type Props = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 16, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

const CATEGORY_ICONS: Record<string, IconName> = {
  phone: "phone",
  monitor: "monitor",
  adapter: "adapter",
  camera: "camera",
};

export function categoryIcon(category: string): IconName {
  return CATEGORY_ICONS[category.toLowerCase()] ?? "box";
}
