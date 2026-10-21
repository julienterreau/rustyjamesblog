"use client";

import { themesForTags } from "@/lib/themes";
import { useEffect, useRef } from "react";
import { set, useFormValue, type ArrayOfObjectsInputProps } from "sanity";

type ReferenceValue = { _key?: string; _type?: string; _ref?: string };

function tagNames(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function referenceKey(value: ReferenceValue[]) {
  return value
    .map((item) => item._ref ?? "")
    .filter(Boolean)
    .join("|");
}

function categoryReferences(tags: string[]): ReferenceValue[] {
  return themesForTags(tags).map((theme) => ({
    _key: theme.id,
    _type: "reference",
    _ref: `category-${theme.id}`,
  }));
}

export function CategoriesInput(props: ArrayOfObjectsInputProps) {
  const tags = tagNames(useFormValue(["tags"]));
  const legacyHtml = useFormValue(["legacyHtml"]);
  const auto = useRef<string | null>(null);
  const value = (props.value ?? []) as ReferenceValue[];
  const { onChange } = props;

  useEffect(() => {
    if (typeof legacyHtml === "string" && legacyHtml.length > 0) return;
    const desired = categoryReferences(tags);
    const desiredKey = desired.map((item) => item._ref).join("|");
    const currentKey = referenceKey(value);
    if (auto.current === "manual") return;
    if (auto.current === null && currentKey && currentKey !== desiredKey) {
      auto.current = "manual";
      return;
    }
    if (currentKey === desiredKey) {
      auto.current = desiredKey;
      return;
    }
    if (auto.current !== null && auto.current !== currentKey) {
      auto.current = "manual";
      return;
    }
    auto.current = desiredKey;
    onChange(set(desired));
  }, [tags, legacyHtml, value, onChange]);

  return props.renderDefault(props);
}
