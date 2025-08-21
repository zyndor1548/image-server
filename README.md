# Node.js Image Upload Server

A simple server to upload images and serve them publicly.  

## Features
- Upload images via POST request.  
- Convert images to **JPG or PNG**.  
- Automatically gives each image a **sequential number** as its filename.  
- Access uploaded images at `/images/<filename>`.

## node_modules

npm intall express multer sharp