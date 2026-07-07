const fs = require('fs');
const path = require('path');

const config = {
  "buildCommand": "npm run build && cp landing.html dist/landing.html",
  "outputDirectory": "dist",
  "framework": null,
  "routes": [
    {
      "src": "/landing.html",
      "dest": "/landing.html"
    },
    {
      "src": "/index.html",
      "dest": "/index.html"
    },
    {
      "src": "/sw.js",
      "dest": "/sw.js"
    },
    {
      "src": "/site.webmanifest",
      "dest": "/site.webmanifest"
    },
    {
      "src": "/sitemap.xml",
      "dest": "/sitemap.xml"
    },
    {
      "src": "/robots.txt",
      "dest": "/robots.txt"
    },
    {
      "src": "/icon-192.png",
      "dest": "/icon-192.png"
    },
    {
      "src": "/icon-512.png",
      "dest": "/icon-512.png"
    },
    {
      "src": "^/$",
      "dest": "/landing.html"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
};

const targetPath = path.join(__dirname, '..', 'vercel.json');
fs.writeFileSync(targetPath, JSON.stringify(config, null, 2), 'utf8');
console.log('Successfully generated vercel.json configuration!');
