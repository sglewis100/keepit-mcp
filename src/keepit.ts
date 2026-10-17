import { runAppleScript, runJXA, escapeAppleScriptString } from "./applescript.js";

export interface KeepItItemSummary {
  id: string;
  name: string;
  kind: string | null;
  size: number;
  addedDate: string | null;
  modifiedDate: string | null;
  isFavorite: boolean;
  folder: string | null;
  tagNames: string[];
  link: string;
}

export interface KeepItItemDetail extends KeepItItemSummary {
  createdDate: string | null;
  isDeleted: boolean;
  isEditableText: boolean;
  comments: string | null;
  source: string | null;
  filePath: string | null;
  textContent: string | null;
}

export interface FolderSummary {
  id: string;
  name: string;
  isFavorite: boolean;
  isDeleted: boolean;
}

export interface BundleSummary {
  id: string;
  name: string;
  link: string;
}

export interface TagSummary {
  id: string;
  name: string;
}

export class KeepItService {
  /**
   * Search items in Keep It with optional filters.
   */
  async searchItems(options: {
    query?: string;
    folder?: string;
    bundle?: string;
    tag?: string;
    isFavorite?: boolean;
    limit?: number;
  }): Promise<KeepItItemSummary[]> {
    const script = `
      (function() {
        const keepit = Application("Keep It");
        const all = keepit.keepItItems();
        const results = [];
        const limit = ${options.limit && options.limit > 0 ? Math.min(options.limit, 200) : 50};
        const query = ${options.query ? JSON.stringify(options.query.toLowerCase()) : "null"};
        const targetFolder = ${options.folder ? JSON.stringify(options.folder.toLowerCase()) : "null"};
        const targetBundle = ${options.bundle ? JSON.stringify(options.bundle.toLowerCase()) : "null"};
        const targetTag = ${options.tag ? JSON.stringify(options.tag.toLowerCase()) : "null"};
        const favFilter = ${options.isFavorite !== undefined ? options.isFavorite : "null"};

        for (let i = 0; i < all.length; i++) {
          const itm = all[i];

          // Skip trash items
          if (itm.isDeleted()) continue;

          if (favFilter !== null && itm.isFavorite() !== favFilter) continue;

          let fName = null;
          try {
            const f = itm.folder();
            if (f) fName = f.name();
          } catch (e) {}

          if (targetFolder && (!fName || fName.toLowerCase() !== targetFolder)) {
            continue;
          }

          const tags = itm.tagNames() || [];
          if (targetTag) {
            const hasTag = tags.some(t => t.toLowerCase() === targetTag);
            if (!hasTag) continue;
          }

          if (targetBundle) {
            let inBundle = false;
            try {
              const bundles = itm.bundles();
              inBundle = bundles.some(b => b.name().toLowerCase() === targetBundle);
            } catch (e) {}
            if (!inBundle) continue;
          }

          const name = itm.name() || "";
          const comments = itm.comments() || "";

          if (query) {
            const matchName = name.toLowerCase().includes(query);
            const matchComments = comments.toLowerCase().includes(query);
            const matchTags = tags.some(t => t.toLowerCase().includes(query));
            if (!matchName && !matchComments && !matchTags) {
              continue;
            }
          }

          results.push({
            id: itm.id(),
            name: name,
            kind: itm.kind(),
            size: itm.size(),
            addedDate: itm.addedDate() ? itm.addedDate().toISOString() : null,
            modifiedDate: itm.modifiedDate() ? itm.modifiedDate().toISOString() : null,
            isFavorite: itm.isFavorite(),
            folder: fName,
            tagNames: tags,
            link: itm.link()
          });

          if (results.length >= limit) break;
        }

        return JSON.stringify(results);
      })();
    `;
    return runJXA<KeepItItemSummary[]>(script);
  }

  /**
   * Get an item by ID or exact Name with full metadata and content.
   */
  async getItem(idOrName: string): Promise<KeepItItemDetail | null> {
    const script = `
      (function() {
        const keepit = Application("Keep It");
        const all = keepit.keepItItems();
        const target = ${JSON.stringify(idOrName)};

        let targetItem = null;
        for (let i = 0; i < all.length; i++) {
          if (all[i].id() === target || all[i].name() === target) {
            targetItem = all[i];
            break;
          }
        }

        if (!targetItem) return JSON.stringify(null);

        let folderName = null;
        try {
          const f = targetItem.folder();
          if (f) folderName = f.name();
        } catch (e) {}

        let filePath = null;
        try {
          const fn = targetItem.filename();
          if (fn) filePath = fn.toString();
        } catch (e) {}

        let textContent = null;
        try {
          if (targetItem.isEditableText()) {
            textContent = targetItem.plainTextContent();
          }
        } catch (e) {}

        const detail = {
          id: targetItem.id(),
          name: targetItem.name(),
          kind: targetItem.kind(),
          size: targetItem.size(),
          addedDate: targetItem.addedDate() ? targetItem.addedDate().toISOString() : null,
          modifiedDate: targetItem.modifiedDate() ? targetItem.modifiedDate().toISOString() : null,
          createdDate: targetItem.createdDate() ? targetItem.createdDate().toISOString() : null,
          isFavorite: targetItem.isFavorite(),
          isDeleted: targetItem.isDeleted(),
          isEditableText: targetItem.isEditableText(),
          comments: targetItem.comments(),
          source: targetItem.source(),
          link: targetItem.link(),
          tagNames: targetItem.tagNames() || [],
          folder: folderName,
          filePath: filePath,
          textContent: textContent
        };

        return JSON.stringify(detail);
      })();
    `;
    return runJXA<KeepItItemDetail | null>(script);
  }

