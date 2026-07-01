import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth-token";

export async function requireAdminApi() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const valid = await verifyAdminSessionToken(token);

  if (!valid) {
    return NextResponse.json(
      { error: "Bạn cần đăng nhập admin để dùng chức năng này." },
      { status: 401 },
    );
  }

  return null;
}
