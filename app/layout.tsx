import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ReadingProgress } from "@/components/ReadingProgress";
import { organizationSchema, websiteSchema } from "@/lib/schema-org";
import { siteName, siteUrl } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl("/")),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description:
    "Review sách theo cảm xúc, nỗi đau và những câu chuyện đời thường.",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationSchema(), websiteSchema()]),
          }}
        />
        <ReadingProgress />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        {/* Global clipboard handler for .copy-btn elements */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.copy-btn');
  if (!btn) return;
  var text = btn.dataset.copy || btn.closest('[data-copy]')?.dataset.copy || '';
  if (!text) return;
  navigator.clipboard.writeText(text).then(function() {
    var original = btn.textContent;
    btn.textContent = '✓ Đã copy!';
    setTimeout(function() { btn.textContent = original; }, 1800);
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = '✓ Đã copy!';
    setTimeout(function() { btn.textContent = 'Copy caption'; }, 1800);
  });
});
            `.trim(),
          }}
        />
      </body>
    </html>
  );
}
