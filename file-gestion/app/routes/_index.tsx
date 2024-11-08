import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const loader: LoaderFunction = async () => {
  return redirect("/desk");
};

export const meta: MetaFunction = () => {
  return [
    { title: "Files" },
    { name: "description", content: "Gestion des fichiers" },
  ];
};

export default function Index() {
  return (
    <div className="flex h-screen items-center justify-center">
      <p>Redirection...</p>
    </div>
  );
}
