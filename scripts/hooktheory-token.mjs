/**
 * One-off: exchange a Hooktheory username and password for the API token.
 *
 *   node scripts-hooktheory-token.mjs you@example.com yourpassword
 *
 * Put the token in .env.local as HOOKTHEORY_TOKEN. The password is not stored
 * anywhere: only the token it returns is, and that is what the API wants.
 */
const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.error("usage: node scripts-hooktheory-token.mjs <username> <password>");
  process.exit(1);
}
const response = await fetch("https://api.hooktheory.com/v1/users/auth", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ username, password }),
});
if (!response.ok) {
  console.error(`Hooktheory said ${response.status}. Check the username and password.`);
  process.exit(1);
}
const body = await response.json();
if (!body.activkey) {
  console.error("No token in the response:", JSON.stringify(body).slice(0, 200));
  process.exit(1);
}
console.log(`\nHOOKTHEORY_TOKEN=${body.activkey}\n`);
console.log("Add that line to .env.local, and to Vercel if you want it in production.");
