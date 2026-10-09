import { ORPCError } from "@orpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { todo } from "@fixture-full/db/schema/todo";
import { protectedProcedure } from "../index";

export const todoRouter = {
  list: protectedProcedure.handler(({ context }) =>
    context.db.select().from(todo).where(eq(todo.userId, context.session.user.id)).orderBy(desc(todo.createdAt)),
  ),
  create: protectedProcedure
    .input(z.object({ title: z.string().trim().min(1).max(200) }))
    .handler(async ({ input, context }) => {
      const [row] = await context.db.insert(todo).values({ title: input.title, userId: context.session.user.id }).returning();
      if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");
      return row;
    }),
};
