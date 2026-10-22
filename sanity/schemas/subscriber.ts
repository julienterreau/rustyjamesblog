import { defineField, defineType } from "sanity";

export const subscriber = defineType({
  name: "subscriber",
  title: "Abonné",
  type: "document",
  fields: [
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: (rule) => rule.required().email(),
    }),
  ],
  preview: {
    select: { title: "email" },
  },
});
