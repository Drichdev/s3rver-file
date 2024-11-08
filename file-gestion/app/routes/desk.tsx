import { useState } from "react";
import { json, ActionFunction } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as XLSX from "xlsx";

// Configuration du client S3
const s3 = new S3Client({
  endpoint: "http://localhost:4569",
  //   endpoint: "http://host.docker.internal:4568", // Si la configuration est docker
  forcePathStyle: true,
  region: "us-east-1",
  credentials: {
    accessKeyId: "S3RVER",
    secretAccessKey: "S3RVER",
  },
});

const sanitizeString = (str: string) => {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;

  if (!file || !name || !email || !phone) {
    return json(
      { error: "Tous les champs sont obligatoires" },
      { status: 400 }
    );
  }

  const params = {
    Bucket: "my-bucket",
    Key: file.name,
    // Body: file.stream(),
    Body: await file.arrayBuffer(),
  };

  try {
    await s3.send(new PutObjectCommand(params));

    let fileData = [];
    let headers = [];

    if (file.type === "application/json") {
      const content = await file.text();
      fileData = JSON.parse(content);
    } else if (file.name.endsWith(".xlsx")) {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      fileData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      // Extraire les entêtes du fichier Excel
      headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
    } else {
      return json(
        { error: "Format de fichier non pris en charge" },
        { status: 400 }
      );
    }

    // Correspondre les entêtes des colonnes avec les champs de l'utilisateur
    const matchedHeaders = {
      nameColumn: headers.find(
        (header) => sanitizeString(header) === sanitizeString(name)
      ),
      emailColumn: headers.find(
        (header) => sanitizeString(header) === sanitizeString(email)
      ),
      phoneColumn: headers.find(
        (header) => sanitizeString(header) === sanitizeString(phone)
      ),
    };

    // Si une des colonnes correspondantes n'a pas été trouvée
    if (
      !matchedHeaders.nameColumn ||
      !matchedHeaders.emailColumn ||
      !matchedHeaders.phoneColumn
    ) {
      return json(
        {
          error:
            "Aucune correspondance pour les entêtes de colonnes dans le fichier.",
        },
        { status: 400 }
      );
    }

    // Extraire les valeurs de chaque ligne selon les colonnes correspondantes
    const results = fileData.map((row: any) => ({
      name: row[matchedHeaders.nameColumn] || "N/A",
      email: row[matchedHeaders.emailColumn] || "N/A",
      phone: row[matchedHeaders.phoneColumn] || "N/A",
    }));

    return json({ name, email, phone, results });
  } catch (error) {
    console.error("Erreur d'upload sur S3rver:", error);
    return json(
      { error: "Erreur lors de l'upload du fichier" },
      { status: 500 }
    );
  }
};

export default function Index() {
  const [isModalOpen, setModalOpen] = useState(false);
  const actionData = useActionData();

  return (
    <div className="flex flex-col h-screen items-center justify-center">
      <button
        onClick={() => setModalOpen(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg"
      >
        Ouvrir le modal
      </button>

      {/* Modal d'upload de fichier */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 w-1/3">
            <h2 className="text-xl font-semibold mb-4">Upload Fichier</h2>
            <form method="post" encType="multipart/form-data">
              <input
                type="file"
                name="file"
                accept=".json, .xlsx"
                className="mb-4"
                required
              />
              <input
                type="text"
                name="name"
                placeholder="Nom (entête colonne)"
                required
                className="block w-full p-2 border rounded mb-4"
              />
              <input
                type="text"
                name="email"
                placeholder="Email (entête colonne)"
                required
                className="block w-full p-2 border rounded mb-4"
              />
              <input
                type="tel"
                name="phone"
                placeholder="Numéro de téléphone (entête colonne)"
                required
                className="block w-full p-2 border rounded mb-4"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded-lg"
              >
                Soumettre
              </button>
            </form>
            <button
              onClick={() => setModalOpen(false)}
              className="mt-4 text-red-500"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Table des données du fichier */}
      {actionData?.results && (
        <table className="mt-8 w-2/3 text-center border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border">Nom</th>
              <th className="py-2 px-4 border">Email</th>
              <th className="py-2 px-4 border">Numéro de téléphone</th>
            </tr>
          </thead>
          <tbody>
            {actionData.results.map((item: any, index: number) => (
              <tr key={index} className="border-t">
                <td className="py-2 px-4 border">{item.name}</td>
                <td className="py-2 px-4 border">{item.email}</td>
                <td className="py-2 px-4 border">{item.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Messages d'erreur ou de succès */}
      {actionData?.error && (
        <p className="text-red-500 mt-4">{actionData.error}</p>
      )}
    </div>
  );
}
