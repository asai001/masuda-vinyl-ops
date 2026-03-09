const PRODUCTION_BRANCH = "main";
const PRODUCTION_ENV = "production";

const COMPANY_NAME = {
  full: "増田ビニール株式会社",
  short: "増田ビニール",
} as const;

export const MASKED_COMPANY_NAME = "サンプル株式会社";

const normalize = (value: string | undefined): string => (value ?? "").trim().toLowerCase();

export const shouldMaskCompanyName = (): boolean => {
  const commitRef = normalize(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF);
  if (commitRef) {
    return commitRef !== PRODUCTION_BRANCH;
  }

  const vercelEnv = normalize(process.env.NEXT_PUBLIC_VERCEL_ENV);
  if (vercelEnv) {
    return vercelEnv !== PRODUCTION_ENV;
  }

  // Fail-closed to avoid exposing the real company name when metadata is unavailable.
  return true;
};

type CompanyNameVariant = keyof typeof COMPANY_NAME;

export const getDisplayCompanyName = (variant: CompanyNameVariant): string => {
  return shouldMaskCompanyName() ? MASKED_COMPANY_NAME : COMPANY_NAME[variant];
};
