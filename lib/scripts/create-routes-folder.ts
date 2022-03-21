import dotenv from "dotenv";

function createRoutesFolder() {
    const fs = require('fs');
    const dir = 'routes';
    
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
}

createRoutesFolder();