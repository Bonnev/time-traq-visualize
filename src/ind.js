const fs = require('fs');

const historyDir = "C:\\Users\\Bonny Piggov\\Desktop\\Projects\\time-traq-visualize\\.history\\"

const files = fs.readdirSync(historyDir);

//listing all files using forEach
files.forEach(function (file) {
    // Do whatever you want to do with the file
    console.log(file, fs.lstatSync(historyDir+file).isDirectory() ); 
});