  /**
   * Get the active/frontmost item currently opened in Keep It.
   */
  async getCurrentItem(): Promise<KeepItItemDetail | null> {
    const script = `
      (function() {
        const keepit = Application("Keep It");
        const cur = keepit.currentItem();
        if (!cur) return JSON.stringify(null);
        return JSON.stringify(cur.id());
      })();
    `;
    const curId = await runJXA<string | null>(script);
    if (!curId) return null;
    return this.getItem(curId);
  }

  /**
   * Get currently selected items in Keep It.
   */
  async getSelectedItems(): Promise<KeepItItemSummary[]> {
    const script = `
      (function() {
        const keepit = Application("Keep It");
        const sel = keepit.selectedItems();
        const results = [];
        for (let i = 0; i < sel.length; i++) {
          const itm = sel[i];
          let fName = null;
          try {
            const f = itm.folder();
            if (f) fName = f.name();
          } catch (e) {}
          results.push({
            id: itm.id(),
            name: itm.name(),
            kind: itm.kind(),
            size: itm.size(),
            addedDate: itm.addedDate() ? itm.addedDate().toISOString() : null,
            modifiedDate: itm.modifiedDate() ? itm.modifiedDate().toISOString() : null,
            isFavorite: itm.isFavorite(),
            folder: fName,
            tagNames: itm.tagNames() || [],
            link: itm.link()
          });
        }
        return JSON.stringify(results);
      })();
    `;
    return runJXA<KeepItItemSummary[]>(script);
  }

  /**
   * Create a new Note or Markdown document in Keep It.
   */
  async createNote(options: {
    name?: string;
    text: string;
    format?: "note" | "markdown" | "plain_text" | "rich_text";
    folder?: string;
    bundle?: string;
    tags?: string[];
  }): Promise<{ id: string; name: string; link: string; folder: string | null }> {
    let formatClause = "as note";
    if (options.format === "markdown") formatClause = "as markdown file";
    else if (options.format === "plain_text") formatClause = "as plain text file";
    else if (options.format === "rich_text") formatClause = "as rich text file";

    let targetGroupClause = "";
    if (options.folder) {
      targetGroupClause = `in (first folder whose name is "${escapeAppleScriptString(options.folder)}")`;
    } else if (options.bundle) {
      targetGroupClause = `in (first bundle whose name is "${escapeAppleScriptString(options.bundle)}")`;
    }

    let tagsClause = "";
    if (options.tags && options.tags.length > 0) {
      const tagList = options.tags.map(t => `"${escapeAppleScriptString(t)}"`).join(", ");
      tagsClause = `with tags {${tagList}}`;
    }

    let nameClause = "";
    if (options.name) {
      nameClause = `with name "${escapeAppleScriptString(options.name)}"`;
    }

    const script = `
      tell application "Keep It"
        set newNote to add text "${escapeAppleScriptString(options.text)}" ${nameClause} ${formatClause} ${targetGroupClause} ${tagsClause}
        set fName to ""
        try
          set fName to name of (folder of newNote)
        end try
        return {id of newNote, name of newNote, link of newNote, fName}
      end tell
    `;

    const out = await runAppleScript(script);
    const parts = out.split(", ").map(p => p.trim());
    return {
      id: parts[0] || "",
      name: parts[1] || "",
      link: parts[2] || "",
      folder: parts[3] || null
    };
  }

  /**
   * Append text to an existing editable note/document.
   */
  async appendText(itemId: string, text: string): Promise<boolean> {
    const script = `
      tell application "Keep It"
        set targetItem to first Keep It item whose id is "${escapeAppleScriptString(itemId)}"
        add text "
${escapeAppleScriptString(text)}" to item targetItem
        return true
      end tell
    `;
    await runAppleScript(script);
    return true;
  }

