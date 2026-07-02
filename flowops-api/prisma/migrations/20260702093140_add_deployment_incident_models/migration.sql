-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'deployment',
    "sha" TEXT NOT NULL,
    "ref" TEXT,
    "workflowRunId" TEXT,
    "workflowName" TEXT,
    "deployedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repositoryId" TEXT NOT NULL,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "repositoryId" TEXT,
    "deploymentId" TEXT,
    "reportedById" TEXT,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deployment_repositoryId_deployedAt_idx" ON "Deployment"("repositoryId", "deployedAt");

-- CreateIndex
CREATE INDEX "Deployment_environment_status_deployedAt_idx" ON "Deployment"("environment", "status", "deployedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_repositoryId_workflowRunId_key" ON "Deployment"("repositoryId", "workflowRunId");

-- CreateIndex
CREATE INDEX "Incident_organizationId_detectedAt_idx" ON "Incident"("organizationId", "detectedAt");

-- CreateIndex
CREATE INDEX "Incident_repositoryId_detectedAt_idx" ON "Incident"("repositoryId", "detectedAt");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Commit_repositoryId_committedAt_idx" ON "Commit"("repositoryId", "committedAt");

-- CreateIndex
CREATE INDEX "Commit_committedAt_idx" ON "Commit"("committedAt");

-- CreateIndex
CREATE INDEX "Commit_author_idx" ON "Commit"("author");

-- CreateIndex
CREATE INDEX "PullRequest_repositoryId_openedAt_idx" ON "PullRequest"("repositoryId", "openedAt");

-- CreateIndex
CREATE INDEX "PullRequest_closedAt_idx" ON "PullRequest"("closedAt");

-- CreateIndex
CREATE INDEX "PullRequest_state_idx" ON "PullRequest"("state");

-- CreateIndex
CREATE INDEX "PullRequestReview_pullRequestId_reviewedAt_idx" ON "PullRequestReview"("pullRequestId", "reviewedAt");

-- CreateIndex
CREATE INDEX "PullRequestReview_reviewedAt_idx" ON "PullRequestReview"("reviewedAt");

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
