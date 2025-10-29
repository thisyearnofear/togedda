import { getUserNotificationDetails } from "@/lib/notifications";
import { env } from "./env";

// Types for Mini App notifications (adapted from frame SDK types)
interface NotificationDetails {
  token: string;
  url: string;
}

interface SendNotificationRequest {
  notificationId: string;
  title: string;
  body: string;
  targetUrl: string;
  tokens: string[];
}

interface SendNotificationResponse {
  result: {
    successfulTokens: string[];
    rateLimitedTokens: string[];
    invalidTokens: string[];
  };
}

const appUrl = env.NEXT_PUBLIC_URL || "";

type SendMiniAppNotificationResult =
  | {
      state: "error";
      error: unknown;
    }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "success" };

export async function sendFrameNotification({
  fid,
  title,
  body,
  notificationDetails,
}: {
  fid: number;
  title: string;
  body: string;
  notificationDetails?: NotificationDetails | null;
}): Promise<SendMiniAppNotificationResult> {
  if (!notificationDetails) {
    notificationDetails = await getUserNotificationDetails(fid);
  }
  if (!notificationDetails) {
    return { state: "no_token" };
  }

  const response = await fetch(notificationDetails.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notificationId: crypto.randomUUID(),
      title,
      body,
      targetUrl: appUrl,
      tokens: [notificationDetails.token],
    } satisfies SendNotificationRequest),
  });

  const responseJson = await response.json();

  if (response.status === 200) {
    try {
      const responseBody = responseJson as SendNotificationResponse;

      if (responseBody.result?.rateLimitedTokens?.length > 0) {
        return { state: "rate_limit" };
      }

      return { state: "success" };
    } catch (error) {
      return { state: "error", error: error };
    }
  }

  return { state: "error", error: responseJson };
}
