import { createGoogleClient } from "./google";

export interface GoogleContact {
  name: string;
  email: string | null;
  phone: string | null;
}

export async function listContacts(
  accessToken: string,
): Promise<GoogleContact[]> {
  const { people } = createGoogleClient(accessToken);

  const contacts: GoogleContact[] = [];
  let pageToken: string | undefined;

  do {
    const res = await people.people.connections.list({
      resourceName: "people/me",
      pageSize: 200,
      personFields: "names,emailAddresses,phoneNumbers",
      pageToken,
    });

    for (const person of res.data.connections ?? []) {
      const name = person.names?.[0]?.displayName;
      if (!name) continue;

      contacts.push({
        name,
        email: person.emailAddresses?.[0]?.value ?? null,
        phone: person.phoneNumbers?.[0]?.value ?? null,
      });
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return contacts;
}
