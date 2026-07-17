import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  return Response.json({
    user,
    signInPath: "/signin-with-chatgpt?return_to=%2F",
    signOutPath: "/signout-with-chatgpt?return_to=%2F",
  });
}
