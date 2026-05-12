#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CONFIG_DIR = path.join(os.homedir(), ".cgv-mcp");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

interface Config {
  apiKey: string;
}

function readConfig(): Config | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(data) as Config;
    }
  } catch {
    // Config file corrupted or unreadable
  }
  return null;
}

function writeConfig(config: Config): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

const WORKSPACE_ID = "WSFyWKI6moSXD";
const API_BASE = "https://stringee.cogover.com/bapi/v1/records/list";

interface RecordFilter {
  field: string;
  op: string;
  params: string | string[];
}

interface RecordSort {
  [field: string]: { order: "asc" | "desc" };
}

interface FetchRecordsParams {
  objectSlug: string;
  filters: RecordFilter[];
  type?: number;
  logicSequence?: string;
  fields?: string[];
  sorts?: RecordSort[];
  size?: number;
}

async function fetchRecords(
  apiKey: string,
  params: FetchRecordsParams
): Promise<unknown> {
  const body = {
    order_direction: "next",
    workspace_id: WORKSPACE_ID,
    size: params.size ?? 1,
    search_after: [],
    logic_sequence: params.logicSequence ?? "",
    show_detail_on_record: false,
    filters: params.filters,
    type: params.type ?? 1,
    object_slug: params.objectSlug,
    ...(params.fields ? { fields: params.fields } : {}),
    ...(params.sorts ? { sorts: params.sorts } : {}),
  };

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  return response.json();
}

interface UrlInfo {
  type: "s" | "o";
  objectSlug: string;
  identifier: string;
}

function parseTaskUrl(url: string): UrlInfo | null {
  const parsed = new URL(url);
  const match = parsed.pathname.match(
    /^\/Software\/(s|o)\/([^/]+)\/([^/]+)$/
  );
  if (!match) return null;
  return {
    type: match[1] as "s" | "o",
    objectSlug: match[2],
    identifier: match[3],
  };
}

const server = new McpServer({
  name: "cgv-mcp",
  version: "1.0.0",
});

// Tool: Set API key
server.tool(
  "set_api_key",
  "Save API key for Cogover API authentication",
  {
    api_key: z.string().describe("The API key to store"),
  },
  async ({ api_key }) => {
    writeConfig({ apiKey: api_key });
    return {
      content: [
        {
          type: "text",
          text: "API key saved successfully.",
        },
      ],
    };
  }
);

// Tool: Show API key
server.tool(
  "show_api_key",
  "Show the currently stored API key",
  {},
  async () => {
    const config = readConfig();
    if (!config?.apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "No API key found. Use set_api_key to store one.",
          },
        ],
      };
    }
    const masked =
      config.apiKey.slice(0, 4) + "****" + config.apiKey.slice(-4);
    return {
      content: [
        {
          type: "text",
          text: `Stored API key: ${masked}\nFull key length: ${config.apiKey.length} characters`,
        },
      ],
    };
  }
);

