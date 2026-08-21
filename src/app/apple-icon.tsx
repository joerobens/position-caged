import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon, same mark at touch-icon size. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#12100E",
          padding: "36px 22px",
          position: "relative",
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ height: 3 + i, background: "#5C5044", borderRadius: 4 }} />
        ))}
        <div style={{ position: "absolute", left: 56, top: 20, bottom: 20, width: 5, background: "#4A3F37", borderRadius: 7 }} />
        <div
          style={{
            position: "absolute",
            left: 260,
            top: 196,
            width: 120,
            height: 120,
            borderRadius: 60,
            background: "#4FC7A1",
          }}
        />
      </div>
    ),
    size,
  );
}
