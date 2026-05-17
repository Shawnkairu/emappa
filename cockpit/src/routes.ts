export const cockpitRoutes = {
  command: "/",
  stress: "/stress",
  building: (projectId: string) => `/buildings/${encodeURIComponent(projectId)}`,
};
