# Utilise une image Node.js comme base
FROM node:18

# Crée le dossier de travail
WORKDIR /app

# Installe S3rver
RUN npm install -g s3rver

# Crée un dossier pour les fichiers S3
RUN mkdir /app/s3-buckets

# Expose le port de S3rver
EXPOSE 4568

# Commande pour lancer S3rver
CMD ["s3rver", "--hostname", "0.0.0.0", "--port", "4568", "--directory", "/app/s3-buckets"]
