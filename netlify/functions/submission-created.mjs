import { processSubmission } from "../lib/process-submission.mjs";

// Netlify's conventional filename receives the signed, verified form event.
// Retain the raw payload: the typed formSubmitted adapter drops form_name.
export default async (request) => {
  const { payload } = await request.json();
  await processSubmission(payload);
  return new Response(null, { status: 204 });
};
