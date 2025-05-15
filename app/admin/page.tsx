import { Metadata } from "next";
import dynamic from "next/dynamic";

const PredictionMarketAdmin = dynamic(
  () => import("@/components/PredictionMarketAdmin"),
  {
    ssr: false,
    loading: () => <div>Loading admin panel...</div>,
  }
);

export const metadata: Metadata = {
  title: "Imperfect Form Admin",
  description: "Admin panel for Imperfect Form",
};

export default function AdminPage() {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-6">
          <div className="game-container py-4 px-6 mb-4 bg-black">
            <h1
              className="text-2xl mb-2"
              style={{ textShadow: "2px 2px 0px #000" }}
            >
              IMPERFECT FORM ADMIN
            </h1>
          </div>
        </header>

        <PredictionMarketAdmin />
      </div>
    </div>
  );
}
