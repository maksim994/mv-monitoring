import { NextResponse } from "next/server";
import type { projects } from "@/db/schema";

export type ProjectRow = typeof projects.$inferSelect;

export function domainBlocksPageOperations(project: {
  domain: string | null;
  domainVerifiedAt: Date | null;
}): boolean {
  return Boolean(project.domain && !project.domainVerifiedAt);
}

export function domainVerificationRequiredResponse() {
  return NextResponse.json(
    {
      error: "DOMAIN_NOT_VERIFIED",
      message: "Подтвердите владение доменом перед добавлением страниц.",
    },
    { status: 403 }
  );
}

/** Hide verification token once verified. */
export function serializeProjectForClient(project: ProjectRow) {
  if (project.domainVerifiedAt) {
    const { domainVerificationToken: _t, ...withoutToken } = project;
    return {
      ...withoutToken,
      domainVerificationToken: null as string | null,
    };
  }
  return { ...project };
}
