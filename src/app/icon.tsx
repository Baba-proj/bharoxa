import { ImageResponse } from "next/og";

// Replaces the default Next.js favicon with the Bharoxa brand mark — a
// rounded square with a geometric B. Next.js renders
// this at build time and auto-injects <link rel="icon"> into <head>.
//
// This route takes precedence over src/app/favicon.ico, which is the
// Next.js default and can stay on disk harmlessly (or be removed).

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f766e",
          borderRadius: 6,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 5h8c4 0 6 2 6 5 0 2-1 3-3 4 2 1 3 2 3 5 0 4-3 6-7 6H8V5Z" />
          <path d="M12 10h4c2 0 3 1 3 2.5S18 15 16 15h-4m0 4h4c2 0 3-1 3-2.5S18 14 16 14h-4" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
