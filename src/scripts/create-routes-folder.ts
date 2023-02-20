import fs from "fs";

function createRoutesFolder() {
  const dir = "routes";

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

createRoutesFolder();
