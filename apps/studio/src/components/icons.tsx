// 16px stroke icons, currentColor.
interface IIcon {
  d: string;
  fill?: boolean;
}
const I = (props: IIcon) => {
  const { d, fill } = props;
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
};

export const Play = () => (
  <I fill d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.3-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5Z" />
);
export const Stop = () => (
  <I fill d="M4 3h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
);
export const Plus = () => <I d="M8 3v10M3 8h10" />;
export const Copy = () => (
  <I d="M5.5 5.5V3.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M3.5 5.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z" />
);
export const Upload = () => (
  <I d="M8 10.5V2.5M5 5.5l3-3 3 3M2.5 10v2.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V10" />
);
export const Download = () => (
  <I d="M8 2.5v8M5 7.5l3 3 3-3M2.5 10v2.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V10" />
);
export const X = () => <I d="M4 4l8 8M12 4l-8 8" />;
export const Sun = () => (
  <I d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
);
export const Moon = () => <I d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />;
export const Monitor = () => (
  <I d="M2.5 3h11a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM6 14h4M8 11.5V14" />
);
export const Bolt = () => <I fill d="M9.2 1.5 3.5 9h3.8l-.9 5.5L12.5 7H8.6l.6-5.5Z" />;
