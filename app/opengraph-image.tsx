import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/core/seo/site";

export const runtime = "nodejs";
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social card, generated rather than shipped as a binary so it never drifts
 * from the product name or tagline. Twitter cards were set to
 * summary_large_image with no image to serve, which renders bare.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#faf7f5",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* Faint board grid, so the card reads as a canvas at a glance. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #d8cfc9 1px, transparent 0)",
            backgroundSize: "34px 34px",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#c0603a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            W
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, color: "#2b2119", display: "flex" }}>
            <span>White</span>
            <span style={{ color: "#c0603a" }}>Wire</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: "#2b2119",
              lineHeight: 1.1,
              maxWidth: 900,
              display: "flex",
            }}
          >
            {SITE_TAGLINE}
          </div>
          <div style={{ fontSize: 30, color: "#6b5d54", maxWidth: 880, display: "flex" }}>
            Ideas become boards, wireframes, schemas and docs — on one canvas.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              background: "#c0603a",
              color: "white",
              fontSize: 24,
              display: "flex",
            }}
          >
            Bring your own LLM
          </div>
          <div style={{ fontSize: 24, color: "#6b5d54", display: "flex" }}>
            Your keys · Your data · Your freedom
          </div>
        </div>
      </div>
    ),
    size,
  );
}
