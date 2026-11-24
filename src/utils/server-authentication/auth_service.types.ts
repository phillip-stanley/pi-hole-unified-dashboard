export interface session {
  sid: string;
  csrf: string;
  expiresAt: Date;
}

export interface pihole_response {
  session: {
    valid: boolean;
    totp: boolean;
    sid: string;
    csrf: string;
    validity: number;
    message: string;
  };
  took: number;
}
