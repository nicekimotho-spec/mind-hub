import type { CreateFeedbackRequest } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";

/** Feedback.bookingId is unique — one submission per booking, only after the session
 * actually happened (FR-CLI-10). A booking that never reached COMPLETED (cancelled,
 * no-show, still pending) has nothing to give feedback on. */
export async function submitFeedback(clientId: string, bookingId: string, input: CreateFeedbackRequest) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { feedback: true } });
  if (!booking || booking.clientId !== clientId) {
    throw new NotFoundError("Booking not found");
  }
  if (booking.status !== "COMPLETED") {
    throw new ConflictError(`Feedback can only be submitted for a completed session (status: ${booking.status})`);
  }
  if (booking.feedback) {
    throw new ConflictError("Feedback has already been submitted for this booking");
  }

  return prisma.feedback.create({
    data: { bookingId, clientId, rating: input.rating, comment: input.comment },
  });
}
