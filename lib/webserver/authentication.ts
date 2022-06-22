import * as express from "express";

async function expressAuthentication(request: express.Request, securityName: string, scopes?: string[]): Promise<any> {
  if (securityName === "session") {
    if (!process.env.AUTH_TOKEN) return true;

    const token = request.cookies["flare-auth-token"];
    if (!token) {
      throw Error("No token provided");
    }

    return process.env.AUTH_TOKEN === token || process.env.ADMIN_AUTH_TOKEN === token;
  }
}

export { expressAuthentication };