// Tool: Get task from Cogover URL
server.tool(
  "get_task",
  "Get task details from a Cogover URL. Supports /s/ (auto_task_id) and /o/ (id) URL patterns.",
  {
    url: z
      .string()
      .url()
      .describe(
        "Cogover task URL, e.g. https://stringee.cogover.com/Software/s/development_task/SPT-693"
      ),
    fields: z
      .array(z.string())
      .optional()
      .describe("Optional list of fields to return"),
  },
  async ({ url, fields }) => {
    const config = readConfig();
    if (!config?.apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "No API key found. Use set_api_key to store one first.",
          },
        ],
      };
    }

    const urlInfo = parseTaskUrl(url);
    if (!urlInfo) {
      return {
        content: [
          {
            type: "text",
            text: "Invalid URL format. Expected: /Software/s/{object_slug}/{id} or /o/{object_slug}/{id}",
          },
        ],
      };
    }

    const filterField = urlInfo.type === "s" ? "auto_task_id" : "id";
    const data = await fetchRecords(config.apiKey, {
      objectSlug: urlInfo.objectSlug,
      filters: [{ field: filterField, op: "=", params: urlInfo.identifier }],
      fields,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// Tool: Get FE git branches from a task URL
server.tool(
  "get_git_branches",
  "Get FE git branches from a Cogover development task URL. Extracts the task ID and fetches the activity note containing git branch info.",
  {
    url: z
      .string()
      .url()
      .describe(
        "Cogover task URL, e.g. https://stringee.cogover.com/Software/s/development_task/SPT-693"
      ),
  },
  async ({ url }) => {
    const config = readConfig();
    if (!config?.apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "No API key found. Use set_api_key to store one first.",
          },
        ],
      };
    }

    const urlInfo = parseTaskUrl(url);
    if (!urlInfo) {
      return {
        content: [
          {
            type: "text",
            text: "Invalid URL format. Expected: /Software/s/{object_slug}/{id} or /o/{object_slug}/{id}",
          },
        ],
      };
    }

    // Step 1: Resolve task ID
    let taskId: string;
    if (urlInfo.type === "o") {
      taskId = urlInfo.identifier;
    } else {
      const taskData = (await fetchRecords(config.apiKey, {
        objectSlug: urlInfo.objectSlug,
        filters: [
          { field: "auto_task_id", op: "=", params: urlInfo.identifier },
        ],
        fields: ["id"],
      })) as { data?: { rows?: Array<{ id: string }> } };

      const id = taskData.data?.rows?.[0]?.id;
      if (!id) {
        return {
          content: [
            { type: "text", text: `Task not found: ${urlInfo.identifier}` },
          ],
        };
      }
      taskId = id;
    }

    // Step 2: Fetch activity note with git branches
    const data = (await fetchRecords(config.apiKey, {
      objectSlug: "activity",
      filters: [
        { field: "development_task", op: "=", params: taskId },
        { field: "name", op: "like", params: "FE git branches" },
        { field: "content", op: "like", params: "FE git branches" },
        { field: "activity_type", op: "in", params: ["note"] },
      ],
      logicSequence: "((1) AND (2 OR 3)) AND (4)",
      fields: ["content"],
      type: 3,
      sorts: [{ created: { order: "desc" } }],
    })) as { data?: { rows?: Array<{ content: string }> } };

    const contentHtml = data.data?.rows?.[0]?.content;
    if (!contentHtml) {
      return {
        content: [
          { type: "text", text: "No git branches activity found for this task." },
        ],
      };
    }

    return {
      content: [{ type: "text", text: contentHtml }],
    };
  }
);

// Tool: Get bug from Cogover URL
server.tool(
  "get_bug",
  "Get bug details from a Cogover bug_tracking URL. Supports /s/ (bug_auto_number) and /o/ (id) URL patterns.",
  {
    url: z
      .string()
      .url()
      .describe(
        "Cogover bug URL, e.g. https://stringee.cogover.com/Software/s/bug_tracking/SBT-4089"
      ),
    fields: z
      .array(z.string())
      .optional()
      .describe("Optional list of fields to return"),
  },
  async ({ url, fields }) => {
    const config = readConfig();
    if (!config?.apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "No API key found. Use set_api_key to store one first.",
          },
        ],
      };
    }

    const urlInfo = parseTaskUrl(url);
    if (!urlInfo) {
      return {
        content: [
          {
            type: "text",
            text: "Invalid URL format. Expected: /Software/s/{object_slug}/{id} or /o/{object_slug}/{id}",
          },
        ],
      };
    }

    const filterField = urlInfo.type === "s" ? "bug_auto_number" : "id";
    const data = await fetchRecords(config.apiKey, {
      objectSlug: urlInfo.objectSlug,
      filters: [{ field: filterField, op: "=", params: urlInfo.identifier }],
      fields,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Failed to start cgv-mcp server:", error);
  process.exit(1);
});
