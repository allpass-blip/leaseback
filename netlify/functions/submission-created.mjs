import { notifySubmission } from "../lib/chatwork.mjs";

// Netlify's conventional filename receives the signed, verified form event.
// Retain the raw payload: the typed formSubmitted adapter drops form_name.
export default async (request) => {
  const { payload } = await request.json();
  const result = await notifySubmission(payload);
  // Never log customer fields or credentials.
  console.info(`Chatwork notification: ${result.sent ? "sent" : "skipped"}`);
  return new Response(null, { status: 204 });
};
