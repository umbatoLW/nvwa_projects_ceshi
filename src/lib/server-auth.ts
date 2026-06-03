import { NextRequest } from "next/server";
import { getCurrentUser } from "./auth";

export async function getUserId(req: NextRequest): Promise<string | null> {
  const user = await getCurrentUser(req);
  return user?.id || null;
}
