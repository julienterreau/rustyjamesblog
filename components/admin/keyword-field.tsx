"use client";

import { TextField, useField, useFormFields } from "@payloadcms/ui";
import type { TextFieldClientComponent } from "payload";
import { useEffect, useRef } from "react";
import { suggestKeywords } from "@/lib/keywords";

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

export const KeywordField: TextFieldClientComponent = (props) => {
  const { value, setValue } = useField<string>({ path: props.path });
  const title = useFormFields(([fields]) => asText(fields.title?.value));
  const excerpt = useFormFields(([fields]) => asText(fields.excerpt?.value));
  const suggestions = suggestKeywords(title, excerpt);
  const suggestionText = suggestions.join(", ");
  const automatic = useRef("");

  useEffect(() => {
    if (!suggestionText) return;
    const current = asText(value).trim();
    if (current && current !== automatic.current) return;
    if (current === suggestionText) return;
    automatic.current = suggestionText;
    setValue(suggestionText);
  }, [setValue, suggestionText, value]);

  const currentTags = asText(value)
    .split(",")
    .map((tag) => tag.trim().toLocaleLowerCase("fr-FR"))
    .filter(Boolean);

  function add(keyword: string) {
    const parts = asText(value)
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (parts.some((tag) => tag.toLocaleLowerCase("fr-FR") === keyword.toLocaleLowerCase("fr-FR"))) return;
    const next = [...parts, keyword].join(", ");
    automatic.current = next;
    setValue(next);
  }

  return (
    <div>
      <TextField {...props} />
      {suggestions.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {suggestions.map((keyword) => {
            const selected = currentTags.includes(keyword.toLocaleLowerCase("fr-FR"));
            return (
              <button
                key={keyword}
                type="button"
                onClick={() => add(keyword)}
                style={{
                  border: "1px solid var(--theme-elevation-150, #e7e7e7)",
                  background: selected ? "var(--theme-elevation-800, #161616)" : "transparent",
                  color: selected ? "var(--theme-elevation-0, #fff)" : "inherit",
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {keyword}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
