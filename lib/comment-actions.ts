"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { hashIp } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const commentSchema = z.object({
  articleId: z.string().trim().optional(),
  bookId: z.string().trim().optional(),
  name: z.string().trim().min(2, "Vui lòng nhập tên từ 2 ký tự trở lên.").max(50, "Tên quá dài."),
  email: z.string().trim().email("Email không hợp lệ.").optional().or(z.literal("")),
  content: z.string().trim().min(5, "Nội dung nhận xét tối thiểu 5 ký tự.").max(1000, "Nhận xét tối đa 1000 ký tự."),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  badge: z.string().trim().max(30).optional(),
});

const reactionSchema = z.object({
  articleId: z.string().trim().optional(),
  bookId: z.string().trim().optional(),
  type: z.enum(["helpful", "insightful", "bought", "loved"]),
});

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/**
 * Độc giả gửi bình luận / đánh giá bài viết hoặc sách
 */
export async function submitCommentAction(
  prevState: { success?: boolean; error?: string; message?: string } | null,
  formData: FormData
) {
  try {
    const rawData = {
      articleId: formData.get("articleId")?.toString() || undefined,
      bookId: formData.get("bookId")?.toString() || undefined,
      name: formData.get("name")?.toString() || "",
      email: formData.get("email")?.toString() || "",
      content: formData.get("content")?.toString() || "",
      rating: formData.get("rating")?.toString() || "5",
      badge: formData.get("badge")?.toString() || undefined,
    };

    const parsed = commentSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
    }

    const { articleId, bookId, name, email, content, rating, badge } = parsed.data;
    if (!articleId && !bookId) {
      return { success: false, error: "Thiếu thông tin đối tượng bình luận." };
    }

    const clientIp = await getClientIp();
    const ipHash = hashIp(clientIp);

    // Rate limit: tối đa 5 comment trong 5 phút từ 1 IP
    const rateCheck = rateLimit({ key: `comment:${ipHash}`, limit: 5, windowMs: 300_000 });
    if (!rateCheck.ok) {
      return { success: false, error: "Bạn gửi bình luận quá nhanh. Vui lòng thử lại sau vài phút." };
    }

    // Auto-approve bình luận nếu không chứa liên kết spam nguy hiểm
    const hasSpamLink = /https?:\/\/(?!tramdocmotchut\.vn)[^\s]+/i.test(content);
    const isApproved = !hasSpamLink;

    await prisma.comment.create({
      data: {
        articleId,
        bookId,
        name,
        email: email || null,
        content,
        rating,
        badge: badge || null,
        isApproved,
      },
    });

    if (articleId) {
      const article = await prisma.article.findUnique({ where: { id: articleId }, select: { slug: true } });
      if (article) revalidatePath(`/bai-viet/${article.slug}`);
    }
    if (bookId) {
      const book = await prisma.book.findUnique({ where: { id: bookId }, select: { slug: true } });
      if (book) revalidatePath(`/sach/${book.slug}`);
    }

    return {
      success: true,
      message: isApproved
        ? "Cảm ơn bạn đã gửi cảm nhận! Bình luận của bạn đã được đăng."
        : "Cảm ơn bạn! Bình luận của bạn đang được kiểm duyệt và sẽ hiển thị sớm.",
    };
  } catch (error) {
    console.error("Lỗi gửi bình luận:", error);
    return { success: false, error: "Đã có lỗi xảy ra khi gửi bình luận. Vui lòng thử lại sau." };
  }
}

/**
 * Độc giả thả cảm xúc nhanh (Helpful / Insightful / Bought / Loved)
 */
export async function toggleReactionAction(data: {
  articleId?: string;
  bookId?: string;
  type: "helpful" | "insightful" | "bought" | "loved";
}) {
  try {
    const parsed = reactionSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: "Invalid reaction" };

    const { articleId, bookId, type } = parsed.data;
    const clientIp = await getClientIp();
    const ipHash = hashIp(clientIp);

    // Kiểm tra xem IP này đã thả loại cảm xúc này trong 24h chưa
    const existing = await prisma.articleReaction.findFirst({
      where: {
        ipHash,
        type,
        ...(articleId ? { articleId } : { bookId }),
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (existing) {
      return { success: true, alreadyReacted: true };
    }

    await prisma.articleReaction.create({
      data: {
        articleId,
        bookId,
        type,
        ipHash,
      },
    });

    return { success: true, added: true };
  } catch (error) {
    console.error("Lỗi thả cảm xúc:", error);
    return { success: false };
  }
}

/**
 * Độc giả bấm "Hữu ích" cho 1 bình luận
 */
export async function upvoteCommentAction(commentId: string) {
  try {
    const clientIp = await getClientIp();
    const ipHash = hashIp(clientIp);

    const rateCheck = rateLimit({ key: `upvote:${ipHash}:${commentId}`, limit: 1, windowMs: 86_400_000 });
    if (!rateCheck.ok) {
      return { success: false, message: "Bạn đã ghi nhận bình luận này rồi." };
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        helpfulCount: { increment: 1 },
      },
      select: { helpfulCount: true },
    });

    return { success: true, helpfulCount: updated.helpfulCount };
  } catch (error) {
    console.error("Lỗi upvote comment:", error);
    return { success: false };
  }
}

/**
 * Lấy danh sách bình luận đã duyệt và thống kê reaction cho 1 bài viết hoặc sách
 */
export async function getCommentsAndReactions({
  articleId,
  bookId,
}: {
  articleId?: string;
  bookId?: string;
}) {
  const whereTarget = articleId ? { articleId } : { bookId };

  const [comments, reactions] = await Promise.all([
    prisma.comment.findMany({
      where: {
        ...whereTarget,
        isApproved: true,
      },
      orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.articleReaction.groupBy({
      by: ["type"],
      where: whereTarget,
      _count: { type: true },
    }),
  ]);

  const reactionCounts: Record<string, number> = {
    helpful: 0,
    insightful: 0,
    bought: 0,
    loved: 0,
  };

  for (const r of reactions) {
    reactionCounts[r.type] = r._count.type;
  }

  const averageRating =
    comments.length > 0
      ? comments.reduce((acc, curr) => acc + (curr.rating || 5), 0) / comments.length
      : 5;

  return {
    comments,
    reactionCounts,
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews: comments.length,
  };
}

/**
 * Admin: Xóa bình luận
 */
export async function deleteCommentAction(id: string) {
  await requireAdmin();
  await prisma.comment.delete({ where: { id } });
  revalidatePath("/admin/comments");
  return { success: true };
}

/**
 * Admin: Duyệt bình luận
 */
export async function approveCommentAction(id: string) {
  await requireAdmin();
  await prisma.comment.update({
    where: { id },
    data: { isApproved: true },
  });
  revalidatePath("/admin/comments");
  return { success: true };
}
