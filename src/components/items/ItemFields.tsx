"use client";

import { useId, type ReactNode } from "react";

import { CodeEditor } from "@/components/items/CodeEditor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  hasEditableField,
  usesCodeEditor,
  type ItemTypeName,
} from "@/lib/constants/item-types";

/**
 * The writable fields of an item, all strings — an empty one means "nothing
 * here", which the schema turns into `null`. Tags are comma-separated and split
 * on submit, then normalized again server-side.
 */
export interface ItemFormValues {
  title: string;
  description: string;
  content: string;
  language: string;
  url: string;
  tags: string;
}

export const EMPTY_ITEM_FORM: ItemFormValues = {
  title: "",
  description: "",
  content: "",
  language: "",
  url: "",
  tags: "",
};

/**
 * The editable fields for one item type, shared by the create dialog and the
 * drawer's edit form.
 *
 * Which type-specific inputs appear is read from `ITEM_TYPE_EDITABLE_FIELDS`,
 * the same table both write paths check — so a form cannot offer a field the
 * write would discard. Shared rather than written twice for the same reason
 * that table exists at all: two copies of the gate would eventually disagree.
 */
export function ItemFields({
  values,
  type,
  disabled,
  onChange,
  autoFocus = false,
  urlRequired = false,
}: {
  values: ItemFormValues;
  type: ItemTypeName;
  disabled: boolean;
  onChange: (field: keyof ItemFormValues, value: string) => void;
  autoFocus?: boolean;
  /** Creating a link needs one; editing still allows clearing it */
  urlRequired?: boolean;
}) {
  // Both forms can be mounted at once, and a duplicated `id` would point every
  // label at whichever input rendered first
  const id = useId();

  return (
    <div className="space-y-5">
      <Field htmlFor={`${id}-title`} label="Title">
        <Input
          id={`${id}-title`}
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          disabled={disabled}
          required
          autoFocus={autoFocus}
          placeholder="What is this called?"
        />
      </Field>

      <Field htmlFor={`${id}-description`} label="Description">
        <Textarea
          id={`${id}-description`}
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          disabled={disabled}
          rows={2}
          placeholder="What is this for?"
        />
      </Field>

      {hasEditableField(type, "content") &&
        (usesCodeEditor(type) ? (
          // Code types get the editor; prose types keep the textarea. The
          // language field below feeds it live, so highlighting follows what is
          // typed there
          <Field label="Content">
            <CodeEditor
              value={values.content}
              language={values.language || null}
              onChange={(next) => onChange("content", next)}
              readOnly={disabled}
              ariaLabel="Content"
            />
          </Field>
        ) : (
          <Field htmlFor={`${id}-content`} label="Content">
            <Textarea
              id={`${id}-content`}
              value={values.content}
              onChange={(event) => onChange("content", event.target.value)}
              disabled={disabled}
              rows={12}
              spellCheck={false}
              className="font-mono text-xs leading-relaxed"
            />
          </Field>
        ))}

      {hasEditableField(type, "language") && (
        <Field htmlFor={`${id}-language`} label="Language">
          <Input
            id={`${id}-language`}
            value={values.language}
            onChange={(event) => onChange("language", event.target.value)}
            disabled={disabled}
            placeholder="typescript"
          />
        </Field>
      )}

      {hasEditableField(type, "url") && (
        <Field htmlFor={`${id}-url`} label="URL">
          <Input
            id={`${id}-url`}
            type="url"
            value={values.url}
            onChange={(event) => onChange("url", event.target.value)}
            disabled={disabled}
            required={urlRequired}
            placeholder="https://example.com"
          />
        </Field>
      )}

      <Field
        htmlFor={`${id}-tags`}
        label="Tags"
        hint="Separated by commas. Tags are stored in lower case."
      >
        <Input
          id={`${id}-tags`}
          value={values.tags}
          onChange={(event) => onChange("tags", event.target.value)}
          disabled={disabled}
          placeholder="react, hooks"
        />
      </Field>
    </div>
  );
}

export function Field({
  htmlFor,
  label,
  hint,
  children,
}: {
  /** Omitted when the control owns its own labelling, as Monaco does */
  htmlFor?: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {htmlFor ? (
        <Label htmlFor={htmlFor}>{label}</Label>
      ) : (
        // A caption rather than a <label>: there is no id to point `for` at,
        // because Monaco creates its own textarea. That control is named by the
        // `aria-label` the editor is given instead.
        <span className="text-sm leading-none font-medium select-none">
          {label}
        </span>
      )}
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
