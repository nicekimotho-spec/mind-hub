import type { Goal } from "@prisma/client";
import type { CreateGoalRequest, GoalResponse, UpdateGoalRequest } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { NotFoundError } from "../../lib/errors.js";
import { checkShareTarget } from "./sharing.js";

export function toGoalResponse(goal: Goal): GoalResponse {
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    progress: goal.progress,
    sharedWithTherapistId: goal.sharedWithTherapistId,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

async function getOwnGoal(clientId: string, id: string): Promise<Goal> {
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal || goal.clientId !== clientId) {
    throw new NotFoundError("Goal not found");
  }
  return goal;
}

export async function listOwnGoals(clientId: string): Promise<GoalResponse[]> {
  const goals = await prisma.goal.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
  return goals.map(toGoalResponse);
}

export async function createGoal(clientId: string, input: CreateGoalRequest): Promise<GoalResponse> {
  await checkShareTarget(clientId, input.sharedWithTherapistId);
  const goal = await prisma.goal.create({
    data: {
      clientId,
      title: input.title,
      description: input.description || null,
      sharedWithTherapistId: input.sharedWithTherapistId ?? null,
    },
  });
  return toGoalResponse(goal);
}

/** Partial: only the fields present change. Marking a goal achieved also fills its progress. */
export async function updateGoal(clientId: string, id: string, input: UpdateGoalRequest): Promise<GoalResponse> {
  await getOwnGoal(clientId, id);
  await checkShareTarget(clientId, input.sharedWithTherapistId);
  const goal = await prisma.goal.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      status: input.status,
      progress: input.status === "ACHIEVED" ? 100 : input.progress,
      sharedWithTherapistId: input.sharedWithTherapistId,
    },
  });
  return toGoalResponse(goal);
}

export async function deleteGoal(clientId: string, id: string): Promise<void> {
  await getOwnGoal(clientId, id);
  await prisma.goal.delete({ where: { id } });
}
