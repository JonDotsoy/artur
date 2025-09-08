import fs from "fs";

export const workspacesUrl = new URL(`../__workspaces__/`, import.meta.url);

fs.mkdirSync(workspacesUrl, { recursive: true });
fs.writeFileSync(new URL(".gitignore", workspacesUrl), `*`);
