import { prisma } from "@/lib/db";

export async function clearUserData() {
  return prisma.$transaction(async (tx) => {
    const countsBefore = {
      purchases: await tx.purchase.count(),
      studySessionCards: await tx.studySessionCard.count(),
      studySessions: await tx.studySession.count(),
      userCharacterProgress: await tx.userCharacterProgress.count(),
      userSettings: await tx.userSetting.count(),
      users: await tx.user.count(),
      characters: await tx.character.count(),
      sections: await tx.section.count(),
    };

    const deletedPurchases = await tx.purchase.deleteMany();
    const deletedStudySessionCards = await tx.studySessionCard.deleteMany();
    const deletedStudySessions = await tx.studySession.deleteMany();
    const deletedProgress = await tx.userCharacterProgress.deleteMany();
    const deletedSettings = await tx.userSetting.deleteMany();
    const deletedUsers = await tx.user.deleteMany();

    return {
      deleted: {
        purchases: deletedPurchases.count,
        studySessionCards: deletedStudySessionCards.count,
        studySessions: deletedStudySessions.count,
        userCharacterProgress: deletedProgress.count,
        userSettings: deletedSettings.count,
        users: deletedUsers.count,
      },
      preserved: {
        characters: countsBefore.characters,
        sections: countsBefore.sections,
      },
    };
  });
}
