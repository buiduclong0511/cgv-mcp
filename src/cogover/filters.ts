export type FieldType =
  | "short_text"
  | "long_text"
  | "numeric"
  | "decimal"
  | "rating"
  | "range"
  | "percent"
  | "boolean"
  | "phone"
  | "email"
  | "single_choice"
  | "multi_choices"
  | "date"
  | "date_time"
  | "time"
  | "lookup_normal"
  | "reference"
  | (string & {});

export type FilterOp =
  | "="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "between"
  | "like"
  | "not like"
  | "startsWith"
  | "endsWith"
  | "in"
  | "not in"
  | "is null"
  | "not null";

export interface Filter {
  field: string;
  op: FilterOp;
  params?: unknown;
  fieldType?: FieldType;
}

export const filters = {
  eq: (field: string, value: unknown, fieldType?: FieldType): Filter => ({
    field,
    op: "=",
    params: value,
    fieldType,
  }),
  like: (field: string, value: string, fieldType?: FieldType): Filter => ({
    field,
    op: "like",
    params: value,
    fieldType,
  }),
  inOp: (field: string, values: unknown[], fieldType?: FieldType): Filter => ({
    field,
    op: "in",
    params: values,
    fieldType,
  }),
};

export type FilterLogic = 1 | 2 | 3;
