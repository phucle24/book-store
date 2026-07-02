import { ArticleType } from "@prisma/client";
import { slugify } from "@/lib/slugify";

export const editorialPersonas = [
  {
    slug: "linh-an",
    name: "Linh An",
    toneId: "WARM_STORY",
    label: "Ấm áp, kể chuyện",
    bio: "Bút danh biên tập cho các bài review thiên về cảm xúc, mất phương hướng, burnout và những giai đoạn cần đọc chậm.",
  },
  {
    slug: "minh-quan",
    name: "Minh Quân",
    toneId: "CLEAR_PRACTICAL",
    label: "Tỉnh táo, thực dụng",
    bio: "Bút danh biên tập cho các bài đọc thực tế về thói quen, kỷ luật, công việc, tài chính và quyết định mua sách rõ ràng hơn.",
  },
  {
    slug: "an-nhien",
    name: "An Nhiên",
    toneId: "REFLECTIVE_DEEP",
    label: "Sâu lắng, phản tư",
    bio: "Bút danh biên tập cho các bài có nhiều câu hỏi nội tâm, tâm lý học, overthinking và nhu cầu hiểu mình sâu hơn.",
  },
  {
    slug: "ha-my",
    name: "Hà My",
    toneId: "GENTLE_COACH",
    label: "Gần gũi, động viên",
    bio: "Bút danh biên tập cho các bài dành cho sinh viên, người mới đi làm và người cần một cú hích nhỏ nhưng không muốn bị dạy đời.",
  },
] as const;

export type EditorialPersona = (typeof editorialPersonas)[number];

export function getEditorialPersonaBySlug(slug?: string | null) {
  return editorialPersonas.find((persona) => persona.slug === slug) || null;
}

export function getEditorialPersonaByTone(toneId?: string | null) {
  return editorialPersonas.find((persona) => persona.toneId === toneId) || null;
}

export function resolveEditorialPersona({
  tone,
  articleType,
  categoryNames = [],
  painPointNames = [],
  audienceNames = [],
  bookSignals = [],
}: {
  tone?: string | null;
  articleType?: ArticleType | string | null;
  categoryNames?: string[];
  painPointNames?: string[];
  audienceNames?: string[];
  bookSignals?: string[];
}) {
  const explicit = getEditorialPersonaBySlug(tone) || getEditorialPersonaByTone(tone);
  if (explicit) return explicit;

  const signals = [...categoryNames, ...painPointNames, ...audienceNames, ...bookSignals]
    .map((item) => slugify(item))
    .filter(Boolean);
  const has = (patterns: string[]) =>
    signals.some((signal) => patterns.some((pattern) => signal.includes(pattern)));

  if (
    articleType === ArticleType.GUIDE ||
    has([
      "tai-chinh",
      "kinh-doanh",
      "ky-nang",
      "tri-hoan",
      "thieu-ky-luat",
      "giao-tiep",
      "cong-so",
      "cong-viec",
      "dac-nhan-tam",
    ])
  ) {
    return editorialPersonas[1];
  }

  if (has(["doi-ngan", "cu-hich"])) {
    return editorialPersonas[3];
  }

  if (
    has([
      "mat-phuong-huong",
      "burnout",
      "co-don",
      "sau-chia-tay",
      "van-hoc-chua-lanh",
    ])
  ) {
    return editorialPersonas[0];
  }

  if (articleType === ArticleType.TOP_LIST) {
    return editorialPersonas[1];
  }

  if (has(["sinh-vien", "nguoi-moi-di-lam", "giao-vien"])) {
    return editorialPersonas[3];
  }

  if (has(["overthinking", "huong-noi", "tam-ly", "thieu-tu-tin", "dam-bi-ghet"])) {
    return editorialPersonas[2];
  }

  return editorialPersonas[0];
}

export function articleAuthorData(persona: EditorialPersona) {
  return {
    authorName: persona.name,
    authorSlug: persona.slug,
    authorBio: persona.bio,
    voiceTone: persona.toneId,
  };
}
