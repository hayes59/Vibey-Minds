export type Profile = {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  role: "member" | "chatter";
  is_online: boolean;
  rate_per_message: number | null; // cents, only used for role = 'chatter'
  created_at: string;
};

export type Match = {
  id: string;
  user_a: string;
  user_b: string;
  status: "pending" | "active" | "ended";
  created_at: string;
};

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type CreditBalance = {
  user_id: string;
  balance: number;
  updated_at: string;
};

export type CreditTransaction = {
  id: string;
  user_id: string;
  amount: number;
  kind: "crypto_deposit" | "message_spend" | "chatter_earning" | "adjustment";
  provider: string | null;
  provider_ref: string | null;
  status: "pending" | "completed" | "failed";
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      matches: {
        Row: Match;
        Insert: Partial<Match> & { user_a: string; user_b: string };
        Update: Partial<Match>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Partial<Message> & {
          match_id: string;
          sender_id: string;
          body: string;
        };
        Update: Partial<Message>;
        Relationships: [];
      };
      credit_balances: {
        Row: CreditBalance;
        Insert: Partial<CreditBalance> & { user_id: string };
        Update: Partial<CreditBalance>;
        Relationships: [];
      };
      credit_transactions: {
        Row: CreditTransaction;
        Insert: Partial<CreditTransaction> & {
          user_id: string;
          amount: number;
          kind: CreditTransaction["kind"];
        };
        Update: Partial<CreditTransaction>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      apply_credit_transaction: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_kind: string;
          p_provider?: string | null;
          p_provider_ref?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
