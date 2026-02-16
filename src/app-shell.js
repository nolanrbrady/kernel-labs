export function bootstrapAppShell() {
  return {
    route: "/",
    screen: "problem-workspace",
    requiresAuth: false,
    primaryActions: ["run", "submit"]
  };
}
