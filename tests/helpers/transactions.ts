import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const ROLLBACK_SENTINEL = "__TEST_ROLLBACK__";

export async function runWithRollback<T = void>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let result: T | undefined;

  try {
    await db.$transaction(async (tx) => {
      result = await callback(tx);
      throw new Error(ROLLBACK_SENTINEL);
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== ROLLBACK_SENTINEL) {
      throw error;
    }
  }

  return result as T;
}
