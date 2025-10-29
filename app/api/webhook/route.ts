import { sendFrameNotification } from "@/lib/notification-client";
import {
  deleteUserNotificationDetails,
  setUserNotificationDetails,
} from "@/lib/notifications";
import { createPublicClient, http } from "viem";
import { optimism } from "viem/chains";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = "force-dynamic";

// Mini App webhook event types
interface MiniAppWebhookEvent {
  type:
    | "miniapp_added"
    | "miniapp_removed"
    | "notifications_enabled"
    | "notifications_disabled";
  data: {
    fid: number;
    notificationDetails?: {
      token: string;
      url: string;
    };
    [key: string]: any;
  };
}

const KEY_REGISTRY_ADDRESS = "0x00000000Fc1237824fb747aBDE0FF18990E59b7e";

const KEY_REGISTRY_ABI = [
  {
    inputs: [
      { name: "fid", type: "uint256" },
      { name: "key", type: "bytes" },
    ],
    name: "keyDataOf",
    outputs: [
      {
        components: [
          { name: "state", type: "uint8" },
          { name: "keyType", type: "uint32" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function verifyFidOwnership(fid: number, appKey: `0x${string}`) {
  const client = createPublicClient({
    chain: optimism,
    transport: http(),
  });

  try {
    const result = await client.readContract({
      address: KEY_REGISTRY_ADDRESS,
      abi: KEY_REGISTRY_ABI,
      functionName: "keyDataOf",
      args: [BigInt(fid), appKey],
    });

    return result.state === 1 && result.keyType === 1;
  } catch (error) {
    console.error("Key Registry verification failed:", error);
    return false;
  }
}

function decode(encoded: string) {
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
}

export async function POST(request: Request) {
  const requestJson = await request.json();

  const { header: encodedHeader, payload: encodedPayload } = requestJson;

  const headerData = decode(encodedHeader);
  const event = decode(encodedPayload);

  const { fid, key } = headerData;

  const valid = await verifyFidOwnership(fid, key);

  if (!valid) {
    return Response.json(
      { success: false, error: "Invalid FID ownership" },
      { status: 401 },
    );
  }

  // Handle both legacy frame events and new miniapp events
  const eventType = event.event || event.type;

  switch (eventType) {
    case "frame_added":
    case "miniapp_added":
      console.log(
        `${eventType}`,
        "event.notificationDetails",
        event.notificationDetails,
      );
      if (event.notificationDetails) {
        await setUserNotificationDetails(fid, event.notificationDetails);
        await sendFrameNotification({
          fid,
          title: `Welcome to Imperfect Form`,
          body: `Track your fitness goals across blockchain networks!`,
        });
      } else {
        console.log("no notification details found");
      }

      break;
    case "frame_removed":
    case "miniapp_removed": {
      console.log(`${eventType}`);
      await deleteUserNotificationDetails(fid);
      break;
    }
    case "notifications_enabled": {
      console.log("notifications_enabled", event.notificationDetails);
      await setUserNotificationDetails(fid, event.notificationDetails);
      await sendFrameNotification({
        fid,
        title: `Notifications Enabled for Imperfect Form`,
        body: `You'll receive updates about your fitness goals and prediction market activity!`,
      });

      break;
    }
    case "notifications_disabled": {
      console.log("notifications_disabled");
      await deleteUserNotificationDetails(fid);
      break;
    }
    default:
      console.log("unhandled event", eventType, event);
      break;
  }

  return Response.json({ success: true });
}
