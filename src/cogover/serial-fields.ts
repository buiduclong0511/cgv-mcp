export const SERIAL_FIELD_BY_OBJECT: Readonly<Record<string, string>> = {
  bug_tracking: "bug_auto_number",
  development_task: "auto_task_id",
  development_subtask: "subtask_auto_id",
};

export function getSerialFieldSlug(objectSlug: string): string | undefined {
  return SERIAL_FIELD_BY_OBJECT[objectSlug];
}
