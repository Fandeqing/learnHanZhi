import { hashAppleSubject } from "@/lib/apple-account";
import { prisma } from "@/lib/db";

export async function deleteAccount(userId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { appleSubject: true },
    });

    if (user.appleSubject) {
      await tx.purchase.updateMany({
        where: { userId },
        data: { appleSubjectHash: hashAppleSubject(user.appleSubject) },
      });
    }

    await tx.user.delete({ where: { id: userId } });
    return { deleted: true };
  });
}
