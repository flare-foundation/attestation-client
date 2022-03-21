import dotenv from "dotenv";

function createBuildFolder() {
    const fs = require('fs');
    const dir = 'build';
    
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
}

createBuildFolder();