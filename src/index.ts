#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KeepItService } from "./keepit.js";

const keepit = new KeepItService();

const server = new McpServer({
  name: "keepit-mcp",
  version: "1.0.0",
});

// 1. Search items
server.tool(
  "keepit_search_items",
  "Search items in Keep It by text query, folder, bundle, tag, or favorite status.",
  {
    query: z.string().optional().describe("Search text matching name, comments, or tags"),
    folder: z.string().optional().describe("Filter items within this folder name"),
    bundle: z.string().optional().describe("Filter items within this bundle name"),
    tag: z.string().optional().describe("Filter items tagged with this tag"),
    is_favorite: z.boolean().optional().describe("Filter only favorite items"),
    limit: z.number().int().min(1).max(200).optional().default(50).describe("Maximum items to return"),
  },
  async (args) => {
    try {
      const items = await keepit.searchItems({
        query: args.query,
        folder: args.folder,
        bundle: args.bundle,
        tag: args.tag,
        isFavorite: args.is_favorite,
        limit: args.limit,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ count: items.length, items }, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error searching Keep It: ${err.message}` }],
      };
    }
  }
);

// 2. Get item detail
server.tool(
  "keepit_get_item",
  "Get complete metadata, tags, file path, link, and text/markdown content for a Keep It item.",
  {
    item_id_or_name: z.string().describe("The unique ID or exact name of the Keep It item"),
  },
  async (args) => {
    try {
      const item = await keepit.getItem(args.item_id_or_name);
      if (!item) {
        return {
          isError: true,
          content: [{ type: "text", text: `Item "${args.item_id_or_name}" not found in Keep It.` }],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(item, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error retrieving item: ${err.message}` }],
      };
    }
  }
);

// 3. Get current active item
server.tool(
  "keepit_get_current_item",
  "Get the active or frontmost item currently open in Keep It.",
  {},
  async () => {
    try {
      const item = await keepit.getCurrentItem();
      if (!item) {
        return {
          content: [{ type: "text", text: "No item is currently active or open in Keep It." }],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(item, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error getting current item: ${err.message}` }],
      };
    }
  }
);

// 4. Get selected items
server.tool(
  "keepit_get_selected_items",
  "Get the list of currently selected items in Keep It.",
  {},
  async () => {
    try {
      const items = await keepit.getSelectedItems();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ count: items.length, items }, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error getting selected items: ${err.message}` }],
      };
    }
  }
);

// 5. Create note
server.tool(
  "keepit_create_note",
  "Create a new Note or Markdown document in Keep It.",
  {
    text: z.string().describe("The content of the note"),
    name: z.string().optional().describe("Title / display name for the note"),
    format: z
      .enum(["markdown", "note", "plain_text", "rich_text"])
      .optional()
      .default("markdown")
      .describe("Format of note to create"),
    folder: z.string().optional().describe("Target folder name"),
    bundle: z.string().optional().describe("Target bundle name"),
    tags: z.array(z.string()).optional().describe("Tags to apply to the new note"),
  },
  async (args) => {
    try {
      const result = await keepit.createNote({
        text: args.text,
        name: args.name,
        format: args.format,
        folder: args.folder,
        bundle: args.bundle,
        tags: args.tags,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, item: result }, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error creating note: ${err.message}` }],
      };
    }
  }
);

// 6. Append to note
server.tool(
  "keepit_append_to_note",
  "Append text or markdown content to an existing editable Keep It item.",
  {
    item_id: z.string().describe("The ID of the Keep It item to append to"),
    text: z.string().describe("The text to append"),
  },
  async (args) => {
    try {
      await keepit.appendText(args.item_id, args.text);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, item_id: args.item_id }),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error appending text: ${err.message}` }],
      };
    }
  }
);

// 7. Add web link
server.tool(
  "keepit_add_link",
  "Add a web URL into Keep It, optionally saving for offline reading.",
  {
    url: z.string().url().describe("The URL to add"),
    name: z.string().optional().describe("Optional custom name for the bookmark"),
    folder: z.string().optional().describe("Target folder name"),
    bundle: z.string().optional().describe("Target bundle name"),
    tags: z.array(z.string()).optional().describe("Tags for the bookmark"),
    save_for_offline: z.boolean().optional().describe("Whether to save page offline"),
    format: z
      .enum(["single_page_pdf", "paginated_pdf", "web_archive"])
      .optional()
      .describe("Format if saving for offline"),
  },
  async (args) => {
    try {
      await keepit.addLink({
        url: args.url,
        name: args.name,
        folder: args.folder,
        bundle: args.bundle,
        tags: args.tags,
        saveForOffline: args.save_for_offline,
        format: args.format,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, url: args.url }),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error adding link: ${err.message}` }],
      };
    }
  }
);

// 8. Import local file
server.tool(
  "keepit_import_file",
  "Import an existing file from disk into Keep It.",
  {
    file_path: z.string().describe("Absolute file path on your Mac to import"),
    folder: z.string().optional().describe("Destination folder name"),
    bundle: z.string().optional().describe("Destination bundle name"),
    tags: z.array(z.string()).optional().describe("Tags to apply"),
  },
  async (args) => {
    try {
      await keepit.importFile({
        filePath: args.file_path,
        folder: args.folder,
        bundle: args.bundle,
        tags: args.tags,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, filePath: args.file_path }),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error importing file: ${err.message}` }],
      };
    }
  }
);

// 9. List folders
server.tool("keepit_list_folders", "List all folders in Keep It.", {}, async () => {
  try {
    const folders = await keepit.listFolders();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ count: folders.length, folders }, null, 2),
        },
      ],
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error listing folders: ${err.message}` }],
    };
  }
});

// 10. List bundles
server.tool("keepit_list_bundles", "List all bundles in Keep It.", {}, async () => {
  try {
    const bundles = await keepit.listBundles();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ count: bundles.length, bundles }, null, 2),
        },
      ],
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error listing bundles: ${err.message}` }],
    };
  }
});

// 11. List tags
server.tool("keepit_list_tags", "List all tags in Keep It.", {}, async () => {
  try {
    const tags = await keepit.listTags();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ count: tags.length, tags }, null, 2),
        },
      ],
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error listing tags: ${err.message}` }],
    };
  }
});

// 12. Manage tags
server.tool(
  "keepit_manage_tags",
  "Add or remove tags on a specific Keep It item.",
  {
    item_id: z.string().describe("ID of the item"),
    add_tags: z.array(z.string()).optional().describe("Tags to add to the item"),
    remove_tags: z.array(z.string()).optional().describe("Tags to remove from the item"),
  },
  async (args) => {
    try {
      if (args.add_tags && args.add_tags.length > 0) {
        await keepit.addTags(args.item_id, args.add_tags);
      }
      if (args.remove_tags && args.remove_tags.length > 0) {
        await keepit.removeTags(args.item_id, args.remove_tags);
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, item_id: args.item_id }),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error managing tags: ${err.message}` }],
      };
    }
  }
);

// 13. Move item to trash
server.tool(
  "keepit_trash_item",
  "Move an item in Keep It to Deleted Items (trash).",
  {
    item_id: z.string().describe("The ID of the item to move to trash"),
  },
  async (args) => {
    try {
      await keepit.trashItem(args.item_id);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, item_id: args.item_id }),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error moving item to trash: ${err.message}` }],
      };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error starting Keep It MCP server:", error);
  process.exit(1);
});
