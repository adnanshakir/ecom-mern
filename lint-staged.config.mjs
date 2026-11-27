import path from "node:path";

const quote = (files) => files.map((file) => `"${file}"`).join(" ");

export default {
  "client/**/*.{js,jsx}": (filenames) => {
    const clientRoot = path.resolve("client");
    const relFiles = filenames.map((file) => path.relative(clientRoot, file));
    return [
      `pnpm --dir client run lint:files -- ${quote(relFiles)}`,
      `pnpm exec prettier --write ${quote(filenames)}`,
    ];
  },
  "server/**/*.js": (filenames) => {
    const serverRoot = path.resolve("server");
    const relFiles = filenames.map((file) => path.relative(serverRoot, file));
    return [
      `pnpm --dir server run lint:files -- ${quote(relFiles)}`,
      `pnpm exec prettier --write ${quote(filenames)}`,
    ];
  },
  "*.{json,md,css}": (filenames) => `pnpm exec prettier --write ${quote(filenames)}`,
  "*.mjs": (filenames) => `pnpm exec prettier --write ${quote(filenames)}`,
};
