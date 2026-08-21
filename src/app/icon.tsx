import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** A slice of neck: six strings, one fret, one root dot. */
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
          padding: "104px 64px",
          position: "relative",
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ height: 8 + i * 2, background: "#5C5044", borderRadius: 4 }} />
        ))}
        <div style={{ position: "absolute", left: 160, top: 56, bottom: 56, width: 14, background: "#4A3F37", borderRadius: 7 }} />
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
