import { Metadata } from "next";
import { createMiniAppMetadata, MINIAPP_EMBEDS } from "@/lib/miniapp/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Admin Panel - Imperfect Form",
    description: "Administrative controls for Imperfect Form",
    openGraph: {
      title: "Admin Panel - Imperfect Form",
      description: "Administrative controls for fitness tracking",
    },
    other: createMiniAppMetadata({
      title: "Admin Panel",
      name: "Imperfect Form - Admin",
      url: `${process.env.NEXT_PUBLIC_URL}/admin`,
    }),
  };
}

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

        <div className="game-container p-6 text-center">
          <h2 className="text-xl mb-4">Admin Panel Deprecated</h2>
          <p className="mb-4">
            The admin panel for the old prediction market contracts has been
            deprecated.
          </p>
          <p className="mb-4">
            The new V2 prediction market contract is now deployed at:
          </p>
          <p className="text-yellow-400 mb-6 break-all">
            0x4d6b336F174f17daAf63D233E1E05cB105562304
          </p>
          <p>Please use the contract directly for administrative functions.</p>
        </div>
      </div>
    </div>
  );
}
