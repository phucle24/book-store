"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  console.error(error);

  return (
    <html lang="vi">
      <body>
        <main
          style={{
            minHeight: "100vh",
            background: "#fbf7ef",
            color: "#1c1917",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            fontFamily:
              'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
          }}
        >
          <section
            style={{
              maxWidth: "640px",
              border: "1px solid #e7e5e4",
              borderRadius: "28px",
              background: "#fff",
              padding: "32px",
              boxShadow: "0 10px 30px rgba(28, 25, 23, 0.08)",
            }}
          >
            <p style={{ margin: 0, color: "#92400e", fontWeight: 700 }}>
              Có lỗi xảy ra
            </p>
            <h1 style={{ margin: "16px 0 0", fontSize: "32px", lineHeight: 1.15 }}>
              Website đang gặp lỗi tạm thời.
            </h1>
            <p style={{ margin: "16px 0 0", color: "#57534e", lineHeight: 1.7 }}>
              Hãy thử tải lại trang sau vài giây.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "28px",
                border: 0,
                borderRadius: "999px",
                background: "#92400e",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
                padding: "12px 20px",
              }}
            >
              Thử lại
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
