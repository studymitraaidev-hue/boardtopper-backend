export {};

declare global {
  namespace Express {
    interface Request {
      // Populated by the authenticate middleware from the verified JWT payload.
      // Contains ONLY what is encoded in the token — do not add fields that
      // are not in the token (language, weakSubjects, etc.) as they are never
      // set here and will always be undefined, causing silent runtime bugs.
      user?: {
        id: string;
        email: string;
        plan: 'free' | 'pro';
      };
      // Attached by the request_id middleware for log correlation.
      requestId?: string;
    }
  }
}
