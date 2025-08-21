# Node.js Image Upload Server

A simple server to upload images and serve them publicly.  

## Features
- Upload images via POST request.  
- Convert images to **JPG or PNG**.  
- Automatically gives each image a **sequential number** as its filename.  
- Access uploaded images at `/images/<filename>`.
- 
## upload

### post to /upload
- with body 
  - image : image file
  - format : png/jpeg/jpg (optional if wanted to convert image format else the image will be stored in original format)

## node_modules

npm intall express multer sharp