const express = require('express');
const multer = require('multer');
const AWS = require('@aws-sdk/client-s3');
const S3rver = require('s3rver');
const path = require('path');

const server = new S3rver({
  port: 4569,
  hostname: 'localhost',
  silent: false,
  directory: path.join(__dirname, 'data'),
  configureBuckets: [{
    name: 'my-bucket'
  }]
});

server.run()
  .then(() => console.log('S3rver démarré avec succès'))
  .catch(error => console.error('Échec du démarrage de S3rver:', error));

const app = express();
const upload = multer({ dest: 'uploads/' });

const s3Client = new AWS.S3({
  endpoint: 'http://localhost:4569',
  region: 'us-east-1',
  s3ForcePathStyle: true,
  credentials: {
    accessKeyId: 'S3RVER',
    secretAccessKey: 'S3RVER'
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const fileContent = require('fs').readFileSync(req.file.path);

    await s3Client.putObject({
      Bucket: 'my-bucket',
      Key: req.file.originalname,
      Body: fileContent,
    });

    require('fs').unlinkSync(req.file.path);

    res.status(200).json({ message: 'Fichier uploadé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'upload', error });
  }
});

app.listen(3000, () => console.log('Serveur Node.js port 3000'));
