# Z-Frame Image Server

A secure image hosting server with user authentication and a modern web interface.

## Features

- **User Authentication** - Token-based authentication for secure uploads
- **Web Interface** - Beautiful dashboard to manage your images
- **Multiple Formats** - Upload and convert images to JPG, PNG, or WebP
- **Auto Format Detection** - Access images without specifying file extension
- **Image Management** - View, download, and delete your uploaded images
- **API Access** - Full REST API for integration with other apps

## Installation

1. Install dependencies:
```bash
npm install express multer sharp
```

2. Start the server:
```bash
node server.js
```
## Usage

### Web Interface

1. **Login** - Sign in with your username and password
2. **Generate Token** - Create an API token in the Dashboard
3. **Upload Images** - Drag and drop or click to select images
4. **View Gallery** - Browse and manage all your uploaded images

### API Endpoints

#### Upload Image
```
POST /upload
Body (multipart/form-data):
  - image: image file
  - token: your API token
  - format: jpg/png/webp (optional, converts image format)

Response:
  {
    "success": true,
    "data": {
      "filename": "1_7"
    }
  }
```

#### Get Image
```
GET /image/:filename

Example: /image/1_7
(Automatically serves the correct format - jpg, png, or webp)
```

#### Delete Image
```
DELETE /delete_image
Body (JSON):
  - token: your API token
  - filename: filename

Response:
  {
    "success": true,
    "data": {
      "message": "Image deleted successfully"
    }
  }
```
#### Create User
```
POST /create_user
Body (JSON):
  - admin_password: admin password
  - username: new username
  - password: new password

Response:
  {
    "success": true,
    "data": {
      "message": "User created successfully",
      "username": "newuser",
      "token": "new-token"
    }
  }
```

## File Naming

Images are saved as: `{userid}_{imageid}.{format}`
- Example: `1_7.jpg` (user 1, image 7)

Access images by name only: `/image/1_7` (no extension needed!)

## Tech Stack

- **Express.js** - Web server
- **Multer** - File upload handling
- **Sharp** - Image processing and format conversion
- **SQLite** - User and token database (via database.js)

## License

See LICENSE file for details.
