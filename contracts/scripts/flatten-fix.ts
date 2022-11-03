// var stdin = process.openStdin();

// let data = "";

// stdin.on('data', function(chunk) {
//   data += chunk;
// });

// stdin.on('end', function(chunk) {
//   data += chunk;  
//   let ind = data.indexOf("SPDX-License-Identifier: MIT", 0);
//   let beg = data.slice(0, ind + 5);
//   let end = data.slice(ind + 5, data.length)
//   let allStr = beg + end;
//   console.log(allStr);
// });


function fixFlatten() {
  const fs = require('fs');
  console.log(process.argv[2])
  const data = String(fs.readFileSync(process.argv[2]))
  const ind = data.indexOf("SPDX-License-Identifier: MIT", 0);
  const beg = data.slice(0, ind + 5);
  const end = data.slice(ind + 5, data.length).replace(/SPDX-License-Identifier: MIT/g, "");
  const outData = beg + end;
  let j = outData.length + 1;
  let ncnt = 0;
  while(ncnt < 2) {
    if(outData[j] == "\n") ncnt++;
    j--;
  }  
  let i = 0;
  ncnt = 0;
  while(ncnt < 2) {
    if(outData[i] == "\n") ncnt++;
    i++;
  }  
  fs.writeFileSync(process.argv[2], outData.slice(i, j + 1), "utf8");
}

fixFlatten();