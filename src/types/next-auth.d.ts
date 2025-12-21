import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      isSuperadmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    username: string;
    isSuperadmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    isSuperadmin: boolean;
  }
}
