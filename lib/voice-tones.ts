import { slugify } from "@/lib/slugify";

export const VOICE_TONE_AUTO = "AUTO";

export const voiceToneProfiles = [
  {
    id: VOICE_TONE_AUTO,
    name: "AI tự chọn theo sách",
    shortDescription: "Phù hợp khi muốn mỗi bài tự có sắc thái riêng.",
    prompt:
      "Tự chọn giọng phù hợp nhất với sách, nỗi đau người đọc và dữ liệu nguồn. Không lặp lại cấu trúc/cách nói của các bài trước.",
  },
  {
    id: "WARM_STORY",
    name: "Ấm áp, kể chuyện",
    shortDescription: "Hợp sách chữa lành, mất phương hướng, burnout, cô đơn.",
    prompt:
      "Giọng ấm, chậm, nhiều quan sát đời thường. Mở bài như một lát cắt cuộc sống, ưu tiên cảm xúc thật và sự đồng cảm, không sướt mướt.",
  },
  {
    id: "CLEAR_PRACTICAL",
    name: "Tỉnh táo, thực dụng",
    shortDescription: "Hợp sách thói quen, kỷ luật, tài chính, công việc.",
    prompt:
      "Giọng rõ ràng, thực tế, có tiêu chí đánh giá. Ít bay bổng, nhiều ví dụ áp dụng, chỉ ra nên làm gì và cần cảnh giác điều gì.",
  },
  {
    id: "REFLECTIVE_DEEP",
    name: "Sâu lắng, phản tư",
    shortDescription: "Hợp tâm lý học, overthinking, hướng nội, sách nhiều tầng nghĩa.",
    prompt:
      "Giọng chiêm nghiệm, có chiều sâu, đặt câu hỏi nhiều hơn kết luận vội. Dùng nhịp văn vừa phải, giúp người đọc soi lại chính mình.",
  },
  {
    id: "GENTLE_COACH",
    name: "Gần gũi, động viên",
    shortDescription: "Hợp sinh viên, người mới đi làm, người đang trì hoãn.",
    prompt:
      "Giọng gần gũi như một người anh/chị đi trước. Khích lệ nhỏ, dễ hiểu, không dạy đời, không ép người đọc phải thay đổi ngay.",
  },
] as const;

export type VoiceToneId = (typeof voiceToneProfiles)[number]["id"];

export function resolveVoiceTone({
  tone,
  categoryNames = [],
  painPointNames = [],
  audienceNames = [],
  bookSignals = [],
}: {
  tone?: string | null;
  categoryNames?: string[];
  painPointNames?: string[];
  audienceNames?: string[];
  bookSignals?: string[];
}) {
  const explicit = voiceToneProfiles.find((profile) => profile.id === tone);
  if (explicit && explicit.id !== VOICE_TONE_AUTO) {
    return formatTonePrompt(explicit, "Admin chọn thủ công.");
  }

  const signals = [...categoryNames, ...painPointNames, ...audienceNames, ...bookSignals]
    .map((item) => slugify(item))
    .filter(Boolean);
  const has = (patterns: string[]) =>
    signals.some((signal) => patterns.some((pattern) => signal.includes(pattern)));

  if (
    has([
      "tai-chinh",
      "kinh-doanh",
      "ky-nang",
      "tri-hoan",
      "thieu-ky-luat",
      "ap-luc-cong-viec",
    ])
  ) {
    return formatTonePrompt(voiceToneProfiles[2], "AI chọn vì chủ đề thiên về hành động/thực tế.");
  }

  if (has(["overthinking", "huong-noi", "tam-ly", "thieu-tu-tin"])) {
    return formatTonePrompt(voiceToneProfiles[3], "AI chọn vì chủ đề cần chiều sâu phản tư.");
  }

  if (has(["sinh-vien", "nguoi-moi-di-lam", "giao-vien"])) {
    return formatTonePrompt(voiceToneProfiles[4], "AI chọn vì đối tượng cần giọng gần gũi, dẫn dắt.");
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
    return formatTonePrompt(voiceToneProfiles[1], "AI chọn vì chủ đề cần giọng ấm và đồng cảm.");
  }

  return formatTonePrompt(voiceToneProfiles[1], "AI chọn mặc định cho bài review sách cảm xúc.");
}

function formatTonePrompt(
  profile: (typeof voiceToneProfiles)[number],
  reason: string,
) {
  return `${profile.name}. ${reason} ${profile.prompt} Yêu cầu thêm: tạo nhịp văn và cách mở bài khác những bài template; không dùng cùng một công thức mở đầu cho mọi sách.`;
}
