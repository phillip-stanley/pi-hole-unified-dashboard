import * as z from "zod";

export const piholeAuthResponseSchema = z.object({
  session: z.object({
    valid: z.boolean(),
    totp: z.boolean(),
    sid: z.string(),
    csrf: z.string(),
    validity: z.number(),
    message: z.string(),
  }),
  took: z.number(),
});

export type PiholeAuthResponse = z.infer<typeof piholeAuthResponseSchema>;
