export type AskQuestionType = "decision" | "fact" | "explore_compare";

export type AskProfile = {
  grade: string;
  college: string;
  focus: string;
  preference: string;
};

export type AskFollowUps = {
  explain: string;
  explore: string;
  compare: string;
};

export type AskEvidenceItem = {
  source: string;
  authority_level: string;
  relation_type: string;
  excerpt: string;
};

export type AskBlock = {
  label: string;
  content: string;
};

export type RelatedOpportunityReason = {
  title: string;
  recommendation_reason: string;
};

export type AskApiRequest = {
  signalId: string;
  question: string;
  profile: AskProfile;
};

export type AskApiResponse = {
  question_type: AskQuestionType;
  headline: string;
  summary_line: string;
  blocks: AskBlock[];
  evidence: AskEvidenceItem[];
  follow_ups: AskFollowUps;
  related_opportunities: RelatedOpportunityReason[];
  source: "model" | "fallback" | "guardrail";
  notice?: string;
};
