import { fetchUser } from "@/lib/neynar";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params;

    // Fetch user data from Neynar
    const user = await fetchUser(fid);

    // In a real implementation, you would fetch the user's stats from your database
    // For now, we'll use mock data
    const mockStats = {
      totalPushups: 1250,
      totalSquats: 980,
      rank: 42,
      predictions: {
        correct: 3,
        total: 5,
      },
    };

    // Load the Press Start 2P font
    const fontData = await fetch(
      new URL(
        "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap",
        import.meta.url
      )
    ).then((res) => res.arrayBuffer());

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "black",
            color: "white",
            padding: "40px 20px",
            fontFamily: '"Press Start 2P", monospace',
            border: "8px solid white",
            boxShadow: "0 0 20px rgba(255, 255, 255, 0.5)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            {/* User avatar */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.pfp_url}
              alt={user.display_name}
              width={80}
              height={80}
              style={{
                borderRadius: "50%",
                border: "4px solid white",
                marginRight: "20px",
              }}
            />
            <div>
              <h1
                style={{
                  fontSize: "24px",
                  margin: "0 0 10px 0",
                  textShadow: "2px 2px 0px #000",
                }}
              >
                {user.display_name}
              </h1>
              <p
                style={{
                  fontSize: "16px",
                  margin: 0,
                  color: "#aaa",
                }}
              >
                @{user.username}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "space-around",
              marginBottom: "30px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "36px",
                  color: "#ff69b4",
                  marginBottom: "10px",
                }}
              >
                {mockStats.totalPushups}
              </span>
              <span style={{ fontSize: "14px" }}>Push-ups</span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "36px",
                  color: "#00a651",
                  marginBottom: "10px",
                }}
              >
                {mockStats.totalSquats}
              </span>
              <span style={{ fontSize: "14px" }}>Squats</span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "36px",
                  color: "#fcb131",
                  marginBottom: "10px",
                }}
              >
                {mockStats.rank}
              </span>
              <span style={{ fontSize: "14px" }}>Rank</span>
            </div>
          </div>

          <div
            style={{
              fontSize: "18px",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            Prediction Accuracy: {mockStats.predictions.correct}/
            {mockStats.predictions.total}
          </div>

          <div
            style={{
              position: "absolute",
              bottom: "20px",
              fontSize: "14px",
              color: "#aaa",
            }}
          >
            imperfectform.fun
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Press Start 2P",
            data: fontData,
            style: "normal",
          },
        ],
      }
    );
  } catch (error) {
    console.error("Error generating image:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