  /**
   * Add a web link to Keep It.
   */
  async addLink(options: {
    url: string;
    name?: string;
    folder?: string;
    bundle?: string;
    tags?: string[];
    saveForOffline?: boolean;
    format?: "single_page_pdf" | "paginated_pdf" | "web_archive";
  }): Promise<boolean> {
    let nameClause = "";
    if (options.name) {
      nameClause = `with name "${escapeAppleScriptString(options.name)}"`;
    }

    let offlineClause = "";
    if (options.saveForOffline !== undefined) {
      offlineClause = `save for offline ${options.saveForOffline}`;
    }

    let formatClause = "";
    if (options.format === "single_page_pdf") {
      formatClause = "as single page PDF";
    } else if (options.format === "paginated_pdf") {
      formatClause = "as paginated PDF";
    } else if (options.format === "web_archive") {
      formatClause = "as web archive";
    }

    let targetGroupClause = "";
    if (options.folder) {
      targetGroupClause = `to (first folder whose name is "${escapeAppleScriptString(options.folder)}")`;
    } else if (options.bundle) {
      targetGroupClause = `to (first bundle whose name is "${escapeAppleScriptString(options.bundle)}")`;
    }

    let tagsClause = "";
    if (options.tags && options.tags.length > 0) {
      const tagList = options.tags.map(t => `"${escapeAppleScriptString(t)}"`).join(", ");
      tagsClause = `with tags {${tagList}}`;
    }

    const script = `
      tell application "Keep It"
        add link "${escapeAppleScriptString(options.url)}" ${nameClause} ${offlineClause} ${formatClause} ${targetGroupClause} ${tagsClause}
        return true
      end tell
    `;

    await runAppleScript(script);
    return true;
  }

  /**
   * Import a local file into Keep It.
   */
  async importFile(options: {
    filePath: string;
    folder?: string;
    bundle?: string;
    tags?: string[];
  }): Promise<boolean> {
    let targetGroupClause = "";
    if (options.folder) {
      targetGroupClause = `to (first folder whose name is "${escapeAppleScriptString(options.folder)}")`;
    } else if (options.bundle) {
      targetGroupClause = `to (first bundle whose name is "${escapeAppleScriptString(options.bundle)}")`;
    }

    let tagsClause = "";
    if (options.tags && options.tags.length > 0) {
      const tagList = options.tags.map(t => `"${escapeAppleScriptString(t)}"`).join(", ");
      tagsClause = `with tags {${tagList}}`;
    }

    const script = `
      tell application "Keep It"
        set srcFile to POSIX file "${escapeAppleScriptString(options.filePath)}"
        add files {srcFile} ${targetGroupClause} ${tagsClause}
        return true
      end tell
    `;

    await runAppleScript(script);
    return true;
  }

  /**
   * List all folders in Keep It.
   */
  async listFolders(): Promise<FolderSummary[]> {
    const script = `
      (function() {
        const keepit = Application("Keep It");
        const folders = keepit.folders();
        const results = folders.map(f => ({
          id: f.id(),
          name: f.name(),
          isFavorite: f.isFavorite(),
          isDeleted: f.isDeleted()
        }));
        return JSON.stringify(results);
      })();
    `;
    return runJXA<FolderSummary[]>(script);
  }

  /**
   * List all bundles in Keep It.
   */
  async listBundles(): Promise<BundleSummary[]> {
    const script = `
      (function() {
        const keepit = Application("Keep It");
        const bundles = keepit.bundles();
        const results = bundles.map(b => ({
          id: b.id(),
          name: b.name(),
          link: b.link()
        }));
        return JSON.stringify(results);
      })();
    `;
    return runJXA<BundleSummary[]>(script);
  }

  /**
   * List all tags in Keep It.
   */
  async listTags(): Promise<TagSummary[]> {
    const script = `
      (function() {
        const keepit = Application("Keep It");
        const tags = keepit.tags();
        const results = tags.map(t => ({
          id: t.id(),
          name: t.name()
        }));
        return JSON.stringify(results);
      })();
    `;
    return runJXA<TagSummary[]>(script);
  }

  /**
   * Add tags to an item.
   */
  async addTags(itemId: string, tags: string[]): Promise<boolean> {
    if (!tags.length) return true;
    const tagList = tags.map(t => `"${escapeAppleScriptString(t)}"`).join(", ");
    const script = `
      tell application "Keep It"
        set targetItem to first Keep It item whose id is "${escapeAppleScriptString(itemId)}"
        add tags {${tagList}} to targetItem
        return true
      end tell
    `;
    await runAppleScript(script);
    return true;
  }

  /**
   * Remove tags from an item.
   */
  async removeTags(itemId: string, tags: string[]): Promise<boolean> {
    if (!tags.length) return true;
    const tagList = tags.map(t => `"${escapeAppleScriptString(t)}"`).join(", ");
    const script = `
      tell application "Keep It"
        set targetItem to first Keep It item whose id is "${escapeAppleScriptString(itemId)}"
        remove tags {${tagList}} from targetItem
        return true
      end tell
    `;
    await runAppleScript(script);
    return true;
  }

  /**
   * Move an item to Deleted Items (trash).
   */
  async trashItem(itemId: string): Promise<boolean> {
    const script = `
      tell application "Keep It"
        set targetItem to first Keep It item whose id is "${escapeAppleScriptString(itemId)}"
        move targetItem to deleted items folder
        return true
      end tell
    `;
    await runAppleScript(script);
    return true;
  }
}
