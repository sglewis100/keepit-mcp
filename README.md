# Keep It MCP Server

A high-performance Model Context Protocol (MCP) server for **Keep It for Mac**, exposing your Keep It library, notes, folders, and tags to AI agents in Antigravity and Claude Desktop.

---

## Warning!

This is useful to me, minimally tested, and almost exclusively vibe-coded.

---

## Features & Tools

| Tool | Description |
| :--- | :--- |
| `keepit_search_items` | Search items across title, comments, and tags with optional filtering by folder, bundle, or favorite status. |
| `keepit_get_item` | Retrieve complete item metadata, tags, file path, link, and text/markdown content. |
| `keepit_get_current_item` | Fetch the frontmost / active item currently open in Keep It. |
| `keepit_get_selected_items` | Fetch all items currently selected in the Keep It window. |
| `keepit_create_note` | Create a new Note, Markdown, or Plain Text document in a target folder/bundle with tags. |
| `keepit_append_to_note` | Append text or markdown sections to an existing note or document. |
| `keepit_add_link` | Save web bookmarks, offline single-page PDFs, paginated PDFs, or web archives into Keep It. |
| `keepit_import_file` | Import a local file from disk directly into Keep It with folder and tags. |
| `keepit_list_folders` | List all folders in your Keep It library. |
| `keepit_list_bundles` | List all bundles. |
| `keepit_list_tags` | List all available tags. |
| `keepit_manage_tags` | Add and/or remove tags on an item. |
| `keepit_trash_item` | Move an item to Deleted Items (trash). |

---

## Architecture

* **Runtime**: Node.js (v18+) with TypeScript.
* **Bridge**: macOS ScriptingBridge & AppleScript (`osascript`) via secure standard input pipes (no shell escaping vulnerabilities).
* **Speed**: Fast initialization (~40ms) using compiled ES modules and JXA native JSON serialization.

---

## Configuration

### Antigravity (`~/.gemini/config/mcp_config.json`)
```json
{
  "mcpServers": {
    "keepit": {
      "command": "node",
      "args": ["/Users/scott/Desktop/keepit-mcp/dist/index.js"]
    }
  }
}
```

### Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "keepit": {
      "command": "node",
      "args": ["/Users/scott/Desktop/keepit-mcp/dist/index.js"]
    }
  }
}
```

---

## Development & Building

```bash
cd ~/Desktop/keepit-mcp
npm install
npm run build
```
