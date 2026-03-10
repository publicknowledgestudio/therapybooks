import { google } from "googleapis";

/**
 * Exchange a Google refresh token for a fresh access token.
 */
export async function getAccessTokenFromRefresh(
  refreshToken: string,
): Promise<string | null> {
  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    oauth2.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2.refreshAccessToken();
    return credentials.access_token ?? null;
  } catch {
    return null;
  }
}
