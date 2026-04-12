import { Participation, Project } from "@/lib/types";

export function buildStudentProjectCatalogData(input: {
  publishedProjects: Project[];
  completedProjects: Project[];
  participations: Participation[];
}) {
  const projects = [...input.publishedProjects, ...input.completedProjects].filter(
    (project, index, collection) =>
      index === collection.findIndex((candidate) => candidate.id === project.id),
  );

  return {
    projects,
    participations: input.participations,
    userParticipationProjectIds: input.participations.map((participation) => participation.projectId),
  };
}
