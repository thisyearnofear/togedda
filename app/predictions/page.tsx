import { Metadata } from "next";
import dynamic from "next/dynamic";

const PredictionMarket = dynamic(
  () => import("@/components/PredictionMarket"),
  {
    ssr: false,
    loading: () => <div>Loading prediction market...</div>,
  }
);

export const metadata: Metadata = {
  title: "Imperfect Form - Prediction Market",
  description: "Prediction market for Imperfect Form fitness goals",
};

export default function PredictionsPage() {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-6">
          <div className="game-container py-4 px-6 mb-4 bg-black">
            <h1
              className="text-2xl mb-2"
              style={{ textShadow: "2px 2px 0px #000" }}
            >
              IMPERFECT FORM
            </h1>
            <p className="text-lg">Prediction Market</p>
          </div>
        </header>

        <PredictionMarket />
      </div>
    </div>
  );
}
